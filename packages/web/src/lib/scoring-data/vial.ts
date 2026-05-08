import type { RedVialMunicipal } from "@radar-municipal/core";

import autoVialJson from "../../data/auto-vial.json";

const allVial = autoVialJson as unknown as RedVialMunicipal[];

const byMunicipio = new Map<string, RedVialMunicipal>();
for (const v of allVial) byMunicipio.set(v.municipioId, v);

/**
 * Sprint 30 — Devuelve la red vial estimada de un partido (datos OSM).
 * Null si no se ingestó todavía (Sprint 30 cubre 10 partidos sample;
 * Sprint 31+ extiende a los ~80 rurales no-conurbano).
 */
export function getRedVialByMunicipio(
  municipioId: string,
): RedVialMunicipal | null {
  return byMunicipio.get(municipioId) ?? null;
}

export function getAllRedVial(): RedVialMunicipal[] {
  return [...allVial];
}
