import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, Clock, Gift, Target, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Countdown } from "@/components/Countdown";
import { useCycle, useLeaderboard, useMe, useMyAnswers } from "@/lib/data";
import { featuredChallenge, formatDate, weekStartISO, CHALLENGES } from "@/lib/challenges";
import { speciesByKey, SPECIES, type SpeciesKey } from "@/lib/species";
import { MediaImage } from "@/lib/media";
import peluches from "@/assets/peluches.jpg";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "Inicio — ICESI VIVO" }, { name: "description", content: "Tu panel de guardián: retos, ranking y comunidad." }] }),
  component: Home,
});

function Home() {
  const { data: me } = useMe();
  const { data: cycle } = useCycle();
  const { data: board } = useLeaderboard(cycle?.id);
  const { data: mine } = useMyAnswers();
  const featured = featuredChallenge();
  const myRow = board?.find((r) => r.user_id === me?.user.id);
  const week = weekStartISO();
  const featuredDone = mine?.answers.filter((a) => a.week_start === week && a.questions?.challenge_key === featured.key).length ?? 0;
  const discovered = new Set(mine?.answers.filter((a) => a.is_correct && a.questions?.species).map((a) => a.questions!.species as SpeciesKey));

  const { data: photos } = useQuery({
    queryKey: ["recent-photos"],
    queryFn: async () => (await supabase.from("photos").select("id, image_url, title, species").eq("status", "approved").order("created_at", { ascending: false }).limit(6)).data ?? [],
  });

  const prize = cycle ? speciesByKey[cycle.prize_species as SpeciesKey] : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Hola, {me?.profile?.display_name ?? "guardián"} 👋</p>
        <h1 className="text-3xl font-extrabold md:text-4xl">¿Listo para el reto de hoy?</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/retos/$key" params={{ key: featured.key }} className="group relative overflow-hidden rounded-4xl bg-hero p-6 text-primary-foreground shadow-card md:col-span-2">
          <span className="rounded-full bg-lime px-3 py-1 text-xs font-bold text-lime-foreground">Reto semanal activo</span>
          <h2 className="mt-4 text-3xl font-extrabold">{featured.name}</h2>
          <p className="mt-1 max-w-sm text-sm opacity-90">{featured.description}</p>
          <div className="mt-5 max-w-xs">
            <div className="mb-1 flex justify-between text-xs"><span>Progreso</span><span>{featured.key === "memoria" ? (mine?.memory.some((m) => m.week_start === week) ? "1/1" : "0/1") : `${featuredDone}/${featured.count}`}</span></div>
            <Progress value={featured.key === "memoria" ? (mine?.memory.some((m) => m.week_start === week) ? 100 : 0) : (featuredDone / featured.count) * 100} className="h-2.5 bg-primary-foreground/20 [&>div]:bg-lime" />
          </div>
          <Button variant="lime" className="mt-5">Participar <ArrowRight /></Button>
          <img src={speciesByKey[featured.species].image} alt="" className="absolute -bottom-6 -right-6 h-40 w-40 rotate-6 rounded-3xl object-cover opacity-90 transition-transform group-hover:rotate-0 md:h-52 md:w-52" />
        </Link>

        <Link to="/ranking" className="rounded-4xl bg-lime p-6 text-lime-foreground">
          <Trophy className="h-7 w-7" />
          <p className="mt-3 text-sm font-semibold">Mi posición</p>
          <p className="font-display text-5xl font-extrabold">{myRow ? `#${myRow.rank}` : "—"}</p>
          <p className="mt-2 text-sm">{myRow ? `${myRow.accuracy}% de aciertos · ${myRow.points} pts` : "Responde un reto para entrar al ranking"}</p>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-4xl bg-violet p-6 text-violet-foreground">
          <div className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4" /> Cierre de la competencia</div>
          <div className="mt-4"><Countdown target={cycle?.ends_at} /></div>
          {cycle && <p className="mt-3 text-xs opacity-80">Ciclo {formatDate(cycle.starts_at)} – {formatDate(cycle.ends_at)}</p>}
        </div>

        <Link to="/ranking" className="relative overflow-hidden rounded-4xl bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Gift className="h-4 w-4" /> Próximo premio</div>
          <h3 className="mt-2 text-2xl font-extrabold">Peluche {prize?.name ?? ""}</h3>
          <p className="text-sm text-muted-foreground">{cycle ? `Premiación: ${formatDate(cycle.ends_at)}` : ""}</p>
          {prize && <img src={peluches} alt={`Peluche ${prize.name}`} className="mt-3 h-32 w-full rounded-3xl object-cover" style={{ objectPosition: prize.plushPos }} />}
        </Link>

        <div className="rounded-4xl bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-nature"><Target className="h-4 w-4" /> Progreso personal</div>
          <p className="mt-2 text-sm text-muted-foreground">Especies descubiertas</p>
          <div className="mt-2 flex gap-2">
            {SPECIES.map((s) => (
              <img key={s.key} src={s.image} alt={s.name} title={s.name} className={`h-12 w-12 rounded-2xl object-cover ${discovered.has(s.key) ? "ring-2 ring-nature" : "opacity-30 grayscale"}`} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-muted p-3"><div className="font-display text-2xl font-bold">{myRow?.points ?? 0}</div><div className="text-xs text-muted-foreground">puntos</div></div>
            <div className="rounded-2xl bg-muted p-3"><div className="font-display text-2xl font-bold">{myRow?.completed ?? 0}/{CHALLENGES.length}</div><div className="text-xs text-muted-foreground">retos</div></div>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Fotos recientes de la comunidad</h2>
          <Link to="/comunidad" className="text-sm font-semibold text-primary">Ver todo</Link>
        </div>
        {photos && photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            {photos.map((p) => (
              <Link key={p.id} to="/comunidad" className="overflow-hidden rounded-2xl">
                <MediaImage path={p.image_url} alt={p.title} className="aspect-square w-full object-cover" />
              </Link>
            ))}
          </div>
        ) : (
          <Link to="/comunidad" className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-primary/30 bg-card p-5">
            <Camera className="h-8 w-8 text-primary" />
            <div><p className="font-semibold">Aún no hay fotos publicadas</p><p className="text-sm text-muted-foreground">¡Sé el primero en compartir una observación!</p></div>
          </Link>
        )}
      </section>
    </div>
  );
}
