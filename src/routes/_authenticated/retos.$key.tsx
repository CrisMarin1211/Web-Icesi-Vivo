import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, X, Timer, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { challengeByKey, weekStartISO, type ChallengeKey } from "@/lib/challenges";
import { SPECIES, speciesByKey, type SpeciesKey } from "@/lib/species";
import { useMyAnswers } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/retos/$key")({
  beforeLoad: ({ params }) => {
    if (!(params.key in challengeByKey)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      {
        title: `${challengeByKey[params.key as ChallengeKey]?.name ?? "Reto"} — ICESI VIVO`,
      },
      {
        name: "description",
        content: "Participa en el reto y suma puntos.",
      },
    ],
  }),
  component: Play,
});

function Play() {
  const { key } = Route.useParams();
  const c = challengeByKey[key as ChallengeKey];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/retos"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retos
      </Link>

      <div className="rounded-4xl bg-hero p-6 text-primary-foreground">
        <p className="text-xs font-bold text-lime">Reto {c.number}</p>
        <h1 className="text-3xl font-extrabold">{c.name}</h1>
        <p className="mt-1 text-sm opacity-90">{c.instructions}</p>
      </div>

      {c.key === "memoria" ? <Memory /> : <Quiz challengeKey={c.key} timed={!!c.timed} />}
    </div>
  );
}

interface Result {
  correct: boolean;
  correct_index: number;
  explanation: string | null;
  points: number;
  repeated: boolean;
}

