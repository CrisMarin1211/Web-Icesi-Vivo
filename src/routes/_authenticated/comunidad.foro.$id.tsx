import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Flag, Heart, Reply } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, MediaImage } from "@/lib/media";
import { useMe } from "@/lib/data";
import { formatDate } from "@/lib/challenges";

export const Route = createFileRoute("/_authenticated/comunidad/foro/$id")({
  head: () => ({ meta: [{ title: "Conversación — ICESI VIVO" }, { name: "description", content: "Conversación de la comunidad ICESI VIVO." }] }),
  component: PostPage,
});

function PostPage() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data: post } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => (await supabase.from("forum_posts").select("*, profiles(display_name, avatar_url), forum_likes(user_id)").eq("id", id).maybeSingle()).data,
  });
  const { data: comments } = useQuery({
    queryKey: ["post-comments", id],
    queryFn: async () => (await supabase.from("forum_comments").select("*, profiles(display_name, avatar_url)").eq("post_id", id).order("created_at")).data ?? [],
  });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !body.trim()) return;
    const { error } = await supabase.from("forum_comments").insert({ post_id: id, user_id: me.user.id, body: body.trim(), parent_id: replyTo });
    if (error) { toast.error("No se pudo comentar"); return; }
    setBody(""); setReplyTo(null);
    qc.invalidateQueries({ queryKey: ["post-comments", id] });
  }
  async function report(type: "post" | "comment", target: string) {
    if (!me) return;
    await supabase.from("reports").insert({ user_id: me.user.id, target_type: type, target_id: target, reason: "Contenido inapropiado" });
    toast.success("Reporte enviado. Gracias por cuidar la comunidad.");
  }
  async function like() {
    if (!me || !post) return;
    const liked = post.forum_likes?.some((l) => l.user_id === me.user.id);
    if (liked) await supabase.from("forum_likes").delete().eq("post_id", id).eq("user_id", me.user.id);
    else await supabase.from("forum_likes").insert({ post_id: id, user_id: me.user.id });
    qc.invalidateQueries({ queryKey: ["post", id] });
  }

  if (post === undefined) return <div className="h-64 animate-pulse rounded-4xl bg-muted" />;
  if (!post) return <p>Esta publicación no existe.</p>;
  const roots = comments?.filter((c) => !c.parent_id) ?? [];
  const liked = post.forum_likes?.some((l) => l.user_id === me?.user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/comunidad" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Comunidad</Link>
      <article className="rounded-4xl bg-card p-6 shadow-card">
        <div className="flex items-center gap-2">
          <Avatar path={post.profiles?.avatar_url} name={post.profiles?.display_name} />
          <div className="flex-1"><p className="font-semibold">{post.profiles?.display_name}</p><p className="text-xs text-muted-foreground">{formatDate(post.created_at)}</p></div>
          <button onClick={() => report("post", post.id)} aria-label="Reportar" className="text-muted-foreground"><Flag className="h-4 w-4" /></button>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold">{post.title}</h1>
        <p className="mt-2 whitespace-pre-wrap">{post.body}</p>
        {post.image_url && <MediaImage path={post.image_url} alt={post.title} className="mt-4 w-full rounded-3xl" />}
        <button onClick={like} className={`mt-4 flex items-center gap-1 text-sm font-semibold ${liked ? "text-primary" : "text-muted-foreground"}`}><Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {post.forum_likes?.length ?? 0} Me gusta</button>
      </article>

      <section className="space-y-3">
        <h2 className="font-extrabold">Comentarios ({comments?.length ?? 0})</h2>
        {roots.map((c) => (
          <div key={c.id} className="space-y-2">
            <Comment c={c} onReply={() => setReplyTo(c.id)} onReport={() => report("comment", c.id)} />
            <div className="ml-8 space-y-2 border-l-2 border-violet/30 pl-3">
              {comments?.filter((r) => r.parent_id === c.id).map((r) => <Comment key={r.id} c={r} onReport={() => report("comment", r.id)} />)}
            </div>
          </div>
        ))}
      </section>

      <form onSubmit={send} className="sticky bottom-24 space-y-2 rounded-4xl bg-card p-4 shadow-card md:bottom-4">
        {replyTo && <p className="text-xs text-muted-foreground">Respondiendo a un comentario · <button type="button" className="text-primary" onClick={() => setReplyTo(null)}>cancelar</button></p>}
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe tu comentario" rows={2} className="rounded-2xl" />
        <Button type="submit" variant="lime" className="w-full">Comentar</Button>
      </form>
    </div>
  );
}

function Comment({ c, onReply, onReport }: { c: { id: string; body: string; created_at: string; profiles: { display_name: string; avatar_url: string | null } | null }; onReply?: () => void; onReport: () => void }) {
  return (
    <div className="flex gap-2">
      <Avatar path={c.profiles?.avatar_url} name={c.profiles?.display_name} className="h-8 w-8 text-xs" />
      <div className="flex-1 rounded-3xl bg-card px-4 py-3 shadow-card">
        <p className="text-sm"><span className="font-semibold">{c.profiles?.display_name}</span> <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span></p>
        <p className="text-sm">{c.body}</p>
        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
          {onReply && <button onClick={onReply} className="flex items-center gap-1"><Reply className="h-3 w-3" /> Responder</button>}
          <button onClick={onReport} className="flex items-center gap-1"><Flag className="h-3 w-3" /> Reportar</button>
        </div>
      </div>
    </div>
  );
}
