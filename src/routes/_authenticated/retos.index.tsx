
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2,
  Star,
  Timer,
  Trophy,
  Target,
} from "lucide-react";

import {
  CHALLENGES,
  featuredChallenge,
  formatDate,
  weekStart,
  weekStartISO,
} from "@/lib/challenges";

import { speciesByKey } from "@/lib/species";
import { useMyAnswers } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/Countdown";
import { RankingContent } from "./ranking";

export const Route = createFileRoute("/_authenticated/retos/")({
  head: () => ({
    meta: [
      { title: "Juegos y retos — ICESI VIVO" },
      {
        name: "description",
        content:
          "El desafío ICESI VIVO: retos semanales de reconocimiento y cuidado de la fauna.",
      },
    ],
  }),
  component: Retos,
});

const TONE = {
  primary: "bg-primary text-primary-foreground",
  violet: "bg-violet text-violet-foreground",
  nature: "bg-nature text-nature-foreground",
  lime: "bg-lime text-lime-foreground",
};

function Retos() {
  const [activeTab, setActiveTab] = useState<"retos" | "ranking">(
    "retos"
  );

  const { data } = useMyAnswers();

  const week = weekStartISO();
  const start = weekStart();
  const end = new Date(start.getTime() + 7 * 86400_000);
  const featured = featuredChallenge();

  const progress = (key: string, count: number) => {
    if (key === "memoria") {
      const m = data?.memory.find((x) => x.week_start === week);

      return {
        done: m ? 1 : 0,
        total: 1,
        points: m?.points ?? 0,
      };
    }

    const rows =
      data?.answers.filter(
        (a) =>
          a.week_start === week &&
          a.questions?.challenge_key === key
      ) ?? [];

    return {
      done: rows.length,
      total: count,
      points: rows.reduce((s, r) => s + r.points, 0),
    };
  };

  return (
    <div className="space-y-5">
      {/* Pestañas */}
      <div
        role="tablist"
        aria-label="Secciones de retos y ranking"
        className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "retos"}
          onClick={() => setActiveTab("retos")}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
            activeTab === "retos"
              ? "bg-card text-primary shadow-card"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Target className="h-4 w-4" />
          Retos
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "ranking"}
          onClick={() => setActiveTab("ranking")}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
            activeTab === "ranking"
              ? "bg-card text-primary shadow-card"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Trophy className="h-4 w-4" />
          Ranking
        </button>
      </div>

      {/* Contenido de Retos */}
      {activeTab === "retos" ? (
        <div
          role="tabpanel"
          className="space-y-5"
        >
          {/* Encabezado */}
          <div className="rounded-4xl bg-hero p-6 text-primary-foreground shadow-card">
            <p className="text-sm font-semibold text-lime">
              El desafío ICESI VIVO
            </p>

            <h1 className="text-3xl font-extrabold">
              Retos de la semana
            </h1>

            <p className="mt-1 text-sm opacity-90">
              Del {formatDate(start)} al{" "}
              {formatDate(new Date(end.getTime() - 1))}. Se renuevan
              cada lunes: la precisión vale más que la cantidad.
            </p>

            <div className="mt-4">
              <Countdown target={end.toISOString()} />
            </div>
          </div>

          {/* Tarjetas de retos */}
          <div className="grid gap-4 sm:grid-cols-2">
            {CHALLENGES.map((c) => {
              const p = progress(c.key, c.count);
              const complete = p.done >= p.total;

              return (
                <article
                  key={c.key}
                  className="overflow-hidden rounded-4xl bg-card shadow-card"
                >
                  <div
                    className={`relative flex h-32 items-end p-5 ${TONE[c.tone]}`}
                  >
                    <img
                      src={speciesByKey[c.species].image}
                      alt=""
                      className="absolute right-4 top-4 h-24 w-24 rounded-3xl object-cover"
                    />

                    <div>
                      <p className="text-xs font-bold opacity-80">
                        Reto {c.number}
                      </p>

                      <h2 className="text-xl font-extrabold">
                        {c.name}
                      </h2>
                    </div>

                    {featured.key === c.key && (
                      <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                        <Star className="h-3 w-3" />
                        Destacado
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 p-5">
                    <p className="text-sm text-muted-foreground">
                      {c.description}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {c.key === "memoria"
                          ? "8 parejas"
                          : `${c.count} preguntas`}
                      </span>

                      {c.timed && (
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          contrarreloj
                        </span>
                      )}

                      <span className="ml-auto font-semibold text-foreground">
                        {p.points} pts
                      </span>
                    </div>

                    <Progress
                      value={(p.done / p.total) * 100}
                      className="h-2 [&>div]:bg-nature"
                    />

                    {complete ? (
                      <Button
                        asChild
                        variant="nature"
                        className="w-full"
                      >
                        <Link
                          to="/retos/$key"
                          params={{ key: c.key }}
                        >
                          <CheckCircle2 />
                          Completado · ver resultados
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        variant="lime"
                        className="w-full"
                      >
                        <Link
                          to="/retos/$key"
                          params={{ key: c.key }}
                        >
                          {p.done > 0
                            ? "Continuar"
                            : "Participar"}
                        </Link>
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        /* Contenido de Ranking */
        <div role="tabpanel">
          <RankingContent />
        </div>
      )}
    </div>
  );
}
