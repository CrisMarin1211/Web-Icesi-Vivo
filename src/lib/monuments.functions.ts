import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { unlockSchema, type Monument } from "./monuments";

export const getMonuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("list_campus_monuments");
    if (error) throw new Error("No se pudieron cargar los monumentos.");
    return data as unknown as Monument[];
  });

export const unlockMonument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => unlockSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { data: unlocked, error } = await context.supabase.rpc("unlock_monument", {
      _monument_id: data.monumentId,
      _code: data.code,
    });
    if (error) throw new Error("No se pudo comprobar el código. Inténtalo de nuevo.");
    return { unlocked: unlocked === true };
  });
