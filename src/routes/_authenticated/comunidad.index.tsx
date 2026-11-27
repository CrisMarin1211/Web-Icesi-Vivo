
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Heart,
  MessageCircle,
  Plus,
  Search,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, MediaImage, uploadMedia } from "@/lib/media";
import { useMe } from "@/lib/data";
import { formatDate } from "@/lib/challenges";

export const Route = createFileRoute("/_authenticated/comunidad/")({
  head: () => ({
    meta: [
      { title: "Comunidad — ICESI VIVO" },
      {
        name: "description",
        content: "Foros y conversaciones de la comunidad Icesi.",
      },
    ],
  }),
  component: Comunidad,
});

export const CATEGORIES = [
  { key: "sabias", label: "¿Sabías que...?" },
  { key: "preguntas", label: "Preguntas sobre fauna" },
  { key: "historias", label: "Historias del campus" },
  { key: "cuidar", label: "Aprendamos a cuidar" },
  { key: "comunidad", label: "Conversaciones" },
] as const;

function Comunidad() {
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Comunidad</h1>
      <Forums />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- Forums ---------------- */

function Forums() {
  const { data: me } = useMe();
  const qc = useQueryClient();

  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: posts } = useQuery({
    queryKey: ["forum", cat, search],
    queryFn: async () => {
      let q = supabase
        .from("forum_posts")
        .select(
          "*, profiles(display_name, avatar_url), forum_likes(user_id), forum_comments(id)"
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (cat !== "all") {
        q = q.eq("category", cat);
      }

      if (search.trim()) {
        const term = search.trim().replace(/[%,()]/g, "");
        q = q.or(
          `title.ilike.%${term}%,body.ilike.%${term}%`
        );
      }

      return (await q).data ?? [];
    },
  });

  const list = [...(posts ?? [])].sort((a, b) =>
    sort === "top"
      ? (b.forum_likes?.length ?? 0) -
        (a.forum_likes?.length ?? 0)
      : 0
  );

  async function toggleLike(id: string, liked: boolean) {
    if (!me) return;

    if (liked) {
      await supabase
        .from("forum_likes")
        .delete()
        .eq("post_id", id)
        .eq("user_id", me.user.id);
    } else {
      await supabase.from("forum_likes").insert({
        post_id: id,
        user_id: me.user.id,
      });
    }

    qc.invalidateQueries({ queryKey: ["forum"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-4xl bg-violet p-6 text-violet-foreground md:flex-row md:items-center">
        <div className="flex-1">
          <h2 className="text-2xl font-extrabold">
            Conversemos sobre nuestra fauna
          </h2>
          <p className="text-sm opacity-90">
            Comparte datos, dudas e historias del campus.
          </p>
        </div>

        <Button
          variant="lime"
          size="lg"
          onClick={() => setOpen(true)}
        >
          <Plus />
          Nueva publicación
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar temas"
          className="h-11 rounded-full bg-card pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>
          Todas
        </Chip>

        {CATEGORIES.map((c) => (
          <Chip
            key={c.key}
            active={cat === c.key}
            onClick={() => setCat(c.key)}
          >
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="flex gap-2 text-sm">
        <button
          onClick={() => setSort("recent")}
          className={
            sort === "recent"
              ? "font-bold text-primary"
              : "text-muted-foreground"
          }
        >
          Recientes
        </button>

        <span className="text-muted-foreground">·</span>

        <button
          onClick={() => setSort("top")}
          className={
            sort === "top"
              ? "font-bold text-primary"
              : "text-muted-foreground"
          }
        >
          Destacadas
        </button>
      </div>

      {list.length === 0 && (
        <p className="rounded-3xl bg-card p-8 text-center text-muted-foreground">
          No hay publicaciones todavía. ¡Inicia la conversación!
        </p>
      )}

      <div className="space-y-3">
        {list.map((p) => {
          const liked = !!p.forum_likes?.some(
            (l) => l.user_id === me?.user.id
          );

          return (
            <article
              key={p.id}
              className="rounded-4xl bg-card p-5 shadow-card"
            >
              <div className="flex items-center gap-2">
                <Avatar
                  path={p.profiles?.avatar_url}
                  name={p.profiles?.display_name}
                  className="h-9 w-9 text-xs"
                />

                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {p.profiles?.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.created_at)}
                  </p>
                </div>

                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {
                    CATEGORIES.find((c) => c.key === p.category)
                      ?.label
                  }
                </span>
              </div>

              <Link
                to="/comunidad/foro/$id"
                params={{ id: p.id }}
                className="mt-3 block"
              >
                <h3 className="text-lg font-bold">{p.title}</h3>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {p.body}
                </p>

                {p.image_url && (
                  <MediaImage
                    path={p.image_url}
                    alt={p.title}
                    className="mt-3 max-h-72 w-full rounded-3xl object-cover"
                  />
                )}
              </Link>

              <div className="mt-3 flex gap-4 text-sm">
                <button
                  onClick={() => toggleLike(p.id, liked)}
                  className={`flex items-center gap-1 font-semibold ${
                    liked ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      liked ? "fill-current" : ""
                    }`}
                  />
                  {p.forum_likes?.length ?? 0}
                </button>

                <Link
                  to="/comunidad/foro/$id"
                  params={{ id: p.id }}
                  className="flex items-center gap-1 text-muted-foreground"
                >
                  <MessageCircle className="h-4 w-4" />
                  {p.forum_comments?.length ?? 0}
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <NewPost open={open} onOpenChange={setOpen} />
    </div>
  );
}

function NewPost({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: me } = useMe();
  const qc = useQueryClient();

  const [category, setCategory] = useState<string>("sabias");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!me) return;

    setBusy(true);

    try {
      const image_url = file
        ? await uploadMedia(file, "forum")
        : null;

      const { error } = await supabase.from("forum_posts").insert({
        user_id: me.user.id,
        category,
        title,
        body,
        image_url,
      });

      if (error) throw error;

      toast.success("Publicación creada");

      setTitle("");
      setBody("");
      setFile(null);

      onOpenChange(false);

      qc.invalidateQueries({ queryKey: ["forum"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-4xl">
        <DialogHeader>
          <DialogTitle>Nueva publicación</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  category === c.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <Input
            required
            minLength={3}
            maxLength={160}
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-2xl"
          />

          <Textarea
            required
            maxLength={5000}
            rows={5}
            placeholder="Cuéntanos…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="rounded-2xl"
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />

          <Button
            type="submit"
            variant="lime"
            size="lg"
            className="w-full"
            disabled={busy}
          >
            {busy ? "Publicando…" : "Publicar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
