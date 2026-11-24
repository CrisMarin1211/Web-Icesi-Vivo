import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, Eye, Mail, MapPin, Phone } from "lucide-react";

// Datos de contacto de la Oficina de Sostenibilidad Ambiental (SOMA).
const SOMA_PHONE = "+573222736191";
const SOMA_PHONE_LABEL = "Cel. +57 322 2736191";
const SOMA_EMAIL = "sambiental@icesi.edu.co";
const SOMA_MAP = "https://www.google.com/maps/search/?api=1&query=Universidad+Icesi+Cali";

export const Route = createFileRoute("/_authenticated/ayuda")({
  head: () => ({
    meta: [
      { title: "Ayuda animal — ICESI VIVO" },
      { name: "description", content: "Qué hacer si encuentras un animal herido o en peligro en el campus de Icesi." },
      { property: "og:title", content: "Ayuda animal — ICESI VIVO" },
      { property: "og:description", content: "Contacta a la Oficina de Sostenibilidad Ambiental e informa riesgos para la fauna." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AyudaAnimal,
});

function AyudaAnimal() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.history.back()} aria-label="Volver" className="text-primary"><ArrowLeft className="h-6 w-6" /></button>
        <h1 className="text-3xl font-extrabold">Ayuda animal</h1>
      </div>
      <p className="text-muted-foreground">Cuidemos a nuestros vecinos del campus.</p>

      <section className="rounded-3xl bg-destructive/10 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-destructive"><AlertTriangle className="h-6 w-6" /> Animal en peligro urgente</h2>
        <p className="mt-1 text-sm text-destructive">Si sangra, está atrapado o corre un riesgo inmediato, pide ayuda. Mantén la distancia.</p>
        <a href={`tel:${SOMA_PHONE}`} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground"><Phone className="h-4 w-4" /> Pedir ayuda a SOMA</a>
        <p className="mt-2 text-center text-sm font-semibold text-destructive">{SOMA_PHONE_LABEL}</p>
      </section>

      <a href={`mailto:${SOMA_EMAIL}?subject=Reporte%20de%20riesgo%20para%20la%20fauna`} className="flex items-center gap-4 rounded-3xl bg-card p-5 shadow-card">
        <AlertTriangle className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h2 className="font-bold">Informar riesgos</h2>
          <p className="text-sm text-muted-foreground">Vidrios, residuos o zonas peligrosas</p>
        </div>
        <ChevronRight className="h-5 w-5 text-primary" />
      </a>

      <section className="rounded-3xl bg-card p-5 shadow-card">
        <h2 className="text-xl font-bold">Contactar a la Oficina de Sostenibilidad Ambiental</h2>
        <p className="text-sm text-muted-foreground">SOMA orienta el cuidado animal en Icesi.</p>
        <div className="mt-3 space-y-2 text-sm">
          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> <a href={`tel:${SOMA_PHONE}`} className="font-semibold text-primary">{SOMA_PHONE_LABEL}</a></p>
          <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> <a href={`mailto:${SOMA_EMAIL}`} className="font-semibold text-primary break-all">{SOMA_EMAIL}</a></p>
          <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 text-primary" /> Punto de atención en el campus</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a href={`mailto:${SOMA_EMAIL}`} className="rounded-full bg-primary py-2.5 text-center font-semibold text-primary-foreground">Contactar SOMA</a>
          <a href={SOMA_MAP} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-full bg-secondary py-2.5 font-semibold text-primary">Ver ubicación <ArrowUpRight className="h-4 w-4" /></a>
        </div>
      </section>

      <h2 className="pt-2 text-2xl font-extrabold">¿Qué hacer en estos casos?</h2>
      <p className="-mt-3 text-sm text-muted-foreground">Observa primero. Actúa con orientación.</p>
      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-card">
        <div className="rounded-2xl bg-muted p-4">
          <h3 className="flex items-center gap-2 font-bold"><AlertTriangle className="h-5 w-5 text-primary" /> Veo un animal herido</h3>
          <p className="mt-1 text-sm text-muted-foreground">No lo toques ni le des comida o agua. Avisa a SOMA.</p>
        </div>
        <div className="rounded-2xl bg-secondary p-4">
          <h3 className="flex items-center gap-2 font-bold"><Eye className="h-5 w-5 text-primary" /> Una cría cayó o está sola</h3>
          <p className="mt-1 text-sm text-muted-foreground">Estar sola no siempre significa abandono. Sin heridas visibles: observa de lejos y evita rodearla. Consulta a SOMA antes de moverla.</p>
        </div>
        <a href={`mailto:${SOMA_EMAIL}`} className="flex items-center gap-1 text-sm font-semibold text-primary">¿No sabes qué hacer? Consulta a SOMA <ArrowRight className="h-4 w-4" /></a>
      </section>

      <p className="rounded-2xl bg-secondary p-4 text-sm text-primary">Comparte la ubicación y una foto, sin acercarte.</p>
      <Link to="/especies" className="block text-center text-sm text-muted-foreground underline">Conoce más sobre las especies</Link>
    </div>
  );
}
