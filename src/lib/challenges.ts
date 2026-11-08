import type { SpeciesKey } from "./species";

export type ChallengeKey = "quien" | "mito" | "detectives" | "harias" | "memoria" | "relampago";

export interface Challenge {
  key: ChallengeKey;
  number: number;
  name: string;
  description: string;
  instructions: string;
  count: number;
  species: SpeciesKey;
  tone: "primary" | "violet" | "nature" | "lime";
  timed?: boolean;
}

export const CHALLENGES: Challenge[] = [
  { key: "quien", number: 1, name: "¿Quién es quién?", description: "Identifica las especies a partir de fotografías reales.", instructions: "Observa cada fotografía y elige la especie correcta. Cada acierto suma 10 puntos.", count: 5, species: "iguana", tone: "primary" },
  { key: "mito", number: 2, name: "Mito o realidad", description: "Afirmaciones sobre alimentación y comportamiento.", instructions: "Lee cada afirmación y decide si es mito o realidad.", count: 5, species: "pato", tone: "violet" },
  { key: "detectives", number: 3, name: "Detectives de la fauna", description: "Relaciona cada especie con sus rasgos y su hábitat.", instructions: "Descubre qué especie corresponde a cada pista.", count: 5, species: "ardilla", tone: "nature" },
  { key: "harias", number: 4, name: "¿Qué harías tú?", description: "Situaciones cotidianas de convivencia con la fauna.", instructions: "Elige la acción más responsable en cada situación.", count: 5, species: "guatin", tone: "lime" },
  { key: "memoria", number: 5, name: "Memoria silvestre", description: "Encuentra las parejas de fotografías de las especies.", instructions: "Voltea dos cartas a la vez. Menos movimientos = más puntos (máx. 40).", count: 8, species: "ardilla", tone: "violet" },
  { key: "relampago", number: 6, name: "Desafío relámpago", description: "Cinco preguntas en el menor tiempo posible.", instructions: "Tienes 15 segundos por pregunta. Si se acaba el tiempo, cuenta como incorrecta.", count: 5, species: "pato", tone: "primary", timed: true },
];

export const challengeByKey = Object.fromEntries(CHALLENGES.map((c) => [c.key, c])) as Record<ChallengeKey, Challenge>;

/** Monday 00:00 (Bogotá, UTC-5) of the current week, as Date. */
export function weekStart(now = new Date()): Date {
  const bogota = new Date(now.getTime() - 5 * 3600_000);
  const day = (bogota.getUTCDay() + 6) % 7;
  const monday = Date.UTC(bogota.getUTCFullYear(), bogota.getUTCMonth(), bogota.getUTCDate() - day);
  return new Date(monday + 5 * 3600_000);
}

export function weekStartISO(now = new Date()): string {
  const d = new Date(weekStart(now).getTime() - 5 * 3600_000);
  return d.toISOString().slice(0, 10);
}

/** Featured challenge rotates every week. */
export function featuredChallenge(now = new Date()): Challenge {
  const weekIndex = Math.floor(weekStart(now).getTime() / (7 * 86400_000));
  return CHALLENGES[((weekIndex % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length]!;
}

export function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" });
}
