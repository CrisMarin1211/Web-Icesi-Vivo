
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  Heart,
  MessageCircle,
  Star,
  Flag,
  Clock,
  Images,
  UserRound,
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
import { SPECIES, speciesByKey, type SpeciesKey } from "@/lib/species";
import { Avatar, MediaImage, uploadMedia } from "@/lib/media";
import { useMe } from "@/lib/data";
import { formatDate } from "@/lib/challenges";

export const Route = createFileRoute("/_authenticated/album")({
  head: () => ({
    meta: [
      { title: "Álbum — ICESI VIVO" },
      {
        name: "description",
        content: "Explora las fotografías de la fauna de ICESI.",
      },
    ],
  }),
  component: Album,
});

function Album() {
  const [activeTab, setActiveTab] = useState<"fotos" | "mialbum">("fotos");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Álbum</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Descubre la fauna que habita nuestro campus y guarda tus propios
          encuentros.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Secciones del álbum"
        className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "fotos"}
          onClick={() => setActiveTab("fotos")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
            activeTab === "fotos"
              ? "bg-card text-primary shadow-card"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Images className="h-4 w-4" />
          Fotos
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "mialbum"}
          onClick={() => setActiveTab("mialbum")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
            activeTab === "mialbum"
              ? "bg-card text-primary shadow-card"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserRound className="h-4 w-4" />
          Mi álbum
        </button>
      </div>

      {activeTab === "fotos" ? (
        <div role="tabpanel">
          <PhotosGallery />
        </div>
      ) : (
        <div role="tabpanel">
          <MyAlbum />
        </div>
      )}
    </div>
  );
}

/* ---------------- Fotos comunitarias ---------------- */

