/**
 * Sprint 42A — constants extraídas de `MapPageClient` para que
 * `canonicalize.ts` (server-side) y los tests puedan importarlas sin
 * arrastrar el árbol de "use client" (useState, useMemo, next/dynamic, ...).
 *
 * Source of truth de los defaults y allowlist de métricas del `/mapa`.
 * `MapPageClient` y `canonicalize` lo importan de acá.
 */

export const DEFAULT_METRIC_A = "scoreTotal";
export const DEFAULT_METRIC_B = "scoreFiscal";

/**
 * Sprint 34/35/36 — opciones no-score con kinds especiales en ProvinceMap.
 */
export const VIAL_DENSITY_KEY = "vialDensity";
export const PESOS_POR_KM_KEY = "pesosPorKm";

export type MetricOption = { key: string; label: string };

export const METRIC_OPTIONS: MetricOption[] = [
  { key: "scoreTotal", label: "Score total" },
  { key: "scoreTransparencia", label: "Transparencia" },
  { key: "scoreFiscal", label: "Fiscal" },
  { key: "scoreNormativa", label: "Normativa" },
  { key: "scoreParticipacion", label: "Participación" },
  { key: "scoreGastoFuncion", label: "Gasto por función" },
  { key: "scoreEconomiaLocal", label: "Economía local" },
  { key: "scorePresionImpositiva", label: "Presión impositiva" },
  { key: "scoreServiciosBasicos", label: "Servicios básicos" },
  { key: "scoreEducacionSalud", label: "Educación y salud" },
  { key: "scoreConectividad", label: "Conectividad" },
  { key: "scoreEspacioPublico", label: "Espacio público" },
  { key: "scoreSeguridadVial", label: "Seguridad vial" },
  { key: VIAL_DENSITY_KEY, label: "Densidad vial rural (km/km²)" },
  { key: PESOS_POR_KM_KEY, label: "Pesos por km de red vial ($/km)" },
];

export const VALID_METRIC_KEYS = new Set(METRIC_OPTIONS.map((m) => m.key));
