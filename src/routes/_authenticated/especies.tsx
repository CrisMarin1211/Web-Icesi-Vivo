import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Utensils, Trees, HeartHandshake } from "lucide-react";
import { SPECIES, toneClasses } from "@/lib/species";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/especies")({
  head: () => ({ meta: [{ title: "Explorar especies — ICESI VIVO" }, { name: "description", content: "Conoce a la iguana verde, la ardilla, el pato y el guatín del campus." }] }),
  component: Especies,
});

function Especies() {
  const [active, setActive] = useState(SPECIES[0].key);
  const s = SPECIES.find((x) => x.key === active)!;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Explorar especies</h1>
        <p className="text-sm text-muted-foreground">Aprende a reconocerlas. Responde bien en los retos para desbloquearlas en tu álbum.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SPECIES.map((x) => (
          <button key={x.key} onClick={() => setActive(x.key)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active === x.key ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>
            {x.name}
          </button>
        ))}
      </div>
      <article key={s.key} className="grid animate-pop overflow-hidden rounded-4xl bg-card shadow-card md:grid-cols-2">
        <img src={s.image} alt={s.name} width={1024} height={1024} className="aspect-square w-full object-cover" />
        <div className="space-y-4 p-6">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${toneClasses[s.tone]}`}>{s.scientific}</span>
          <h2 className="text-3xl font-extrabold">{s.name}</h2>
          <p className="text-muted-foreground">{s.short}</p>
          <div className="grid gap-3">
            <Fact icon={Utensils} label="Alimentación" text={s.diet} />
            <Fact icon={Trees} label="Hábitat" text={s.habitat} />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Cómo reconocerla</p>
            <ul className="flex flex-wrap gap-2">
              {s.traits.map((t) => <li key={t} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{t}</li>)}
            </ul>
          </div>
          <div className="flex gap-3 rounded-3xl bg-nature p-4 text-nature-foreground">
            <HeartHandshake className="h-5 w-5 shrink-0" />
            <p className="text-sm">{s.care}</p>
          </div>
          <Button asChild variant="lime"><Link to="/retos">Ponme a prueba</Link></Button>
        </div>
      </article>
    </div>
  );
}

function Fact({ icon: Icon, label, text }: { icon: typeof Utensils; label: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-muted p-3">
      <Icon className="h-5 w-5 shrink-0 text-primary" />
      <div><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="text-sm">{text}</p></div>
    </div>
  );
}