function PhotosGallery() {
  const { data: me } = useMe();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<SpeciesKey | "all">("all");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  const { data: photos, isLoading } = useQuery({
    queryKey: ["photos", filter],
    queryFn: async () => {
      let q = supabase
        .from("photos")
        .select(
          "*, profiles(display_name, username, avatar_url), photo_likes(user_id), photo_comments(id)"
        )
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        q = q.eq("species", filter);
      }

      const { data, error } = await q;
      if (error) throw error;

      return data ?? [];
    },
  });

  const { data: myPending } = useQuery({
    queryKey: ["my-photo-status", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("id, status")
        .eq("user_id", me!.user.id)
        .in("status", ["pending", "rejected"]);

      if (error) throw error;
      return data ?? [];
    },
  });

  async function toggleLike(id: string, liked: boolean) {
    if (!me) return;

    if (liked) {
      await supabase
        .from("photo_likes")
        .delete()
        .eq("photo_id", id)
        .eq("user_id", me.user.id);
    } else {
      await supabase.from("photo_likes").insert({
        photo_id: id,
        user_id: me.user.id,
      });
    }

    qc.invalidateQueries({ queryKey: ["photos"] });
  }

  const featured = photos?.filter((p) => p.featured) ?? [];
  const current = photos?.find((p) => p.id === detail);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-4xl bg-nature p-6 text-nature-foreground md:flex-row md:items-center">
        <div className="flex-1">
          <h2 className="text-2xl font-extrabold">Fauna que nos acompaña</h2>
          <p className="text-sm opacity-90">
            Comparte tus encuentros con la fauna del campus. Recuerda mantener
            la distancia y nunca perseguir, tocar ni alimentar a los animales.
          </p>
        </div>

        <Button variant="lime" size="lg" onClick={() => setOpen(true)}>
          <Camera />
          Compartir mi fotografía
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          Todas
        </Chip>

        {SPECIES.map((s) => (
          <Chip
            key={s.key}
            active={filter === s.key}
            onClick={() => setFilter(s.key)}
          >
            {s.name}
          </Chip>
        ))}
      </div>

      {(myPending?.length ?? 0) > 0 && (
        <div className="rounded-3xl bg-secondary p-4 text-secondary-foreground">
          <p className="text-sm font-semibold">
            <Clock className="mr-1 inline h-4 w-4" />
            Tus fotografías en moderación:{" "}
            {myPending?.filter((p) => p.status === "pending").length ?? 0}{" "}
            pendientes
            {(myPending?.filter((p) => p.status === "rejected").length ?? 0) >
              0 &&
              ` · ${myPending?.filter((p) => p.status === "rejected").length} no aprobadas`}
          </p>
        </div>
      )}

      {featured.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1 font-extrabold">
            <Star className="h-4 w-4 text-primary" />
            Destacadas
          </h3>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {featured.map((p) => (
              <button
                key={p.id}
                onClick={() => setDetail(p.id)}
                className="relative w-56 shrink-0 overflow-hidden rounded-3xl"
              >
                <MediaImage
                  path={p.image_url}
                  alt={p.title}
                  className="aspect-[4/5] w-full object-cover"
                />
                <span className="absolute bottom-2 left-2 rounded-full bg-lime px-2 py-0.5 text-xs font-bold text-lime-foreground">
                  {p.title}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="aspect-square animate-pulse rounded-4xl bg-muted"
            />
          ))}
        </div>
      ) : !photos?.length ? (
        <p className="rounded-3xl bg-card p-8 text-center text-muted-foreground">
          Aún no hay fotografías aprobadas
          {filter !== "all" ? " para esta especie" : ""}.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => {
            const liked = !!p.photo_likes?.some(
              (l) => l.user_id === me?.user.id
            );

            return (
              <article
                key={p.id}
                className="overflow-hidden rounded-4xl bg-card shadow-card"
              >
                <button
                  className="block w-full"
                  onClick={() => setDetail(p.id)}
                >
                  <MediaImage
                    path={p.image_url}
                    alt={p.title}
                    className="aspect-square w-full object-cover"
                  />
                </button>

                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <Avatar
                      path={p.profiles?.avatar_url}
                      name={p.profiles?.display_name}
                      className="h-8 w-8 text-xs"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {p.profiles?.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.created_at)}
                      </p>
                    </div>

                    <span className="rounded-full bg-nature px-2 py-0.5 text-xs font-bold text-nature-foreground">
                      {speciesByKey[p.species as SpeciesKey]?.name}
                    </span>
                  </div>

                  <h3 className="font-bold">{p.title}</h3>

                  {p.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  )}

                  <div className="flex gap-4 pt-1 text-sm">
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
                      {p.photo_likes?.length ?? 0}
                    </button>

                    <button
                      onClick={() => setDetail(p.id)}
                      className="flex items-center gap-1 text-muted-foreground"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {p.photo_comments?.length ?? 0}
                    </button>
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

/* ---------------- Mi álbum ---------------- */

function MyAlbum() {
  const { data: me } = useMe();
  const [filter, setFilter] = useState<SpeciesKey | "all">("all");
  const [detail, setDetail] = useState<string | null>(null);

  const { data: photos, isLoading } = useQuery({
    queryKey: ["my-album", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select(
          "*, profiles(display_name, username, avatar_url), photo_likes(user_id), photo_comments(id)"
        )
        .eq("user_id", me!.user.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered =
    filter === "all"
      ? photos ?? []
      : photos?.filter((p) => p.species === filter) ?? [];

  const current = photos?.find((p) => p.id === detail);

  return (
    <div className="space-y-5">
      <div className="rounded-4xl bg-violet p-6 text-violet-foreground">
        <h2 className="text-2xl font-extrabold">Mis fotografías</h2>
        <p className="mt-1 text-sm opacity-90">
          Aquí encontrarás los encuentros con la fauna que has compartido y
          que ya fueron aprobados.
        </p>

        <p className="mt-4 font-display text-4xl font-extrabold">
          {photos?.length ?? 0}
        </p>
        <p className="text-sm opacity-80">fotografías aprobadas</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          Todas
        </Chip>

        {SPECIES.map((s) => (
          <Chip
            key={s.key}
            active={filter === s.key}
            onClick={() => setFilter(s.key)}
          >
            {s.name}
          </Chip>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="aspect-square animate-pulse rounded-4xl bg-muted"
            />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="rounded-4xl bg-card p-8 text-center shadow-card">
          <Camera className="mx-auto h-10 w-10 text-muted-foreground" />

          <h3 className="mt-3 font-bold">
            {photos?.length
              ? "No tienes fotos de esta especie"
              : "Tu álbum está esperando su primera fotografía"}
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Comparte una fotografía de la fauna del campus. Cuando sea
            aprobada, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setDetail(p.id)}
              className="overflow-hidden rounded-4xl bg-card text-left shadow-card transition-transform hover:scale-[1.01]"
            >
              <MediaImage
                path={p.image_url}
                alt={p.title}
                className="aspect-square w-full object-cover"
              />

              <div className="space-y-1 p-4">
                <p className="font-bold">{p.title}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(p.created_at)}
                  </span>

                  <span className="rounded-full bg-nature px-2 py-0.5 text-xs font-bold text-nature-foreground">
                    {speciesByKey[p.species as SpeciesKey]?.name}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!current} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-4xl">
          {current && <PhotoDetail photo={current} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Componentes compartidos ---------------- */

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

function UploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
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

    if (!file || !me) {
      toast.error("Selecciona una fotografía");
      return;
    }

    if (!agree) {
      toast.error("Debes aceptar las condiciones de cuidado de la fauna");
      return;
    }

    setBusy(true);

    try {
      const path = await uploadMedia(file, "photos");

      const { error } = await supabase.from("photos").insert({
        user_id: me.user.id,
        species,
        title,
        description,
        image_url: path,
      });

      if (error) throw error;

      toast.success("¡Gracias! Tu foto quedó en moderación.");

      setFile(null);
      setTitle("");
      setDescription("");
      setAgree(false);

      onOpenChange(false);

      qc.invalidateQueries({ queryKey: ["photos"] });
      qc.invalidateQueries({ queryKey: ["my-album"] });
      qc.invalidateQueries({ queryKey: ["my-photo-status"] });
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
          <DialogTitle>Compartir mi fotografía</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-primary/40 bg-secondary p-5 text-center text-sm text-secondary-foreground">
            {file ? (
              <img
                src={URL.createObjectURL(file)}
                alt="Vista previa"
                className="max-h-48 rounded-2xl"
              />
            ) : (
              <Camera className="h-8 w-8" />
            )}

            {file ? "Cambiar foto" : "Tomar foto o elegir de la galería"}

            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            {SPECIES.map((s) => (
              <button
                type="button"
                key={s.key}
                onClick={() => setSpecies(s.key)}
                className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                  species === s.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <Input
            required
            maxLength={80}
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-2xl"
          />

          <Textarea
            maxLength={500}
            placeholder="¿Dónde y cómo la observaste?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-2xl"
          />

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              required
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5"
            />
            Tomé esta foto a distancia, sin perseguir, tocar ni alimentar al
            animal.
          </label>

          <Button
            type="submit"
            variant="lime"
            size="lg"
            className="w-full"
            disabled={busy}
          >
            {busy ? "Subiendo…" : "Enviar a moderación"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PhotoDetail({
  photo,
}: {
  photo: {
    id: string;
    image_url: string;
    title: string;
    description: string | null;
    species: string;
    profiles: { display_name: string } | null;
  };
}) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data: comments } = useQuery({
    queryKey: ["photo-comments", photo.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_comments")
        .select("*, profiles(display_name, avatar_url)")
        .eq("photo_id", photo.id)
        .order("created_at");

      if (error) throw error;
      return data ?? [];
    },
  });

  async function send(e: React.FormEvent) {
    e.preventDefault();

    if (!body.trim() || !me) return;

    const { error } = await supabase.from("photo_comments").insert({
      photo_id: photo.id,
      user_id: me.user.id,
      body: body.trim(),
    });

    if (error) {
      toast.error("No se pudo comentar");
      return;
    }

    setBody("");

    qc.invalidateQueries({
      queryKey: ["photo-comments", photo.id],
    });
    qc.invalidateQueries({ queryKey: ["photos"] });
    qc.invalidateQueries({ queryKey: ["my-album"] });
  }

  async function report() {
    if (!me) return;

    const { error } = await supabase.from("reports").insert({
      user_id: me.user.id,
      target_type: "photo",
      target_id: photo.id,
      reason: "Contenido inapropiado",
    });

    if (error) {
      toast.error("No se pudo enviar el reporte");
      return;
    }

    toast.success("Gracias, el equipo revisará esta foto.");
  }

  return (
    <div className="space-y-3">
      <MediaImage
        path={photo.image_url}
        alt={photo.title}
        className="w-full rounded-3xl"
      />

      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xl font-bold">{photo.title}</h3>
          <p className="text-sm text-muted-foreground">
            {photo.profiles?.display_name} ·{" "}
            {speciesByKey[photo.species as SpeciesKey]?.name}
          </p>
        </div>

        <button
          onClick={report}
          aria-label="Reportar"
          className="text-muted-foreground"
        >
          <Flag className="h-4 w-4" />
        </button>
      </div>

      {photo.description && (
        <p className="text-sm">{photo.description}</p>
      )}

      <div className="space-y-2">
        {comments?.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar
              path={c.profiles?.avatar_url}
              name={c.profiles?.display_name}
              className="h-7 w-7 text-[10px]"
            />

            <div className="rounded-2xl bg-muted px-3 py-2 text-sm">
              <span className="font-semibold">
                {c.profiles?.display_name}
              </span>{" "}
              {c.body}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe un comentario"
          className="rounded-full"
        />
        <Button type="submit">Enviar</Button>
      </form>
    </div>
  );
}
