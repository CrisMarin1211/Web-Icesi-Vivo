import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nueva contraseña — ICESI VIVO" },
      { name: "description", content: "Define una nueva contraseña para tu cuenta ICESI VIVO." },
      { property: "og:title", content: "Nueva contraseña — ICESI VIVO" },
      { property: "og:description", content: "Restablece tu contraseña." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Mínimo 8 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada");
    navigate({ to: "/inicio" });
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-4xl bg-card p-7 shadow-card"
      >
        <h1 className="text-2xl font-extrabold">Nueva contraseña</h1>
        <Input
          type="password"
          required
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 rounded-2xl"
        />
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          Guardar
        </Button>
      </form>
    </div>
  );
}
