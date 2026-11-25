import { describe, expect, it } from "vitest";
import { isLocated, unlockSchema, type Monument } from "@/lib/monuments";

describe("Monument access", () => {
  it("requires a monument code instead of accepting empty input", () => {
    expect(unlockSchema.safeParse({ monumentId: "iguana", code: "" }).success).toBe(false);
    expect(unlockSchema.parse({ monumentId: "iguana", code: "iv-01" }).code).toBe("IV-01");
  });
  it("does not turn unconfirmed positions into map markers", () => {
    const m: Monument = { id: "iguana", species: "iguana", label: "Punto 1", latitude: null, longitude: null, code_ready: false, unlocked: false };
    expect(isLocated(m)).toBe(false);
    expect(isLocated({ ...m, latitude: 3.34, longitude: -76.53 })).toBe(true);
    expect(isLocated({ ...m, latitude: 100, longitude: -76.53 })).toBe(false);
  });
});