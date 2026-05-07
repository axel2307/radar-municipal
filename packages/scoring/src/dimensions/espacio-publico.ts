/**
 * Dimensión: Espacio Público y Ambiente
 *
 * Evalúa calidad ambiental y disponibilidad de espacio público:
 *   - Espacio verde per cápita (m²/hab — OMS recomienda 10-15 m²/hab)
 *   - Cobertura de arbolado urbano (% estimado)
 *   - Programa de separación de residuos en origen (0/0.5/1.0)
 *   - Incidentes ambientales reportados (menor es mejor)
 *
 * Fuentes: OPDS, Global Forest Watch, relevamiento municipal, OSM.
 */

// ─── Input ───

export interface EspacioPublicoInput {
  /** m² de espacio verde por habitante */
  espacioVerdePcapita: number | null;
  /** % estimado de cobertura de arbolado urbano */
  coberturaArbolado: number | null;
  /** 0 = no tiene, 0.5 = programa parcial, 1.0 = programa consolidado */
  separacionResiduos: number | null;
  /** Cantidad de incidentes ambientales reportados en el año (menor es mejor) */
  incidentesAmbientales: number | null;
}

// ─── Output ───

export interface EspacioPublicoCriterionResult {
  indicador: string;
  descripcion: string;
  valorRaw: number | null;
  valorNormalizado: number;
  peso: number;
  unidad: string;
  interpretacion: string;
}

export interface EspacioPublicoScoreResult {
  scoreTotal: number;
  criterios: EspacioPublicoCriterionResult[];
  espacioVerdePcapita: number | null;
  coberturaArbolado: number | null;
  separacionResiduos: number | null;
}

// ─── Weights ───

const WEIGHTS = {
  espacioVerde: 0.30,
  arbolado: 0.25,
  separacion: 0.25,
  incidentes: 0.20,
};

// ─── Normalization ───

const NULL_DEFAULT = 0.3;

/**
 * Espacio verde per cápita: OMS recomienda 10-15 m²/hab.
 * < 3 → muy bajo, 3-7 → bajo, 7-12 → bueno, >= 15 → excelente.
 */
function scoreEspacioVerde(val: number | null): { norm: number; interp: string } {
  if (val == null) return { norm: NULL_DEFAULT, interp: "Sin datos" };
  if (val >= 15) return { norm: 1.0, interp: `${val.toFixed(1)} m²/hab — Supera recomendación OMS` };
  if (val >= 10) return { norm: 0.7 + (val - 10) / 16.7, interp: `${val.toFixed(1)} m²/hab — Cumple recomendación OMS` };
  if (val >= 5) return { norm: 0.3 + (val - 5) / 12.5, interp: `${val.toFixed(1)} m²/hab — Moderado` };
  if (val >= 2) return { norm: 0.1 + (val - 2) / 15, interp: `${val.toFixed(1)} m²/hab — Bajo` };
  return { norm: Math.max(0, val / 20), interp: `${val.toFixed(1)} m²/hab — Crítico` };
}

/**
 * Cobertura de arbolado urbano: % estimado.
 * > 25% excelente, 15-25% bueno, 8-15% moderado, < 8% bajo.
 */
function scoreArbolado(val: number | null): { norm: number; interp: string } {
  if (val == null) return { norm: NULL_DEFAULT, interp: "Sin datos" };
  const capped = Math.min(val, 40);
  const norm = Math.min(1.0, capped / 25);
  if (norm >= 0.7) return { norm, interp: `${val.toFixed(1)}% — Alto arbolado urbano` };
  if (norm >= 0.4) return { norm, interp: `${val.toFixed(1)}% — Arbolado moderado` };
  return { norm, interp: `${val.toFixed(1)}% — Bajo arbolado urbano` };
}

/**
 * Separación de residuos: 0 / 0.5 / 1.0
 */
function scoreSeparacion(val: number | null): { norm: number; interp: string } {
  if (val == null) return { norm: NULL_DEFAULT, interp: "Sin datos" };
  if (val >= 1.0) return { norm: 1.0, interp: "Programa consolidado de separación en origen" };
  if (val >= 0.5) return { norm: 0.5, interp: "Programa parcial de separación" };
  return { norm: 0, interp: "Sin programa de separación" };
}

/**
 * Incidentes ambientales: MENOR es MEJOR.
 * 0 → 1.0, 1-3 → 0.7, 4-8 → 0.4, > 8 → proporcional a 0.
 */
function scoreIncidentes(val: number | null): { norm: number; interp: string } {
  if (val == null) return { norm: NULL_DEFAULT, interp: "Sin datos" };
  if (val === 0) return { norm: 1.0, interp: "Sin incidentes ambientales reportados" };
  if (val <= 3) return { norm: 0.7, interp: `${val} incidentes — Nivel bajo` };
  if (val <= 8) return { norm: 0.4, interp: `${val} incidentes — Nivel moderado` };
  return { norm: Math.max(0, 0.3 - (val - 8) / 40), interp: `${val} incidentes — Nivel alto` };
}

// ─── Main ───

export function scoreEspacioPublico(input: EspacioPublicoInput): EspacioPublicoScoreResult {
  const ev = scoreEspacioVerde(input.espacioVerdePcapita);
  const ar = scoreArbolado(input.coberturaArbolado);
  const sr = scoreSeparacion(input.separacionResiduos);
  const ia = scoreIncidentes(input.incidentesAmbientales);

  const criterios: EspacioPublicoCriterionResult[] = [
    {
      indicador: "espacioVerdePcapita",
      descripcion: "Espacio verde per cápita",
      valorRaw: input.espacioVerdePcapita,
      valorNormalizado: ev.norm,
      peso: WEIGHTS.espacioVerde,
      unidad: "m²/hab",
      interpretacion: ev.interp,
    },
    {
      indicador: "coberturaArbolado",
      descripcion: "Cobertura de arbolado urbano",
      valorRaw: input.coberturaArbolado,
      valorNormalizado: ar.norm,
      peso: WEIGHTS.arbolado,
      unidad: "%",
      interpretacion: ar.interp,
    },
    {
      indicador: "separacionResiduos",
      descripcion: "Separación de residuos",
      valorRaw: input.separacionResiduos,
      valorNormalizado: sr.norm,
      peso: WEIGHTS.separacion,
      unidad: "índice",
      interpretacion: sr.interp,
    },
    {
      indicador: "incidentesAmbientales",
      descripcion: "Incidentes ambientales",
      valorRaw: input.incidentesAmbientales,
      valorNormalizado: ia.norm,
      peso: WEIGHTS.incidentes,
      unidad: "incidentes",
      interpretacion: ia.interp,
    },
  ];

  const scoreTotal =
    Math.round(
      criterios.reduce((sum, c) => sum + c.valorNormalizado * c.peso, 0) * 1000
    ) / 10;

  return {
    scoreTotal,
    criterios,
    espacioVerdePcapita: input.espacioVerdePcapita,
    coberturaArbolado: input.coberturaArbolado,
    separacionResiduos: input.separacionResiduos,
  };
}
