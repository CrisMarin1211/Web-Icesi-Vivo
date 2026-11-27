import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/data";
import { MediaImage } from "@/lib/media";
import { speciesByKey, type SpeciesKey } from "@/lib/species";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Moderación — ICESI VIVO" },
      { name: "description", content: "Moderación de contenido y premios." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const enabled = !!me?.isAdmin;
  const { data: photos } = useQuery({
    queryKey: ["admin-photos"],
    enabled,
    queryFn: async () =>
      (
        await supabase
          .from("photos")
          .select("*, profiles(display_name)")
          .eq("status", "pending")
          .order("created_at")
      ).data ?? [],
  });
  const { data: approved } = useQuery({
    queryKey: ["admin-approved"],
    enabled,
    queryFn: async () =>
      (
        await supabase
          .from("photos")
          .select("id, title, featured, image_url")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(30)
      ).data ?? [],
  });
  const { data: reports } = useQuery({
    queryKey: ["admin-reports"],
    enabled,
    queryFn: async () =>
      (await supabase.from("reports").select("*").eq("status", "open").order("created_at")).data ??
      [],
  });
  const { data: winners } = useQuery({
    queryKey: ["admin-winners"],
    enabled,
    queryFn: async () =>
      (
        await supabase
          .from("winners")
          .select("*, profiles(display_name)")
          .not("user_id", "is", null)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  if (me && !me.isAdmin)
    return (
      <p className="rounded-3xl bg-card p-8 text-center">
        Esta sección es solo para el equipo de moderación.
      </p>
    );
  const refresh = () =>
    ["admin-photos", "admin-approved", "admin-reports", "admin-winners", "photos"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );

  async function setPhoto(id: string, patch: { status?: string; featured?: boolean }) {
    const { error } = await supabase.from("photos").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  }
  async function resolve(r: { id: string; target_type: string; target_id: string }, hide: boolean) {
    if (hide) {
      if (r.target_type === "post")
        await supabase.from("forum_posts").update({ hidden: true }).eq("id", r.target_id);
      if (r.target_type === "comment")
        await supabase.from("forum_comments").delete().eq("id", r.target_id);
      if (r.target_type === "photo")
        await supabase.from("photos").update({ status: "rejected" }).eq("id", r.target_id);
    }
    await supabase.from("reports").update({ status: "resolved" }).eq("id", r.id);
    refresh();
  }
  async function reward(id: string, reward_status: string) {
    const { error } = await supabase.from("winners").update({ reward_status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Estado del premio actualizado");
    refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Moderación</h1>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Fotos pendientes ({photos?.length ?? 0})</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos?.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-3xl bg-card shadow-card">
              <MediaImage
                path={p.image_url}
                alt={p.title}
                className="aspect-square w-full object-cover"
              />
              <div className="space-y-2 p-4">
                <p className="font-bold">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.profiles?.display_name} · {speciesByKey[p.species as SpeciesKey].name}
                </p>
                {p.description && <p className="text-sm">{p.description}</p>}
                <div className="flex gap-2">
                  <Button
                    variant="nature"
                    size="sm"
                    onClick={() => setPhoto(p.id, { status: "approved" })}
                  >
                    Aprobar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPhoto(p.id, { status: "rejected" })}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Destacar fotos</h2>
        <div className="flex flex-wrap gap-2">
          {approved?.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={p.featured ? "lime" : "outline"}
              onClick={() => setPhoto(p.id, { featured: !p.featured })}
            >
              {p.featured ? "★ " : ""}
              {p.title}
            </Button>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Reportes abiertos ({reports?.length ?? 0})</h2>
        {reports?.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center gap-2 rounded-3xl bg-card p-4 shadow-card"
          >
            <span className="flex-1 text-sm">
              {r.target_type} · {r.reason} ·{" "}
              <code className="text-xs">{r.target_id.slice(0, 8)}</code>
            </span>
            <Button size="sm" variant="destructive" onClick={() => resolve(r, true)}>
              Ocultar contenido
            </Button>
            <Button size="sm" variant="outline" onClick={() => resolve(r, false)}>
              Descartar
            </Button>
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Premios</h2>
        {!winners?.length && <p className="text-sm text-muted-foreground">Aún no hay ganadores.</p>}
        {winners?.map((w) => (
          <div
            key={w.id}
            className="flex flex-wrap items-center gap-2 rounded-3xl bg-card p-4 shadow-card"
          >
            <span className="flex-1 text-sm font-semibold">
              {w.profiles?.display_name} · premio{" "}
              {speciesByKey[w.prize_species as SpeciesKey]?.name}
            </span>
            {(["pending_validation", "confirmed", "delivered"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={w.reward_status === s ? "default" : "outline"}
                onClick={() => reward(w.id, s)}
              >
                {s === "pending_validation"
                  ? "Pendiente"
                  : s === "confirmed"
                    ? "Confirmado"
                    : "Entregado"}
              </Button>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
