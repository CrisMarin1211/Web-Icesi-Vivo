import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, Heart, MessageCircle, Plus, Search, Star, Flag, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SPECIES, speciesByKey, type SpeciesKey } from "@/lib/species";
import { Avatar, MediaImage, uploadMedia } from "@/lib/media";
import { useMe } from "@/lib/data";
import { formatDate } from "@/lib/challenges";

export const Route = createFileRoute("/_authenticated/comunidad/")({
  head: () => ({ meta: [{ title: "Comunidad — ICESI VIVO" }, { name: "description", content: "Galería de fauna y foros de la comunidad Icesi." }] }),
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
  const [tab, setTab] = useState<"galeria" | "foros">("galeria");
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Comunidad</h1>
      <div className="inline-flex rounded-full bg-card p-1 shadow-card">
        {(["galeria", "foros"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-5 py-2 text-sm font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t === "galeria" ? "Fauna que nos acompaña" : "Conversemos"}
          </button>
        ))}
      </div>
      {tab === "galeria" ? <Gallery /> : <Forums />}
    </div>
  );
}

/* ---------------- Gallery ---------------- */

function Gallery() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<SpeciesKey | "all">("all");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  const { data: photos } = useQuery({
    queryKey: ["photos", filter],
    queryFn: async () => {
      let q = supabase.from("photos").select("*, profiles(display_name, username, avatar_url), photo_likes(user_id), photo_comments(id)").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("species", filter);
      return (await q).data ?? [];
    },
  });

  async function toggleLike(id: string, liked: boolean) {
    if (!me) return;
    if (liked) await supabase.from("photo_likes").delete().eq("photo_id", id).eq("user_id", me.user.id);
    else await supabase.from("photo_likes").insert({ photo_id: id, user_id: me.user.id });
    qc.invalidateQueries({ queryKey: ["photos"] });
  }

  const featured = photos?.filter((p) => p.featured && p.status === "approved") ?? [];
  const mine = photos?.filter((p) => p.status !== "approved") ?? [];
  const approved = photos?.filter((p) => p.status === "approved") ?? [];
  const current = photos?.find((p) => p.id === detail);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-4xl bg-nature p-6 text-nature-foreground md:flex-row md:items-center">
        <div className="flex-1">
          <h2 className="text-2xl font-extrabold">Fauna que nos acompaña</h2>
          <p className="text-sm opacity-90">Comparte lo que observas. Usa zoom y mantén la distancia: nunca persigas, toques ni alimentes a los animales.</p>
        </div>
        <Button variant="lime" size="lg" onClick={() => setOpen(true)}><Camera /> Compartir mi fotografía</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>Todas</Chip>
        {SPECIES.map((s) => <Chip key={s.key} active={filter === s.key} onClick={() => setFilter(s.key)}>{s.name}</Chip>)}
      </div>

      {mine.length > 0 && (
        <div className="rounded-3xl bg-secondary p-4 text-secondary-foreground">
          <p className="text-sm font-semibold"><Clock className="mr-1 inline h-4 w-4" /> Tus fotos en moderación: {mine.filter((p) => p.status === "pending").length} pendientes{mine.some((p) => p.status === "rejected") ? `, ${mine.filter((p) => p.status === "rejected").length} no aprobadas` : ""}</p>
        </div>
      )}

      {featured.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1 font-extrabold"><Star className="h-4 w-4 text-primary" /> Destacadas</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {featured.map((p) => (
              <button key={p.id} onClick={() => setDetail(p.id)} className="relative w-56 shrink-0 overflow-hidden rounded-3xl">
                <MediaImage path={p.image_url} alt={p.title} className="aspect-[4/5] w-full object-cover" />
                <span className="absolute bottom-2 left-2 rounded-full bg-lime px-2 py-0.5 text-xs font-bold text-lime-foreground">{p.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {approved.length === 0 ? (
        <p className="rounded-3xl bg-card p-8 text-center text-muted-foreground">Aún no hay fotografías aprobadas{filter !== "all" ? " para esta especie" : ""}.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {approved.map((p) => {
            const liked = !!p.photo_likes?.some((l) => l.user_id === me?.user.id);
            return (
              <article key={p.id} className="overflow-hidden rounded-4xl bg-card shadow-card">
                <button className="block w-full" onClick={() => setDetail(p.id)}><MediaImage path={p.image_url} alt={p.title} className="aspect-square w-full object-cover" /></button>
                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <Avatar path={p.profiles?.avatar_url} name={p.profiles?.display_name} className="h-8 w-8 text-xs" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.profiles?.display_name}</p><p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p></div>
                    <span className="rounded-full bg-nature px-2 py-0.5 text-xs font-bold text-nature-foreground">{speciesByKey[p.species as SpeciesKey].name}</span>
                  </div>
                  <h3 className="font-bold">{p.title}</h3>
                  {p.description && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                  <div className="flex gap-4 pt-1 text-sm">
                    <button onClick={() => toggleLike(p.id, liked)} className={`flex items-center gap-1 font-semibold ${liked ? "text-primary" : "text-muted-foreground"}`}><Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {p.photo_likes?.length ?? 0}</button>
                    <button onClick={() => setDetail(p.id)} className="flex items-center gap-1 text-muted-foreground"><MessageCircle className="h-4 w-4" /> {p.photo_comments?.length ?? 0}</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <UploadDialog open={open} onOpenChange={setOpen} />
      <Dialog open={!!current} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-4xl">
          {current && <PhotoDetail photo={current} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>{children}</button>;
}

function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [species, setSpecies] = useState<SpeciesKey>("iguana");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !me) { toast.error("Selecciona una fotografía"); return; }
    setBusy(true);
    try {
      const path = await uploadMedia(file, "photos");
      const { error } = await supabase.from("photos").insert({ user_id: me.user.id, species, title, description, image_url: path });
      if (error) throw error;
      toast.success("¡Gracias! Tu foto quedó en moderación.");
      setFile(null); setTitle(""); setDescription(""); setAgree(false);
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["photos"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-4xl">
        <DialogHeader><DialogTitle>Compartir mi fotografía</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-primary/40 bg-secondary p-5 text-center text-sm text-secondary-foreground">
            {file ? <img src={URL.createObjectURL(file)} alt="Vista previa" className="max-h-48 rounded-2xl" /> : <Camera className="h-8 w-8" />}
            {file ? "Cambiar foto" : "Tomar foto o elegir de la galería"}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SPECIES.map((s) => (
              <button type="button" key={s.key} onClick={() => setSpecies(s.key)} className={`rounded-2xl px-3 py-2 text-sm font-semibold ${species === s.key ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{s.name}</button>
            ))}
          </div>
          <Input required maxLength={80} placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-2xl" />
          <Textarea maxLength={500} placeholder="¿Dónde y cómo la observaste?" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-2xl" />
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
            Tomé esta foto a distancia, sin perseguir, tocar ni alimentar al animal.
          </label>
          <Button type="submit" variant="lime" size="lg" className="w-full" disabled={busy}>{busy ? "Subiendo…" : "Enviar a moderación"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PhotoDetail({ photo }: { photo: { id: string; image_url: string; title: string; description: string | null; species: string; profiles: { display_name: string } | null } }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const { data: comments } = useQuery({
    queryKey: ["photo-comments", photo.id],
    queryFn: async () => (await supabase.from("photo_comments").select("*, profiles(display_name, avatar_url)").eq("photo_id", photo.id).order("created_at")).data ?? [],
  });
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !me) return;
    const { error } = await supabase.from("photo_comments").insert({ photo_id: photo.id, user_id: me.user.id, body: body.trim() });
    if (error) { toast.error("No se pudo comentar"); return; }
    setBody("");
    qc.invalidateQueries({ queryKey: ["photo-comments", photo.id] });
    qc.invalidateQueries({ queryKey: ["photos"] });
  }
  async function report() {
    if (!me) return;
    await supabase.from("reports").insert({ user_id: me.user.id, target_type: "photo", target_id: photo.id, reason: "Contenido inapropiado" });
    toast.success("Gracias, el equipo revisará esta foto.");
  }
  return (
    <div className="space-y-3">
      <MediaImage path={photo.image_url} alt={photo.title} className="w-full rounded-3xl" />
      <div className="flex items-start justify-between gap-2">
        <div><h3 className="text-xl font-bold">{photo.title}</h3><p className="text-sm text-muted-foreground">{photo.profiles?.display_name} · {speciesByKey[photo.species as SpeciesKey].name}</p></div>
        <button onClick={report} aria-label="Reportar" className="text-muted-foreground"><Flag className="h-4 w-4" /></button>
      </div>
      {photo.description && <p className="text-sm">{photo.description}</p>}
      <div className="space-y-2">
        {comments?.map((c) => (
          <div key={c.id} className="flex gap-2"><Avatar path={c.profiles?.avatar_url} name={c.profiles?.display_name} className="h-7 w-7 text-[10px]" /><div className="rounded-2xl bg-muted px-3 py-2 text-sm"><span className="font-semibold">{c.profiles?.display_name}</span> {c.body}</div></div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2"><Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe un comentario" className="rounded-full" /><Button type="submit">Enviar</Button></form>
    </div>
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
      let q = supabase.from("forum_posts").select("*, profiles(display_name, avatar_url), forum_likes(user_id), forum_comments(id)").order("created_at", { ascending: false }).limit(100);
      if (cat !== "all") q = q.eq("category", cat);
      if (search.trim()) q = q.or(`title.ilike.%${search.trim().replace(/[%,()]/g, "")}%,body.ilike.%${search.trim().replace(/[%,()]/g, "")}%`);
      return (await q).data ?? [];
    },
  });
  const list = [...(posts ?? [])].sort((a, b) => (sort === "top" ? (b.forum_likes?.length ?? 0) - (a.forum_likes?.length ?? 0) : 0));

  async function toggleLike(id: string, liked: boolean) {
    if (!me) return;
    if (liked) await supabase.from("forum_likes").delete().eq("post_id", id).eq("user_id", me.user.id);
    else await supabase.from("forum_likes").insert({ post_id: id, user_id: me.user.id });
    qc.invalidateQueries({ queryKey: ["forum"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-4xl bg-violet p-6 text-violet-foreground md:flex-row md:items-center">
        <div className="flex-1"><h2 className="text-2xl font-extrabold">Conversemos sobre nuestra fauna</h2><p className="text-sm opacity-90">Comparte datos, dudas e historias del campus.</p></div>
        <Button variant="lime" size="lg" onClick={() => setOpen(true)}><Plus /> Nueva publicación</Button>
      </div>
      <div className="relative"><Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar temas" className="h-11 rounded-full bg-card pl-10" /></div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>Todas</Chip>
        {CATEGORIES.map((c) => <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>{c.label}</Chip>)}
      </div>
      <div className="flex gap-2 text-sm">
        <button onClick={() => setSort("recent")} className={sort === "recent" ? "font-bold text-primary" : "text-muted-foreground"}>Recientes</button>
        <span className="text-muted-foreground">·</span>
        <button onClick={() => setSort("top")} className={sort === "top" ? "font-bold text-primary" : "text-muted-foreground"}>Destacadas</button>
      </div>
      {list.length === 0 && <p className="rounded-3xl bg-card p-8 text-center text-muted-foreground">No hay publicaciones todavía. ¡Inicia la conversación!</p>}
      <div className="space-y-3">
        {list.map((p) => {
          const liked = !!p.forum_likes?.some((l) => l.user_id === me?.user.id);
          return (
            <article key={p.id} className="rounded-4xl bg-card p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Avatar path={p.profiles?.avatar_url} name={p.profiles?.display_name} className="h-9 w-9 text-xs" />
                <div className="flex-1"><p className="text-sm font-semibold">{p.profiles?.display_name}</p><p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p></div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{CATEGORIES.find((c) => c.key === p.category)?.label}</span>
              </div>
              <Link to="/comunidad/foro/$id" params={{ id: p.id }} className="mt-3 block">
                <h3 className="text-lg font-bold">{p.title}</h3>
                <p className="line-clamp-3 text-sm text-muted-foreground">{p.body}</p>
                {p.image_url && <MediaImage path={p.image_url} alt={p.title} className="mt-3 max-h-72 w-full rounded-3xl object-cover" />}
              </Link>
              <div className="mt-3 flex gap-4 text-sm">
                <button onClick={() => toggleLike(p.id, liked)} className={`flex items-center gap-1 font-semibold ${liked ? "text-primary" : "text-muted-foreground"}`}><Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {p.forum_likes?.length ?? 0}</button>
                <Link to="/comunidad/foro/$id" params={{ id: p.id }} className="flex items-center gap-1 text-muted-foreground"><MessageCircle className="h-4 w-4" /> {p.forum_comments?.length ?? 0}</Link>
              </div>
            </article>
          );
        })}
      </div>
      <NewPost open={open} onOpenChange={setOpen} />
    </div>
  );
}

function NewPost({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
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
      const image_url = file ? await uploadMedia(file, "forum") : null;
      const { error } = await supabase.from("forum_posts").insert({ user_id: me.user.id, category, title, body, image_url });
      if (error) throw error;
      toast.success("Publicación creada");
      setTitle(""); setBody(""); setFile(null);
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
        <DialogHeader><DialogTitle>Nueva publicación</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => <button type="button" key={c.key} onClick={() => setCategory(c.key)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${category === c.key ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{c.label}</button>)}
          </div>
          <Input required minLength={3} maxLength={160} placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-2xl" />
          <Textarea required maxLength={5000} rows={5} placeholder="Cuéntanos…" value={body} onChange={(e) => setBody(e.target.value)} className="rounded-2xl" />
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <Button type="submit" variant="lime" size="lg" className="w-full" disabled={busy}>{busy ? "Publicando…" : "Publicar"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
