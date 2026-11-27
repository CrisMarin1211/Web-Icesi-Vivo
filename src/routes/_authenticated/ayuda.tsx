import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, Eye, Mail, MapPin, Phone } from "lucide-react";


import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

import { ChevronDown } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

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

// Preguntas y respuestas sobre el cuidado de la fauna.
const casosAyuda = [
  {
    pregunta: "Veo un animal herido",
    tituloRespuesta: "¿Qué debo hacer?",
    respuesta:
      "No lo toques ni le des comida o agua. Mantén una distancia prudente y avisa a la Oficina de Sostenibilidad Ambiental.",
  },
  {
    pregunta: "Una cría cayó o está sola",
    tituloRespuesta: "¿Cómo debo actuar?",
    respuesta:
      "Estar sola no siempre significa abandono. Si no tiene heridas visibles, observa desde lejos y evita rodearla. Consulta a la Oficina de Sostenibilidad Ambiental antes de moverla.",
  },

  // Agrega más casos aquí siguiendo esta misma estructura.
];

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
        <a href={`tel:${SOMA_PHONE}`} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground"><Phone className="h-4 w-4" /> Pedir ayuda a la Oficina de Sostenibilidad Ambiental</a>
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
        <p className="text-sm text-muted-foreground">La Oficina de Sostenibilidad Ambiental orienta el cuidado animal en Icesi.</p>
        <div className="mt-3 space-y-2 text-sm">
          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> <a href={`tel:${SOMA_PHONE}`} className="font-semibold text-primary">{SOMA_PHONE_LABEL}</a></p>
          <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> <a href={`mailto:${SOMA_EMAIL}`} className="font-semibold text-primary break-all">{SOMA_EMAIL}</a></p>
          <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 text-primary" /> Punto de atención en el campus (EDIFICIO K)</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a href={`mailto:${SOMA_EMAIL}`} className="rounded-full bg-primary py-2.5 text-center font-semibold text-primary-foreground">Contactar</a>
          <Dialog>
  <DialogTrigger asChild>
    <button
      type="button"
      className="flex items-center justify-center gap-1 rounded-full bg-secondary py-2.5 font-semibold text-primary"
    >
      Ver ubicación
      <ArrowUpRight className="h-4 w-4" />
    </button>
  </DialogTrigger>

  <DialogContent className="max-w-sm overflow-hidden rounded-3xl p-0">
    <div className="space-y-4 p-5">
      <DialogHeader>
        <DialogTitle className="text-xl font-extrabold">
          Edificio K
        </DialogTitle>

        <DialogDescription>
          Oficina de Sostenibilidad Ambiental
        </DialogDescription>
      </DialogHeader>

      <img
        src="/edificiok.png"
        alt="Edificio K de la Universidad Icesi"
        className="h-52 w-full rounded-2xl object-cover"
      />

      <p className="text-sm text-muted-foreground">
        Frente a la cancha de tennis y junto al edificio L, puedes encontrar en la Oficina de
        Sostenibilidad Ambiental, ubicada en el primer piso del edificio K.
      </p>

      <a
        href={SOMA_MAP}
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground"
      >
        Cómo llegar
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </div>
  </DialogContent>
</Dialog>
        </div>


      </section>

       <p className="rounded-2xl  p-4 text-sm text-primary">Comparte la ubicación y una foto, sin acercarte.</p>

     <h2 className="pt-2 text-2xl font-extrabold">
  ¿Qué hacer en estos casos?
</h2>

<p className="-mt-3 text-sm text-muted-foreground">
  Observa primero. Actúa con orientación.
</p>

<section className="space-y-3 rounded-3xl bg-card p-5 shadow-card">
  {casosAyuda.map((caso, index) => (
    <Collapsible key={index} className="overflow-hidden rounded-2xl bg-muted">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="font-bold">
          {caso.pregunta}
        </span>

        <ChevronDown className="h-5 w-5 shrink-0 text-primary transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4">
        <div className="border-t border-border pt-3">
          <h3 className="mb-1 font-bold text-primary">
            {caso.tituloRespuesta}
          </h3>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {caso.respuesta}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  ))}

  <a
    href={`mailto:${SOMA_EMAIL}`}
    className="flex items-center gap-1 pt-2 text-sm font-semibold text-primary"
  >
    ¿Tienes alguna duda? Consulta a la Oficina de Sostenibilidad Ambiental
    <ArrowRight className="h-4 w-4" />
  </a>
</section>


    </div>
  );
}
