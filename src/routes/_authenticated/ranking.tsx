
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Info } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Countdown } from "@/components/Countdown";
import { Progress } from "@/components/ui/progress";
import {
  useCycle,
  useLeaderboard,
  useMe,
  MIN_ANSWERS,
  MIN_CHALLENGES,
} from "@/lib/data";
import { Avatar } from "@/lib/media";
import { formatDate } from "@/lib/challenges";
import {
  SPECIES,
  speciesByKey,
  type SpeciesKey,
} from "@/lib/species";
import peluches from "@/assets/peluches.jpg";

export const Route = createFileRoute("/_authenticated/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking — Guardianes de ICESI VIVO" },
      {
        name: "description",
        content: "Ranking semanal con premios del animal del mes.",
      },
    ],
  }),
  component: Ranking,
});

const MEDAL = ["bg-gold", "bg-silver", "bg-bronze"];

const STATUS: Record<string, string> = {
  pending_validation: "Pendiente de validación",
  confirmed: "Confirmado",
  delivered: "Entregado",
};

// Componente de la ruta independiente /ranking
function Ranking() {
  return <RankingContent />;
}

// Componente reutilizable dentro de /retos
export function RankingContent() {
  const { data: me } = useMe();
  const { data: cycle } = useCycle();
  const { data: board } = useLeaderboard(cycle?.id);

  const { data: winners } = useQuery({
    queryKey: ["winners"],
    queryFn: async () =>
      (
        await supabase
          .from("winners")
          .select(
            "*, profiles(display_name, avatar_url), cycles(starts_at, ends_at)"
          )
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const mine = board?.find((r) => r.user_id === me?.user.id);
  const top = board?.slice(0, 3) ?? [];
  const prize = cycle
    ? speciesByKey[cycle.prize_species as SpeciesKey]
    : null;

  const last = winners?.[0];
  const iWonLast = last && last.user_id === me?.user.id;

  return (
    <div className="space-y-5">
      {/* Encabezado y podio */}
      <section className="rounded-4xl bg-hero p-6 text-primary-foreground shadow-card">
        <p className="text-sm font-semibold text-lime">
          Guardianes de ICESI VIVO
        </p>

        <h1 className="text-3xl font-extrabold">
          Ranking semanal
        </h1>

        {cycle && (
          <p className="text-sm opacity-90">
            Semana {formatDate(cycle.starts_at)} –{" "}
            {formatDate(cycle.ends_at)} · Mes{" "}
            {prize ? `de ${prize.name}` : ""}
          </p>
        )}

        {cycle && !cycle.in_season && (
          <p className="mt-2 inline-block rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
            Vacaciones: puedes jugar, pero esta semana no hay premios.
            Vuelven en febrero y agosto.
          </p>
        )}

        <div className="mt-4">
          <Countdown target={cycle?.ends_at} />
        </div>

        {top.length > 0 && (
          <div className="mt-6 grid grid-cols-3 items-end gap-2">
            {[1, 0, 2].map(
              (i) =>
                top[i] && (
                  <div
                    key={top[i].user_id}
                    className={`flex flex-col items-center rounded-3xl p-3 text-center ${
                      i === 0
                        ? "bg-lime pb-6 text-lime-foreground"
                        : "bg-primary-foreground/15"
                    }`}
                  >
                    {i === 0 && <Crown className="h-6 w-6" />}

                    <Avatar
                      path={top[i].avatar_url}
                      name={top[i].display_name}
                      className="h-14 w-14 text-base ring-4 ring-primary-foreground/50"
                    />

                    <span
                      className={`-mt-3 grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-foreground ${MEDAL[i]}`}
                    >
                      {i + 1}
                    </span>

                    <p className="mt-1 w-full truncate text-sm font-bold">
                      {top[i].display_name}
                    </p>

                    <p className="text-xs">
                      {top[i].accuracy}%
                    </p>
                  </div>
                )
            )}
          </div>
        )}
      </section>

      {/* Anuncio de ganador */}
      {iWonLast && (
        <div className="animate-pop rounded-4xl bg-lime p-6 text-lime-foreground">
          <p className="text-2xl font-extrabold">
            🏆 ¡Felicitaciones! Eres el guardián de la biodiversidad de esta semana.
          </p>

          <p className="mt-1 text-sm">
            Estado de tu premio:{" "}
            <b>{STATUS[last.reward_status]}</b>. El equipo Icesi te
            contactará para coordinar la entrega.
          </p>
        </div>
      )}

      {/* Posición actual */}
      <section className="rounded-4xl bg-card p-6 shadow-card">
        <h2 className="text-xl font-extrabold">
          Tu posición actual
        </h2>

        {mine ? (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="Posición" value={`#${mine.rank}`} />
            <Stat label="Aciertos" value={`${mine.accuracy}%`} />
            <Stat label="Puntos" value={String(mine.points)} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Responde tu primer reto para aparecer en el ranking.
          </p>
        )}

        <div className="mt-4 space-y-2 text-sm">
          <p className="flex items-center gap-1 font-semibold">
            <Info className="h-4 w-4 text-primary" />
            Elegibilidad para el premio
          </p>

          <Req
            label={`${mine?.total ?? 0}/${MIN_ANSWERS} respuestas`}
            value={((mine?.total ?? 0) / MIN_ANSWERS) * 100}
          />

          <Req
            label={`${mine?.completed ?? 0}/${MIN_CHALLENGES} retos completos`}
            value={((mine?.completed ?? 0) / MIN_CHALLENGES) * 100}
          />

          <p className="text-xs text-muted-foreground">
            Desempate: 1) % de aciertos, 2) retos completados,
            3) respuestas correctas.
          </p>
        </div>
      </section>

      {/* Clasificación */}
      <section className="overflow-hidden rounded-4xl bg-card shadow-card">
        <h2 className="p-5 pb-2 text-xl font-extrabold">
          Clasificación
        </h2>

        {!board?.length && (
          <p className="p-5 text-sm text-muted-foreground">
            Aún nadie ha participado en este ciclo.
          </p>
        )}

        <ul className="divide-y">
          {board?.map((r) => (
            <li
              key={r.user_id}
              className={`flex items-center gap-3 px-5 py-3 ${
                r.user_id === me?.user.id ? "bg-secondary" : ""
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  r.rank <= 3
                    ? MEDAL[r.rank - 1]
                    : "bg-muted"
                }`}
              >
                {r.rank <= 3 ? (
                  <Medal className="h-4 w-4" />
                ) : (
                  r.rank
                )}
              </span>

              <Avatar
                path={r.avatar_url}
                name={r.display_name}
                className="h-9 w-9 text-xs"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {r.display_name}{" "}
                  {!r.eligible && (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      · no elegible aún
                    </span>
                  )}
                </p>

                <Progress
                  value={r.accuracy}
                  className="mt-1 h-1.5 [&>div]:bg-nature"
                />
              </div>

              <div className="text-right text-xs">
                <p className="font-display text-base font-bold">
                  {r.accuracy}%
                </p>

                <p className="text-muted-foreground">
                  {r.completed} retos · {r.points} pts
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Premios */}
      <section className="rounded-4xl bg-violet p-6 text-violet-foreground">
        <h2 className="text-2xl font-extrabold">
          Los guardianes de ICESI VIVO
        </h2>

        <p className="text-sm opacity-90">
          Cada semana del semestre (febrero–junio y agosto–noviembre)
          el ganador recibe un premio del animal del mes, como camisetas
          o gorras, e insignia digital. Cada mes tiene su animal. La
          entrega se valida con la universidad.
        </p>

        {prize && (
          <p className="mt-2 inline-block rounded-full bg-lime px-3 py-1 text-sm font-bold text-lime-foreground">
            Animal del mes: {prize.name} ·{" "}
            {formatDate(cycle!.ends_at)}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {SPECIES.map((s) => (
            <div
              key={s.key}
              className={`overflow-hidden rounded-3xl bg-card text-card-foreground ${
                prize?.key === s.key ? "ring-4 ring-lime" : ""
              }`}
            >
              <img
                src={peluches}
                alt={`Peluche ${s.name}`}
                className="aspect-[3/4] w-full animate-float object-cover"
                style={{ objectPosition: s.plushPos }}
              />

              <div className="p-3">
                <p className="font-bold">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.short}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Historial de ganadores */}
      <section className="rounded-4xl bg-card p-6 shadow-card">
        <h2 className="text-xl font-extrabold">
          Historial de ganadores
        </h2>

        {!winners?.length && (
          <p className="mt-2 text-sm text-muted-foreground">
            El primer ganador se anunciará al cierre de este ciclo.
          </p>
        )}

        <ul className="mt-3 space-y-2">
          {winners?.map((w) => (
            <li
              key={w.id}
              className="flex items-center gap-3 rounded-2xl bg-muted p-3"
            >
              <Avatar
                path={w.profiles?.avatar_url}
                name={w.profiles?.display_name ?? "—"}
                className="h-9 w-9 text-xs"
              />

              <div className="flex-1 text-sm">
                <p className="font-semibold">
                  {w.profiles?.display_name ??
                    "Sin participantes elegibles"}
                </p>

                <p className="text-xs text-muted-foreground">
                  {w.cycles
                    ? `${formatDate(w.cycles.starts_at)} – ${formatDate(w.cycles.ends_at)}`
                    : ""}{" "}
                  · {w.accuracy}% ·{" "}
                  {speciesByKey[w.prize_species as SpeciesKey]?.name}
                </p>
              </div>

              {w.user_id && (
                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-secondary-foreground">
                  {STATUS[w.reward_status]}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <div className="font-display text-2xl font-bold">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Req({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-1 text-xs">{label}</div>
      <Progress
        value={Math.min(100, value)}
        className="h-2 [&>div]:bg-primary"
      />
    </div>
  );
}
