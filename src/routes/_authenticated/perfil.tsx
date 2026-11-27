import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, PawPrint, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCycle, useLeaderboard, useMe } from "@/lib/data";
import { Avatar, PRESET_AVATARS } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil — ICESI VIVO" },
      { name: "description", content: "Tu perfil, progreso y logros." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { data: me } = useMe();
  const { data: cycle } = useCycle();
  const { data: board } = useLeaderboard(cycle?.id);

  const qc = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarModal, setAvatarModal] = useState(false);

  useEffect(() => {
    if (me?.profile) {
      setName(me.profile.display_name);
      setUsername(me.profile.username ?? "");
      setBio(me.profile.bio ?? "");
    }
  }, [me?.profile]);

  const row = board?.find((r) => r.user_id === me?.user.id);

  // Guardar los datos del perfil
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name,
        username,
        bio,
      })
      .eq("id", me!.user.id);

    setBusy(false);

    if (error) {
      toast.error(error.code === "23505" ? "Ese seudónimo ya está en uso" : "No se pudo guardar");
      return;
    }

    toast.success("Perfil actualizado");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  // Guardar el animal seleccionado como avatar
  async function selectAvatar(animal: keyof typeof PRESET_AVATARS) {
    if (!me?.user.id || avatarBusy) return;

    setAvatarBusy(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: `preset:${animal}`,
        })
        .eq("id", me.user.id);

      if (error) throw error;

      await qc.invalidateQueries({ queryKey: ["me"] });

      toast.success(`¡Tu nuevo avatar es ${PRESET_AVATARS[animal].label}!`);
      setAvatarModal(false);
    } catch (error) {
      toast.error("No se pudo actualizar tu avatar");
      console.error(error);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const currentAvatar = me?.profile?.avatar_url;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* TARJETA PRINCIPAL DEL PERFIL */}
      <div className="flex flex-col items-center rounded-4xl bg-hero p-6 text-center text-primary-foreground">
        {/* Avatar y botón para cambiarlo */}
        <button
          type="button"
          onClick={() => setAvatarModal(true)}
          aria-label="Cambiar avatar"
          className="group relative cursor-pointer rounded-full"
        >
          <Avatar
            path={currentAvatar}
            name={me?.profile?.display_name}
            className="h-24 w-24 text-2xl ring-4 ring-lime transition-transform group-hover:scale-105"
          />

          <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-lime text-lime-foreground shadow-md">
            <PawPrint className="h-4 w-4" />
          </span>
        </button>

        <p className="mt-2 text-xs opacity-80">Toca tu avatar para cambiarlo</p>

        <h1 className="mt-3 text-2xl font-extrabold">{me?.profile?.display_name}</h1>

        <p className="text-sm opacity-80">@{me?.profile?.username}</p>

        {/* ESTADÍSTICAS */}
        <div className="mt-4 grid w-full grid-cols-3 gap-2">
          {[
            ["Posición", row ? `#${row.rank}` : "—"],
            ["Aciertos", `${row?.accuracy ?? 0}%`],
            ["Puntos", String(row?.points ?? 0)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-primary-foreground/15 p-3">
              <div className="font-display text-xl font-bold">{v}</div>
              <div className="text-xs opacity-80">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FORMULARIO DE EDICIÓN */}
      <form onSubmit={save} className="space-y-3 rounded-4xl bg-card p-6 shadow-card">
        <h2 className="text-lg font-extrabold">Editar perfil</h2>

        <div className="space-y-1.5">
          <Label htmlFor="n">Nombre</Label>
          <Input
            id="n"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-2xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="u">Seudónimo</Label>
          <Input
            id="u"
            required
            pattern="[A-Za-z0-9_]{3,20}"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-2xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="b">Sobre mí</Label>
          <Textarea
            id="b"
            maxLength={300}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="rounded-2xl"
          />
        </div>

        <p className="text-xs text-muted-foreground">{me?.user.email}</p>

        <Button type="submit" variant="lime" disabled={busy}>
          {busy ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut /> Cerrar sesión
      </Button>

      {/* POPUP DE SELECCIÓN DE AVATAR */}
      {avatarModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !avatarBusy && setAvatarModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-title"
            className="relative w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cerrar */}
            <button
              type="button"
              onClick={() => setAvatarModal(false)}
              disabled={avatarBusy}
              aria-label="Cerrar"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Encabezado */}
            <div className="mb-5 pr-8">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-lime text-lime-foreground">
                <PawPrint className="h-6 w-6" />
              </div>

              <h2 id="avatar-title" className="text-xl font-extrabold">
                Elige tu animalito
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Selecciona el avatar que te representará en ICESI VIVO.
              </p>
            </div>

            {/* Opciones de animales */}
            <div className="grid grid-cols-2 gap-3">
              {(
                Object.entries(PRESET_AVATARS) as [
                  keyof typeof PRESET_AVATARS,
                  (typeof PRESET_AVATARS)[keyof typeof PRESET_AVATARS],
                ][]
              ).map(([key, animal]) => {
                const selected = currentAvatar === `preset:${key}`;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => selectAvatar(key)}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all hover:scale-[1.02] hover:bg-secondary disabled:cursor-wait disabled:opacity-60 ${
                      selected ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <img
                      src={animal.src}
                      alt={animal.label}
                      className="h-24 w-24 rounded-full object-cover"
                    />

                    <span className="text-sm font-bold">{animal.label}</span>

                    {selected && (
                      <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              {avatarBusy
                ? "Guardando tu nuevo avatar..."
                : "Tu selección se guardará automáticamente."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
