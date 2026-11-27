import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Trophy, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { weekStartISO } from "@/lib/challenges";

interface AnswerResult {
  correct: boolean;
  correct_index: number;
  explanation: string | null;
  points: number;
  repeated: boolean;
}

export function MonumentQuiz({ monumentId }: { monumentId: string }) {
  const qc = useQueryClient();
  const week = weekStartISO();
  const queryKey = ["monument-quiz", monumentId, week];
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: questions, error } = await supabase
        .from("questions")
        .select("*")
        .eq("challenge_key", `monumento_${monumentId}`)
        .order("position");
      if (error) throw error;
      const ids = (questions ?? []).map((q) => q.id);
      const { data: answers, error: answerError } = await supabase
        .from("answers")
        .select("question_id,is_correct,points")
        .eq("week_start", week)
        .in("question_id", ids);
      if (answerError) throw answerError;
      return { questions: questions ?? [], answers: answers ?? [] };
    },
  });
  const [feedback, setFeedback] = useState<
    (AnswerResult & { choice: number; questionId: string }) | null
  >(null);
  const [error, setError] = useState("");
  const answers = query.data?.answers ?? [];
  const questions = query.data?.questions ?? [];
  const current = feedback
    ? questions.find((q) => q.id === feedback.questionId)
    : questions.find((q) => !answers.some((a) => a.question_id === q.id));
  const mutation = useMutation({
    mutationFn: async ({ questionId, choice }: { questionId: string; choice: number }) => {
      const { data, error } = await supabase.rpc("submit_answer", {
        _question_id: questionId,
        _choice: choice,
      });
      if (error) throw error;
      return data as unknown as AnswerResult;
    },
    onSuccess: async (result, variables) => {
      setFeedback({ ...result, ...variables });
      await Promise.all([
        qc.invalidateQueries({ queryKey }),
        qc.invalidateQueries({ queryKey: ["my-answers"] }),
        qc.invalidateQueries({ queryKey: ["leaderboard"] }),
      ]);
    },
    onError: () => setError("No se guardó tu respuesta. Inténtalo de nuevo."),
  });

  if (query.isPending)
    return (
      <p role="status" className="py-5 text-sm text-muted-foreground">
        Cargando actividad…
      </p>
    );
  if (query.isError)
    return (
      <div role="alert" className="space-y-3">
        <p>No se pudo cargar la actividad.</p>
        <Button onClick={() => query.refetch()}>Reintentar</Button>
      </div>
    );
  if (!questions.length)
    return (
      <p className="py-4 text-sm text-muted-foreground">
        La actividad de este monumento aún no está disponible.
      </p>
    );
  if (!current)
    return (
      <div className="space-y-3 py-5 text-center">
        <Trophy className="mx-auto h-10 w-10 text-primary" />
        <h3 className="text-xl font-bold">¡Monumento completado!</h3>
        <p>
          {answers.filter((a) => a.is_correct).length}/{questions.length} aciertos ·{" "}
          {answers.reduce((sum, a) => sum + a.points, 0)} puntos
        </p>
        <p className="text-sm text-muted-foreground">Puedes volver a jugar el próximo lunes.</p>
      </div>
    );
  return (
    <section className="space-y-4 border-t pt-5" aria-label="Cuestionario del monumento">
      <div className="flex justify-between text-xs font-semibold text-muted-foreground">
        <span>
          Pregunta {current.position} de {questions.length}
        </span>
        <span>{answers.reduce((sum, a) => sum + a.points, 0)} puntos</span>
      </div>
      <Progress value={(answers.length / questions.length) * 100} />
      <h3 className="text-lg font-bold">{current.prompt}</h3>
      <div className="grid gap-2">
        {current.options.map((option, index) => {
          const correct = feedback?.correct_index === index;
          const wrong = feedback?.choice === index && !feedback.correct;
          return (
            <Button
              key={option}
              variant="outline"
              disabled={mutation.isPending || !!feedback}
              className={`h-auto min-h-12 justify-between whitespace-normal rounded-xl px-4 py-3 text-left disabled:opacity-100 ${correct ? "border-nature bg-nature text-nature-foreground" : wrong ? "border-destructive bg-destructive text-destructive-foreground" : ""}`}
              onClick={() => {
                setError("");
                mutation.mutate({ questionId: current.id, choice: index });
              }}
            >
              <span>{option}</span>
              {correct ? <Check /> : wrong ? <X /> : null}
            </Button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {feedback && (
        <div className="space-y-3 rounded-2xl bg-secondary p-4 text-secondary-foreground">
          <p className="font-bold">
            {feedback.correct ? `¡Correcto! +${feedback.points} puntos` : "Sigue aprendiendo"}
          </p>
          <p className="text-sm">{feedback.explanation}</p>
          <Button
            variant="lime"
            onClick={() => setFeedback(null)}
            disabled={mutation.isPending}
            className="w-full"
          >
            {current.position === questions.length ? "Ver resultado" : "Siguiente"}
            <ArrowRight />
          </Button>
        </div>
      )}
    </section>
  );
}
