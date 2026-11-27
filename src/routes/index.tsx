import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, Camera, Gamepad2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SPECIES } from "@/lib/species";
import peluches from "@/assets/peluches.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ICESI VIVO — Aprende, participa y compite por la biodiversidad" },
      {
        name: "description",
        content:
          "Descubre la iguana verde, la ardilla, el pato y el guatín de la Universidad Icesi. Retos, comunidad y premios.",
      },
      { property: "og:title", content: "ICESI VIVO" },
      {
        property: "og:description",
        content: "Conviértete en guardián de la biodiversidad de la Universidad Icesi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="font-display text-xl font-extrabold">
          ICESI <span className="text-primary">VIVO</span>
        </span>
        <Button asChild variant="default" size="sm">
          <Link to="/auth">Ingresar</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-16">
        <section className="relative overflow-hidden rounded-4xl bg-hero p-7 text-primary-foreground shadow-card md:p-12">
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-1 text-xs font-bold text-lime-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Biodiversidad Icesi
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Aprende, participa, compite.
            </h1>
            <p className="mt-4 text-base opacity-90 md:text-lg">
              Conviértete en guardián de la biodiversidad: reconoce a la iguana verde, la ardilla,
              el pato y el guatín del campus.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="lime" size="lg">
                <Link to="/auth">Comenzar ahora</Link>
              </Button>
            </div>
          </div>
          <img
            src={peluches}
            alt="Peluches coleccionables de ICESI VIVO"
            width={1536}
            height={864}
            className="mt-8 w-full rounded-3xl md:absolute md:-right-24 md:bottom-0 md:mt-0 md:w-[55%] md:rounded-none md:opacity-95"
          />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Gamepad2,
              title: "Retos semanales",
              text: "Juegos que premian la precisión de tus respuestas.",
              cls: "bg-violet text-violet-foreground",
            },
            {
              icon: Camera,
              title: "Fauna que nos acompaña",
              text: "Comparte tus fotografías, siempre a distancia.",
              cls: "bg-nature text-nature-foreground",
            },
            {
              icon: Trophy,
              title: "Ranking semanal",
              text: "Gana camisetas, gorras y más del animal del mes.",
              cls: "bg-lime text-lime-foreground",
            },
          ].map(({ icon: Icon, title, text, cls }) => (
            <div key={title} className={`rounded-3xl p-6 ${cls}`}>
              <Icon className="h-7 w-7" />
              <h2 className="mt-4 text-xl font-bold">{title}</h2>
              <p className="mt-1 text-sm opacity-90">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {SPECIES.map((s) => (
            <div key={s.key} className="overflow-hidden rounded-3xl bg-card shadow-card">
              <img
                src={s.image}
                alt={s.name}
                loading="lazy"
                width={1024}
                height={1024}
                className="aspect-square w-full object-cover"
              />
              <div className="p-4">
                <h3 className="font-bold">{s.name}</h3>
                <p className="text-xs italic text-muted-foreground">{s.scientific}</p>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
