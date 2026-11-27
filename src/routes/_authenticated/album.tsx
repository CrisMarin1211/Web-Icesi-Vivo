import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Award } from "lucide-react";
import { SPECIES, toneClasses, type SpeciesKey } from "@/lib/species";
import { useMyAnswers, useMe } from "@/lib/data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import peluches from "@/assets/peluches.jpg";

export const Route = createFileRoute("/_authenticated/album")({
  head: () => ({
    meta: [
      { title: "Mi álbum — ICESI VIVO" },
      { name: "description", content: "Colecciona las cuatro especies de ICESI VIVO." },
    ],
  }),
  component: Album,
});

function Album() {
  const { data } = useMyAnswers();
  const { data: me } = useMe();
  const counts = new Map<SpeciesKey, number>();
  data?.answers.forEach((a) => {
    if (a.is_correct && a.questions?.species)
      counts.set(
        a.questions.species as SpeciesKey,
        (counts.get(a.questions.species as SpeciesKey) ?? 0) + 1,
      );
  });
  const { data: wins } = useQuery({
    queryKey: ["my-wins", me?.user.id],
    enabled: !!me,
    queryFn: async () =>
      (await supabase.from("winners").select("*").eq("user_id", me!.user.id)).data ?? [],
  });
  const unlocked = SPECIES.filter((s) => counts.has(s.key)).length;

  return (
    <div className="space-y-5">
      <div className="rounded-4xl bg-violet p-6 text-violet-foreground">
        <h1 className="text-3xl font-extrabold">Mi álbum</h1>
        <p className="text-sm opacity-90">
          Desbloquea cada especie respondiendo correctamente preguntas sobre ella. Completa las 4
          para ganar +50 puntos.
        </p>
        <p className="mt-3 font-display text-4xl font-extrabold">{unlocked}/4</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {SPECIES.map((s) => {
          const n = counts.get(s.key) ?? 0;
          const open = n > 0;
          return (
            <div
              key={s.key}
              className={`overflow-hidden rounded-4xl shadow-card ${open ? "animate-pop " + toneClasses[s.tone] : "bg-card"}`}
            >
              <div className="relative">
                <img
                  src={peluches}
                  alt={s.name}
                  className={`aspect-[3/4] w-full object-cover ${open ? "" : "opacity-25 grayscale"}`}
                  style={{ objectPosition: s.plushPos }}
                />
                {!open && (
                  <Lock className="absolute inset-0 m-auto h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="p-4">
                <p className="font-bold">{open ? s.name : "???"}</p>
                <p className="text-xs opacity-80">{open ? `${n} aciertos` : "Bloqueada"}</p>
              </div>
            </div>
          );
        })}
      </div>
      <section className="rounded-4xl bg-card p-6 shadow-card">
        <h2 className="flex items-center gap-2 text-xl font-extrabold">
          <Award className="h-5 w-5 text-primary" /> Insignias
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {unlocked >= 1 && <Badge label="Primer descubrimiento" />}
          {unlocked >= 4 && <Badge label="Explorador total" />}
          {(wins?.length ?? 0) > 0 && (
            <Badge label={`Guardián de la semana ×${wins!.length}`} gold />
          )}
          {unlocked === 0 && (
            <p className="text-sm text-muted-foreground">
              Aún no tienes insignias.{" "}
              <Link to="/retos" className="font-semibold text-primary">
                Empieza un reto
              </Link>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Badge({ label, gold }: { label: string; gold?: boolean }) {
  return (
    <span
      className={`animate-pop rounded-full px-4 py-2 text-sm font-bold ${gold ? "bg-gold text-foreground" : "bg-lime text-lime-foreground"}`}
    >
      🏅 {label}
    </span>
  );
}
