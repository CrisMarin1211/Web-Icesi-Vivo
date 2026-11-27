import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  Map,
  Gamepad2,
  BookImage,
  Users,
  User,
  LogOut,
  Shield,
  HeartHandshake,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/data";
import { Avatar } from "@/lib/media";

const NAV = [
  { to: "/inicio", label: "Inicio", icon: Home },
  { to: "/mapa", label: "Mapa", icon: Map },
  { to: "/retos", label: "Retos", icon: Gamepad2 },
  { to: "/album", label: "Álbum", icon: BookImage },
  { to: "/comunidad", label: "Comunidad", icon: Users },
  { to: "/ayuda", label: "Ayuda", icon: HeartHandshake },
] as const;

export function AppShell() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen md:flex">
      {/* BARRA LATERAL PC */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 border-r bg-card p-5 md:flex">
        <Link to="/inicio" className="mb-6 flex items-center gap-2">
          <span className="font-display text-xl font-extrabold tracking-tight">
            ICESI <span className="text-primary">VIVO</span>
          </span>
        </Link>

        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
            activeProps={{
              className:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            }}
          >
            <Icon className="h-5 w-5" /> {label}
          </Link>
        ))}

        {me?.isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary"
            activeProps={{ className: "bg-primary text-primary-foreground" }}
          >
            <Shield className="h-5 w-5" /> Moderación
          </Link>
        )}

        <button
          onClick={signOut}
          className="mt-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary"
        >
          <LogOut className="h-5 w-5" /> Cerrar sesión
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
        {/* ENCABEZADO SUPERIOR: PC Y MÓVIL */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur">
          <Link to="/inicio" className="font-display text-lg font-extrabold">
            ICESI <span className="text-primary">VIVO</span>
          </Link>

          <div className="flex items-center gap-3">
            {me?.isAdmin && (
              <Link
                to="/admin"
                aria-label="Moderación"
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground"
              >
                <Shield className="h-4 w-4" />
              </Link>
            )}

            <Link
              to="/perfil"
              aria-label="Mi perfil"
              className="rounded-full transition-transform hover:scale-105"
            >
              <Avatar
                path={me?.profile?.avatar_url}
                name={me?.profile?.display_name}
                className="h-9 w-9 text-xs"
              />
            </Link>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      {/* NAVEGACIÓN INFERIOR MÓVIL */}
      <nav
        className="fixed inset-x-2 bottom-2 z-40 flex justify-between rounded-3xl bg-foreground px-1.5 py-1.5 shadow-card md:hidden"
        style={{
          paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))",
        }}
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[9px] font-medium text-background/60"
            activeProps={{
              className: "bg-lime text-lime-foreground",
            }}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
