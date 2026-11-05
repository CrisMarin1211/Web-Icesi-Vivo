import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      return {
        user: u.user,
        profile,
        isAdmin: !!roles?.some((r) => r.role === "admin"),
      };
    },
  });
}

export function useCycle() {
  return useQuery({
    queryKey: ["cycle"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ensure_cycle");
      if (error) throw error;
      return data as unknown as { id: string; starts_at: string; ends_at: string; prize_species: string };
    },
  });
}

export interface LeaderRow {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  total: number;
  correct: number;
  accuracy: number;
  completed: number;
  points: number;
  eligible: boolean;
  rank: number;
}

export function useLeaderboard(cycleId?: string) {
  return useQuery({
    queryKey: ["leaderboard", cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("leaderboard", { _cycle: cycleId! });
      if (error) throw error;
      return (data ?? []) as LeaderRow[];
    },
  });
}

export function useMyAnswers() {
  return useQuery({
    queryKey: ["my-answers"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("answers")
        .select("question_id, week_start, is_correct, points, questions(challenge_key, species)")
        .eq("user_id", u.user!.id);
      const { data: mem } = await supabase.from("memory_results").select("*").eq("user_id", u.user!.id);
      return { answers: data ?? [], memory: mem ?? [] };
    },
  });
}

export const MIN_ANSWERS = 15;
export const MIN_CHALLENGES = 3;
