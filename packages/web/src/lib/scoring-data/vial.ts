import { MUNICIPIOS, type RedVialMunicipal } from "@radar-municipal/core";

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

/**
 * Sprint 34 — Densidad vial rural por partido para el heatmap `/mapa`.
 *
 * Devuelve `kmRuralEstimado / superficieKm2` (km de camino rural por km²
 * de superficie). 102 partidos del Interior + Costa Atlántica tienen
 * cobertura post-Sprint-31; el resto sale `score: null` y aparece gris.
 *
 * Mismo shape que `getAllMunicipiosForMap` para reusar `ProvinceMap` sin
 * branching de tipos — el componente decide la paleta de colores con el
 * prop `metricKind`.
 */
export function getAllMunicipiosForVialDensity(): {
  id: string;
  nombre: string;
  score: number | null;
  region: string;
  esPiloto: boolean;
}[] {
  return MUNICIPIOS.map((m) => {
    const v = byMunicipio.get(m.id);
    const density =
      v && m.superficieKm2 && v.kmRuralEstimado > 0
        ? v.kmRuralEstimado / m.superficieKm2
        : null;
    return {
      id: m.id,
      nombre: m.nombre,
      score: density,
      region: m.region,
      esPiloto: m.esPiloto,
    };
  });
}
