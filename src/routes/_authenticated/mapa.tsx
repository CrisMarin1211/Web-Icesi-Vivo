import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, LockKeyhole, ArrowRight, Check, Trees, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SPECIES, speciesByKey } from "@/lib/species";
import { getMonuments, unlockMonument } from "@/lib/monuments.functions";
import { isLocated, unlockSchema } from "@/lib/monuments";
import { MonumentQuiz } from "@/components/MonumentQuiz";

const CampusMap = lazy(() => import("@/components/CampusMap"));
const monumentsQuery = queryOptions({ queryKey: ["campus-monuments"], queryFn: () => getMonuments() });

export const Route = createFileRoute("/_authenticated/mapa")({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(monumentsQuery); },
  head: () => ({ meta: [
    { title: "Mapa del campus — ICESI VIVO" },
    { name: "description", content: "Descubre los monumentos de la fauna de Icesi y participa en sus actividades educativas." },
    { property: "og:title", content: "Mapa del campus — ICESI VIVO" },
    { property: "og:description", content: "Los monumentos de iguana, ardilla, pato y guatín en el campus de Icesi." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MapPage,
});

function MapPage() {
  const { data: monuments } = useSuspenseQuery(monumentsQuery);
  const [selected, setSelected] = useState("iguana");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const unlock = useServerFn(unlockMonument);
  const mutation = useMutation({ mutationFn: unlock, onSuccess: async (result) => {
    if (!result.unlocked) { setError("El código no corresponde a este monumento."); return; }
    setCode(""); setError("");
    await qc.invalidateQueries({ queryKey: monumentsQuery.queryKey });
  }, onError: () => setError("No se pudo comprobar el código. Inténtalo de nuevo.") });
  const monument = monuments.find((m) => m.id === selected);
  const species = speciesByKey[monument?.species ?? "iguana"];
  const located = monuments.filter(isLocated).length;
  function select(id: string) { setSelected(id); setError(""); setCode(""); }

  return (
    <div className="space-y-5">
      <header>
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-primary"><MapPin className="h-3.5 w-3.5" /> UNIVERSIDAD ICESI</p>
        <h1 className="text-3xl font-extrabold">Mapa del campus</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monumentos de nuestra fauna · No son ubicaciones de animales en vivo.</p>
      </header>
      <ClientOnly fallback={<MapSkeleton />}><Suspense fallback={<MapSkeleton />}>
        <CampusMap monuments={monuments} selected={selected} onSelect={select} />
      </Suspense></ClientOnly>
      {located < monuments.length && <p className="flex gap-2 text-xs text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{located === 0 ? "Ubicaciones de los monumentos pendientes de confirmación." : "Algunos monumentos aún no tienen ubicación confirmada."}</p>}
      <div className="grid grid-cols-4 gap-2" aria-label="Monumentos del campus">
        {SPECIES.map((s) => {
          const m = monuments.find((item) => item.species === s.key);
          return <Button key={s.key} variant={selected === s.key ? "default" : "outline"} onClick={() => select(s.key)}
            aria-pressed={selected === s.key} className="h-auto min-w-0 flex-col gap-1.5 rounded-2xl px-1 py-3">
            <img src={s.image} alt="" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-xs">{s.key === "iguana" ? "Iguana" : s.name}</span>
            <span className={`flex items-center gap-1 text-[10px] ${selected === s.key ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{m?.unlocked ? <Check className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}{m?.unlocked ? "Disponible" : "Por descubrir"}</span>
          </Button>;
        })}
      </div>
      <article className="overflow-hidden rounded-3xl bg-card shadow-card">
        <div className="grid sm:grid-cols-[180px_1fr]">
          <img src={species.image} alt={species.name} className="h-44 w-full object-cover sm:h-full" />
          <div className="space-y-3 p-5">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"><MapPin className="h-3 w-3" />{monument?.label ?? "Monumento"}</span>
            <div><h2 className="text-2xl font-extrabold">{species.name}</h2><p className="text-xs italic text-muted-foreground">{species.scientific}</p></div>
            <p className="text-sm text-muted-foreground">{species.short}</p>
            <p className="text-sm">{species.traits.join(" · ")}</p>
          </div>
        </div>
        <div className="space-y-4 p-5 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="text-sm"><Utensils className="mb-1 h-4 w-4 text-primary" /><span className="font-semibold">Alimentación</span><br />{species.diet}</p>
            <p className="text-sm"><Trees className="mb-1 h-4 w-4 text-nature" /><span className="font-semibold">Hábitat</span><br />{species.habitat}</p>
          </div>
          <p className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">{species.care}</p>
          <div className="border-t pt-4">
            <h3 className="flex items-center gap-2 font-bold"><LockKeyhole className="h-4 w-4 text-primary" />Actividad del monumento</h3>
            {monument?.unlocked ? <MonumentQuiz key={selected} monumentId={selected} /> : <form className="mt-3 space-y-2" onSubmit={(event) => {
              event.preventDefault();
              const parsed = unlockSchema.safeParse({ monumentId: selected, code });
              if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Revisa el código."); return; }
              setError(""); mutation.mutate({ data: parsed.data });
            }}>
              <label htmlFor="monument-code" className="text-sm font-medium">Código del monumento</label>
              <div className="flex gap-2">
                <input id="monument-code" value={code} onChange={(event) => setCode(event.target.value)} maxLength={32} autoCapitalize="characters" autoComplete="off" placeholder="Código del panel" disabled={!monument?.code_ready || mutation.isPending}
                  className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" aria-describedby="code-status" />
                <Button variant="lime" type="submit" disabled={!monument?.code_ready || mutation.isPending} className="h-12 shrink-0 px-4">{mutation.isPending ? "Verificando…" : "Abrir"}<ArrowRight /></Button>
              </div>
              <p id="code-status" className="text-xs text-muted-foreground">{monument?.code_ready ? "3 preguntas · Hasta 30 puntos esta semana" : "Código del panel pendiente de confirmación."}</p>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            </form>}
          </div>
        </div>
      </article>
    </div>
  );
}

function MapSkeleton() { return <div className="h-[330px] animate-pulse rounded-3xl bg-muted md:h-[420px]" />; }