import { z } from "zod";
import type { SpeciesKey } from "./species";

export interface Monument {
  id: string;
  species: SpeciesKey;
  label: string;
  latitude: number | null;
  longitude: number | null;
  code_ready: boolean;
  unlocked: boolean;
}

// Campus centroid and bounds: OpenStreetMap relation 6784907.
export const CAMPUS_CENTER: [number, number] = [3.3408806, -76.5291786];
export const CAMPUS_BOUNDS: [[number, number], [number, number]] = [
  [3.3385876, -76.5311915], [3.3433883, -76.5272443],
];
export const unlockSchema = z.object({
  monumentId: z.enum(["iguana", "ardilla", "pato", "guatin"]),
  code: z.string().trim().min(3, "Escribe el código del monumento.").max(32)
    .regex(/^[a-zA-Z0-9-]+$/, "Usa solo letras, números y guiones.")
    .transform((code) => code.toUpperCase()),
});

export function isLocated(m: Monument): m is Monument & { latitude: number; longitude: number } {
  return m.latitude !== null && m.longitude !== null && Number.isFinite(m.latitude)
    && Number.isFinite(m.longitude) && Math.abs(m.latitude) <= 90 && Math.abs(m.longitude) <= 180;
}