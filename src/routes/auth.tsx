import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/inicio" });
  },
  head: () => ({
    meta: [
      { title: "Ingresar — ICESI VIVO" },
      { name: "description", content: "Crea tu cuenta o inicia sesión en ICESI VIVO." },
      { property: "og:title", content: "Ingresar — ICESI VIVO" },
      { property: "og:description", content: "Únete a la comunidad de guardianes de la biodiversidad Icesi." },
    ],
  }),
  component: AuthPage,
});

const INSTITUTIONAL = /@([a-z0-9-]+\.)*icesi\.edu\.co$/i;

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!INSTITUTIONAL.test(email)) throw new Error("Usa tu correo institucional (@icesi.edu.co)");
        if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/inicio", data: { display_name: name, username } },
        });
        if (error) throw error;
        setSent("Revisa tu correo para confirmar tu cuenta y luego inicia sesión.");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Correo o contraseña incorrectos");
        navigate({ to: "/inicio" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        setSent("Te enviamos un enlace para restablecer tu contraseña.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-hero p-12 text-primary-foreground md:flex md:flex-col md:justify-between">
        <span className="font-display text-2xl font-extrabold">ICESI VIVO</span>
        <div>
          <h1 className="text-5xl font-extrabold leading-tight">Conviértete en guardián de la biodiversidad.</h1>
          <p className="mt-4 max-w-md opacity-90">Aprende, participa y compite por un peluche coleccionable cada quincena.</p>
        </div>
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lime/90 blur-2xl opacity-40" />
      </div>
      <div className="flex items-center justify-center p-5">
        <div className="w-full max-w-md">
          <div className="mb-6 rounded-4xl bg-hero p-6 text-primary-foreground md:hidden">
            <Sparkles className="h-6 w-6 text-lime" />
            <h1 className="mt-2 text-3xl font-extrabold">ICESI VIVO</h1>
            <p className="text-sm opacity-90">Aprende, participa, compite.</p>
          </div>
          <h2 className="text-3xl font-extrabold">
            {mode === "login" ? "¡Hola de nuevo!" : mode === "signup" ? "Crea tu cuenta" : "Recupera tu contraseña"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "Solo con correo institucional Icesi." : mode === "login" ? "Ingresa para seguir sumando puntos." : "Te enviaremos un enlace a tu correo."}
          </p>

          {sent ? (
            <div className="mt-6 rounded-3xl bg-nature p-5 text-nature-foreground">
              <p className="font-semibold">{sent}</p>
              <Button variant="glass" className="mt-4" onClick={() => { setSent(null); setMode("login"); }}>Volver a ingresar</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  <div className="space-y-1.5"><Label htmlFor="name">Nombre</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-2xl bg-card" /></div>
                  <div className="space-y-1.5"><Label htmlFor="username">Seudónimo</Label><Input id="username" required pattern="[A-Za-z0-9_]{3,20}" title="3-20 letras, números o _" value={username} onChange={(e) => setUsername(e.target.value)} className="h-12 rounded-2xl bg-card" /></div>
                </>
              )}
              <div className="space-y-1.5"><Label htmlFor="email">Correo institucional</Label><Input id="email" type="email" required placeholder="tu.nombre@u.icesi.edu.co" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-2xl bg-card" /></div>
              {mode !== "forgot" && (
                <div className="space-y-1.5"><Label htmlFor="password">Contraseña</Label><Input id="password" type="password" required minLength={mode === "signup" ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-2xl bg-card" /></div>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Un momento…" : mode === "login" ? "Ingresar" : mode === "signup" ? "Crear cuenta" : "Enviar enlace"}
              </Button>
            </form>
          )}

          <div className="mt-6 flex flex-col items-center gap-2 text-sm">
            {mode === "login" && <button className="text-muted-foreground hover:text-primary" onClick={() => setMode("forgot")}>¿Olvidaste tu contraseña?</button>}
            {mode !== "signup" ? (
              <button className="font-semibold text-primary" onClick={() => setMode("signup")}>¿No tienes cuenta? Regístrate</button>
            ) : (
              <button className="font-semibold text-primary" onClick={() => setMode("login")}>Ya tengo cuenta</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
