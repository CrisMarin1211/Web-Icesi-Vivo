import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCycle, useLeaderboard, useMe } from "@/lib/data";
import { Avatar, uploadMedia } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Mi perfil — ICESI VIVO" }, { name: "description", content: "Tu perfil, progreso y logros." }] }),
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
  useEffect(() => {
    if (me?.profile) { setName(me.profile.display_name); setUsername(me.profile.username ?? ""); setBio(me.profile.bio ?? ""); }
  }, [me?.profile]);
  const row = board?.find((r) => r.user_id === me?.user.id);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: name, username, bio }).eq("id", me!.user.id);
    setBusy(false);
    if (error) { toast.error(error.code === "23505" ? "Ese seudónimo ya está en uso" : "No se pudo guardar"); return; }
    toast.success("Perfil actualizado");
    qc.invalidateQueries({ queryKey: ["me"] });
  }
  async function avatar(file?: File) {
    if (!file) return;
    try {
      const path = await uploadMedia(file, "avatar");
      await supabase.from("profiles").update({ avatar_url: path }).eq("id", me!.user.id);
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Foto actualizada");
    } catch (err) { toast.error((err as Error).message); }
  }
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-col items-center rounded-4xl bg-hero p-6 text-center text-primary-foreground">
        <label className="relative cursor-pointer">
          <Avatar path={me?.profile?.avatar_url} name={me?.profile?.display_name} className="h-24 w-24 text-2xl ring-4 ring-lime" />
          <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-lime text-lime-foreground"><Camera className="h-4 w-4" /></span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => avatar(e.target.files?.[0])} />
        </label>
        <h1 className="mt-3 text-2xl font-extrabold">{me?.profile?.display_name}</h1>
        <p className="text-sm opacity-80">@{me?.profile?.username}</p>
        <div className="mt-4 grid w-full grid-cols-3 gap-2">
          {[["Posición", row ? `#${row.rank}` : "—"], ["Aciertos", `${row?.accuracy ?? 0}%`], ["Puntos", String(row?.points ?? 0)]].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-primary-foreground/15 p-3"><div className="font-display text-xl font-bold">{v}</div><div className="text-xs opacity-80">{l}</div></div>
          ))}
        </div>
      </div>
      <form onSubmit={save} className="space-y-3 rounded-4xl bg-card p-6 shadow-card">
        <h2 className="text-lg font-extrabold">Editar perfil</h2>
        <div className="space-y-1.5"><Label htmlFor="n">Nombre</Label><Input id="n" required value={name} onChange={(e) => setName(e.target.value)} className="rounded-2xl" /></div>
        <div className="space-y-1.5"><Label htmlFor="u">Seudónimo</Label><Input id="u" required pattern="[A-Za-z0-9_]{3,20}" value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-2xl" /></div>
        <div className="space-y-1.5"><Label htmlFor="b">Sobre mí</Label><Textarea id="b" maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} className="rounded-2xl" /></div>
        <p className="text-xs text-muted-foreground">{me?.user.email}</p>
        <Button type="submit" variant="lime" disabled={busy}>Guardar cambios</Button>
      </form>
      <Button variant="outline" className="w-full" onClick={signOut}><LogOut /> Cerrar sesión</Button>
    </div>
  );
}
