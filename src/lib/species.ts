import iguana from "@/assets/iguana.jpg";
import ardilla from "@/assets/ardilla.jpg";
import pato from "@/assets/pato.jpg";
import guatin from "@/assets/guatin.jpg";

export type SpeciesKey = "iguana" | "ardilla" | "pato" | "guatin";

export interface Species {
  key: SpeciesKey;
  name: string;
  scientific: string;
  image: string;
  plushPos: string; // object-position in plush group image
  short: string;
  diet: string;
  habitat: string;
  traits: string[];
  care: string;
  tone: "nature" | "primary" | "violet" | "lime";
}

export const SPECIES: Species[] = [
  {
    key: "iguana",
    name: "Iguana verde",
    scientific: "Iguana iguana",
    image: iguana,
    plushPos: "4% 50%",
    short: "Reptil herbívoro que toma el sol en ramas y muros del campus.",
    diet: "Hojas, flores y frutos.",
    habitat: "Árboles cercanos a zonas de agua y jardines soleados.",
    traits: ["Cresta de espinas en el lomo", "Papada bajo el cuello", "Cola larga que puede regenerar"],
    care: "Rodéala dejando espacio: tomar el sol es vital para regular su temperatura.",
    tone: "nature",
  },
  {
    key: "ardilla",
    name: "Ardilla",
    scientific: "Notosciurus granatensis",
    image: ardilla,
    plushPos: "36% 50%",
    short: "Ágil acróbata diurna de cola rojiza y esponjosa.",
    diet: "Frutos, semillas y nueces.",
    habitat: "Copas de los árboles; baja al suelo a buscar alimento.",
    traits: ["Cola esponjosa que da equilibrio", "Activa de día", "Dientes que crecen toda la vida"],
    care: "No la alimentes: la comida humana la enferma y la vuelve dependiente.",
    tone: "violet",
  },
  {
    key: "pato",
    name: "Pato",
    scientific: "Anatidae",
    image: pato,
    plushPos: "64% 50%",
    short: "Ave acuática que habita los lagos y humedales del campus.",
    diet: "Plantas acuáticas, semillas e invertebrados.",
    habitat: "Lagos, orillas y zonas húmedas.",
    traits: ["Patas palmeadas", "Plumas impermeables por un aceite natural", "Pico plano"],
    care: "Nunca le des pan: no lo nutre y contamina el agua.",
    tone: "primary",
  },
  {
    key: "guatin",
    name: "Guatín",
    scientific: "Dasyprocta punctata",
    image: guatin,
    plushPos: "96% 50%",
    short: "Roedor tímido, jardinero del bosque que siembra semillas.",
    diet: "Frutos y semillas caídas.",
    habitat: "Zonas boscosas y bordes de jardín.",
    traits: ["Patas delgadas y veloces", "Cola casi imperceptible", "Entierra semillas como reserva"],
    care: "Obsérvalo en silencio y a distancia: se estresa con facilidad.",
    tone: "lime",
  },
];

export const speciesByKey = Object.fromEntries(SPECIES.map((s) => [s.key, s])) as Record<SpeciesKey, Species>;

export const toneClasses: Record<Species["tone"], string> = {
  nature: "bg-nature text-nature-foreground",
  primary: "bg-primary text-primary-foreground",
  violet: "bg-violet text-violet-foreground",
  lime: "bg-lime text-lime-foreground",
};