function Quiz({ challengeKey, timed }: { challengeKey: string; timed: boolean }) {
  const qc = useQueryClient();
  const { data: mine } = useMyAnswers();
  const week = weekStartISO();

  const { data: questions } = useQuery({
    queryKey: ["questions", challengeKey],
    queryFn: async () =>
      (
        await supabase
          .from("questions")
          .select("*")
          .eq("challenge_key", challengeKey)
          .order("position")
      ).data ?? [],
  });

  const answered = useMemo(
    () =>
      new Map(
        (mine?.answers ?? []).filter((a) => a.week_start === week).map((a) => [a.question_id, a]),
      ),
    [mine, week],
  );

  const [idx, setIdx] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(15);

  const firstOpen = questions?.findIndex((q) => !answered.has(q.id)) ?? -1;
  const current = idx ?? (firstOpen === -1 ? null : firstOpen);
  const q = current != null ? questions?.[current] : undefined;

  const answer = useCallback(
    async (i: number) => {
      if (!q || busy) return;

      setBusy(true);
      setChoice(i);

      const { data, error } = await supabase.rpc("submit_answer", {
        _question_id: q.id,
        _choice: i,
      });

      setBusy(false);

      if (error) {
        toast.error("No se pudo registrar tu respuesta");
        return;
      }

      const r = data as unknown as Result;
      setResult(r);

      if (r.correct && r.points > 0) {
        toast.success(`¡Correcto! +${r.points} puntos`);
      }
    },
    [q, busy],
  );

  useEffect(() => {
    if (!timed || !q?.id || result) return;

    setLeft(15);

    const t = setInterval(() => {
      setLeft((l) => l - 1);
    }, 1000);

    return () => clearInterval(t);
  }, [timed, q?.id, result]);

  useEffect(() => {
    if (!timed || left > 0 || !q || result || busy) return;

    answer(-1);
  }, [timed, left, q, result, busy, answer]);

  function next() {
    setResult(null);
    setChoice(null);

    qc.invalidateQueries({ queryKey: ["my-answers"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });

    const nextIdx = questions!.findIndex(
      (x, j) => j > (current ?? 0) && !answered.has(x.id) && x.id !== q!.id,
    );

    setIdx(nextIdx === -1 ? -1 : nextIdx);
  }

  if (!questions) {
    return <div className="h-64 animate-pulse rounded-4xl bg-muted" />;
  }

  const total = questions.length;
  const done = answered.size >= 0 ? questions.filter((x) => answered.has(x.id)).length : 0;
  const correct = questions.filter((x) => answered.get(x.id)?.is_correct).length;

  if (!q || idx === -1) {
    return (
      <div className="animate-pop rounded-4xl bg-nature p-8 text-center text-nature-foreground">
        <PartyPopper className="mx-auto h-12 w-12" />
        <h2 className="mt-3 text-2xl font-extrabold">¡Reto completado!</h2>
        <p className="mt-1">
          Aciertos esta semana: {correct}/{total} · {correct * 10} puntos
        </p>
        <p className="mt-1 text-sm opacity-90">Vuelve el próximo lunes para intentarlo de nuevo.</p>
        <Button asChild variant="lime" className="mt-5">
          <Link to="/retos">Más retos</Link>
        </Button>
      </div>
    );
  }

  const options = q.options as string[];
  const sp = q.species ? speciesByKey[q.species as SpeciesKey] : null;

  return (
    <div className="space-y-4 rounded-4xl bg-card p-5 shadow-card">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-semibold">
          Pregunta {Math.min(done + 1, total)} de {total}
        </span>

        {timed && !result && (
          <span
            className={`ml-auto flex items-center gap-1 rounded-full px-3 py-1 font-bold ${
              left <= 5
                ? "bg-destructive text-destructive-foreground"
                : "bg-lime text-lime-foreground"
            }`}
          >
            <Timer className="h-4 w-4" /> {Math.max(0, left)}s
          </span>
        )}
      </div>

      <Progress value={(done / total) * 100} className="h-2 [&>div]:bg-primary" />

      {challengeKey === "quien" && sp && q.position <= 4 && (
        <img
          src={sp.image}
          alt="¿Qué especie es?"
          className="aspect-[4/3] w-full rounded-3xl object-cover"
        />
      )}

      <h2 className="text-xl font-bold">{q.prompt}</h2>

      <div className="grid gap-2">
        {options.map((o, i) => {
          const isCorrect = result && i === result.correct_index;
          const isWrong = result && i === choice && !result.correct;

          return (
            <button
              key={i}
              disabled={!!result || busy}
              onClick={() => answer(i)}
              className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3.5 text-left font-medium transition-all ${
                isCorrect
                  ? "border-nature bg-nature text-nature-foreground"
                  : isWrong
                    ? "border-destructive bg-destructive text-destructive-foreground"
                    : "border-border bg-background hover:border-primary"
              }`}
            >
              {o}
              {isCorrect && <Check className="h-5 w-5" />}
              {isWrong && <X className="h-5 w-5" />}
            </button>
          );
        })}
      </div>

      {result && (
        <div
          className={`animate-pop rounded-3xl p-4 ${
            result.correct
              ? "bg-nature text-nature-foreground"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          <p className="font-bold">
            {result.correct ? "¡Muy bien!" : choice === -1 ? "Se acabó el tiempo" : "Casi…"}
          </p>

          {result.explanation && <p className="text-sm">{result.explanation}</p>}

          {result.repeated && (
            <p className="mt-1 text-xs opacity-80">
              Ya habías respondido esta pregunta esta semana; no suma de nuevo.
            </p>
          )}
        </div>
      )}

      {result && (
        <Button variant="lime" size="lg" className="w-full" onClick={next}>
          Siguiente
        </Button>
      )}
    </div>
  );
}

function shuffle<T>(a: T[]) {
  const b = [...a];

  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }

  return b;
}

function Memory() {
  const qc = useQueryClient();
  const { data: mine } = useMyAnswers();

  const already = mine?.memory.find((m) => m.week_start === weekStartISO());

  const [cards] = useState(() =>
    shuffle(
      [...SPECIES, ...SPECIES, ...SPECIES, ...SPECIES].map((s, i) => ({
        id: i,
        key: s.key,
        img: s.image,
        variant: Math.floor(i / 4),
      })),
    ).map((c, i) => ({ ...c, id: i })),
  );

  // pairs: same species & same variant group -> make 8 pairs
  const pairs = useMemo(() => cards.map((c) => `${c.key}-${c.variant % 2}`), [cards]);

  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState<number | null>(null);

  function flip(i: number) {
    if (open.length === 2 || open.includes(i) || matched.has(i) || score != null) {
      return;
    }

    const o = [...open, i];
    setOpen(o);

    if (o.length === 2) {
      setMoves((m) => m + 1);

      if (pairs[o[0]!] === pairs[o[1]!]) {
        const nm = new Set(matched);
        nm.add(o[0]!);
        nm.add(o[1]!);

        setTimeout(() => {
          setMatched(nm);
          setOpen([]);

          if (nm.size === cards.length) {
            finish(moves + 1);
          }
        }, 350);
      } else {
        setTimeout(() => setOpen([]), 800);
      }
    }
  }

  async function finish(m: number) {
    const { data, error } = await supabase.rpc("submit_memory", {
      _moves: m,
    });

    if (error) {
      toast.error("No se pudo registrar el resultado");
      return;
    }

    const r = data as unknown as {
      points: number;
      repeated: boolean;
    };

    setScore(r.points);

    if (!r.repeated) {
      toast.success(`+${r.points} puntos`);
    }

    qc.invalidateQueries({ queryKey: ["my-answers"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
  }

  return (
    <div className="space-y-4 rounded-4xl bg-card p-5 shadow-card">
      {already && score == null && (
        <p className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
          Ya jugaste esta semana ({already.points} pts). Puedes practicar, pero no sumará de nuevo.
        </p>
      )}

      <div className="flex justify-between text-sm font-semibold">
        <span>Movimientos: {moves}</span>
        <span>Parejas: {matched.size / 2}/8</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {cards.map((c, i) => {
          const shown = open.includes(i) || matched.has(i);

          return (
            <button
              key={c.id}
              onClick={() => flip(i)}
              aria-label="Carta"
              className={`aspect-square overflow-hidden rounded-2xl transition-transform duration-300 ${
                shown ? "" : "bg-hero hover:scale-[1.03]"
              } ${matched.has(i) ? "ring-4 ring-nature" : ""}`}
            >
              {shown ? (
                <img
                  src={c.img}
                  alt={c.key}
                  className={`h-full w-full object-cover ${c.variant % 2 ? "scale-150" : ""}`}
                />
              ) : (
                <span className="font-display text-2xl font-extrabold text-lime">?</span>
              )}
            </button>
          );
        })}
      </div>

      {score != null && (
        <div className="animate-pop rounded-3xl bg-nature p-5 text-center text-nature-foreground">
          <PartyPopper className="mx-auto h-10 w-10" />
          <p className="mt-2 text-xl font-extrabold">¡Completado en {moves} movimientos!</p>
          <p>{score > 0 ? `+${score} puntos` : "Práctica registrada"}</p>
        </div>
      )}
    </div>
  );
}
