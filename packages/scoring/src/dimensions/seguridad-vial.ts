/**
 * Dimensión: Seguridad Vial
 *
 * Evalúa infraestructura vial, transporte público y seguridad
 * en el tránsito del municipio. Indicadores:
 *   - Siniestros fatales per 100k hab (menor es mejor)
 *   - km pavimentados por km² (proxy de infraestructura)
 *   - Cobertura de transporte público (líneas/frecuencia)
 *   - km de ciclovías (movilidad sustentable)
 *
 * Fuentes: ANSV, relevamiento municipal, OSM.
 */

// ─── Input ───

export interface SeguridadVialInput {
  /** Siniestros fatales por cada 100.000 habitantes (menor es mejor) */
  siniestrosPer100k: number | null;
  /** km de calles pavimentadas por km² de superficie urbana */
  kmPavimentadoPerKm2: number | null;
  /** Índice de cobertura de transporte público: 0 = nulo, 0.5 = básico, 1.0 = bueno */
  transitoPublico: number | null;
  /** km de ciclovías */
  kmCiclovias: number | null;
}

// ─── Output ───

export interface SeguridadVialCriterionResult {
  indicador: string;
  descripcion: string;
  valorRaw: number | null;
  valorNormalizado: number;
  peso: number;
  unidad: string;
  interpretacion: string;
}

export interface SeguridadVialScoreResult {
  scoreTotal: number;
  criterios: SeguridadVialCriterionResult[];
  siniestrosPer100k: number | null;
  kmPavimentadoPerKm2: number | null;
  kmCiclovias: number | null;
}

// ─── Weights ───

const WEIGHTS = {
  siniestros: 0.35,
  pavimento: 0.25,
  transito: 0.25,
  ciclovias: 0.15,
};

// ─── Normalization ───

const NULL_DEFAULT = 0.3;

/**
 * Siniestros fatales per 100k: MENOR es MEJOR.
 * Promedio Argentina ~12/100k. < 5 excelente, 5-10 bueno, 10-15 preocupante, > 15 crítico.
 */
function scoreSiniestros(val: number | null): { norm: number; interp: string } {
  if (val == null) return { norm: NULL_DEFAULT, interp: "Sin datos" };
  if (val <= 5) return { norm: 1.0, interp: `${val.toFixed(1)}/100k — Muy baja siniestralidad` };
  if (val <= 10) return { norm: 1.0 - (val - 5) / 16.7, interp: `${val.toFixed(1)}/100k — Siniestralidad moderada` };
  if (val <= 15) return { norm: 0.4 - (val - 10) / 25, interp: `${val.toFixed(1)}/100k — Siniestralidad preocupante` };
  return { norm: Math.max(0, 0.2 - (val - 15) / 50), interp: `${val.toFixed(1)}/100k — Siniestralidad crítica` };
}

/**
 * km pavimentados / km²: densidad de infraestructura vial.
 * Varía mucho: urbano denso 5+, intermedio 1-3, rural 0.1-0.5.
 * Capped at 5 km/km² = 1.0
 */
function scorePavimento(val: number | null): { norm: number; interp: string } {
  if (val == null) return { norm: NULL_DEFAULT, interp: "Sin datos" };
  const norm = Math.min(1.0, val / 5);
  if (norm >= 0.7) return { norm, interp: `${val.toFixed(2)} km/km² — Buena cobertura vial` };
  if (norm >= 0.4) return { norm, interp: `${val.toFixed(2)} km/km² — Cobertura moderada` };
  return { norm, interp: `${val.toFixed(2)} km/km² — Baja cobertura vial` };
}

/**
 * Transporte público: 0 = sin servicio, 0.5 = básico, 1.0 = buena cobertura.
 */
function scoreTransito(val: number | null): { norm: number; interp: string } {
  if (val == null) return { norm: NULL_DEFAULT, interp: "Sin datos" };
  const norm = Math.max(0, Math.min(1, val));
  if (norm >= 0.7) return { norm, interp: "Buena cobertura de transporte público" };
  if (norm >= 0.4) return { norm, interp: "Cobertura básica de transporte público" };
  if (norm > 0) return { norm, interp: "Servicio mínimo de transporte público" };
  return { norm: 0, interp: "Sin transporte público" };
}

/**
 * Ciclovías: km absolutos.
 * > 20 km excelente para ciudades medianas, > 10 bueno, > 3 básico, 0 = nada.
 */
function scoreCiclovias(val: number | null): { norm: number; interp: string } {
  if (val == null) return { norm: NULL_DEFAULT, interp: "Sin datos" };
  if (val >= 20) return { norm: 1.0, interp: `${val.toFixed(1)} km — Red de ciclovías extensa` };
  if (val >= 10) return { norm: 0.6 + (val - 10) / 25, interp: `${val.toFixed(1)} km — Buena red de ciclovías` };
  if (val >= 3) return { norm: 0.2 + (val - 3) / 17.5, interp: `${val.toFixed(1)} km — Red incipiente` };
  if (val > 0) return { norm: val / 15, interp: `${val.toFixed(1)} km — Red mínima` };
  return { norm: 0, interp: "Sin ciclovías" };
}

// ─── Main ───

export function scoreSeguridadVial(input: SeguridadVialInput): SeguridadVialScoreResult {
  const si = scoreSiniestros(input.siniestrosPer100k);
  const pv = scorePavimento(input.kmPavimentadoPerKm2);
  const tr = scoreTransito(input.transitoPublico);
  const ci = scoreCiclovias(input.kmCiclovias);

  const criterios: SeguridadVialCriterionResult[] = [
    {
      indicador: "siniestrosPer100k",
      descripcion: "Siniestros fatales / 100k hab",
      valorRaw: input.siniestrosPer100k,
      valorNormalizado: si.norm,
      peso: WEIGHTS.siniestros,
      unidad: "siniestros/100kh",
      interpretacion: si.interp,
    },
    {
      indicador: "kmPavimentadoPerKm2",
      descripcion: "Pavimento (km/km²)",
      valorRaw: input.kmPavimentadoPerKm2,
      valorNormalizado: pv.norm,
      peso: WEIGHTS.pavimento,
      unidad: "km/km²",
      interpretacion: pv.interp,
    },
    {
      indicador: "transitoPublico",
      descripcion: "Transporte público",
      valorRaw: input.transitoPublico,
      valorNormalizado: tr.norm,
      peso: WEIGHTS.transito,
      unidad: "índice",
      interpretacion: tr.interp,
    },
    {
      indicador: "kmCiclovias",
      descripcion: "Ciclovías",
      valorRaw: input.kmCiclovias,
      valorNormalizado: ci.norm,
      peso: WEIGHTS.ciclovias,
      unidad: "km",
      interpretacion: ci.interp,
    },
  ];

  const scoreTotal =
    Math.round(
      criterios.reduce((sum, c) => sum + c.valorNormalizado * c.peso, 0) * 1000
    ) / 10;

  return {
    scoreTotal,
    criterios,
    siniestrosPer100k: input.siniestrosPer100k,
    kmPavimentadoPerKm2: input.kmPavimentadoPerKm2,
    kmCiclovias: input.kmCiclovias,
  };
}
