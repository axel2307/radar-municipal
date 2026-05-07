/**
 * Dimensión de scoring de servicios básicos.
 *
 * Evalúa la cobertura de servicios esenciales del municipio:
 *   1. % hogares con agua de red (25%)
 *   2. % hogares con red cloacal (25%)
 *   3. % hogares con gas de red (20%)
 *   4. Recolección formal de residuos (15%)
 *   5. Alumbrado público (15%)
 *
 * Fuentes principales: INDEC Censo 2022, portales municipales.
 */

export interface ServiciosBasicosInput {
  /** % de hogares con acceso a agua de red (0-100) */
  pctAguaRed: number | null;
  /** % de hogares con red cloacal (0-100) */
  pctCloaca: number | null;
  /** % de hogares con gas de red (0-100) */
  pctGasRed: number | null;
  /** ¿Tiene recolección formal de residuos? 0=no, 0.5=parcial, 1=completa */
  recoleccionResiduos: number | null;
  /** ¿Tiene alumbrado público adecuado? 0=no, 0.5=parcial, 1=completo */
  alumbradoPublico: number | null;
}

export interface ServiciosBasicosCriterionResult {
  indicador: string;
  descripcion: string;
  valorRaw: number | null;
  valorNormalizado: number;
  peso: number;
  unidad: string;
  interpretacion: string;
}

export interface ServiciosBasicosScoreResult {
  scoreTotal: number;
  criterios: ServiciosBasicosCriterionResult[];
  pctAguaRed: number | null;
  pctCloaca: number | null;
  pctGasRed: number | null;
}

const WEIGHTS = {
  agua: 0.25,
  cloaca: 0.25,
  gas: 0.20,
  residuos: 0.15,
  alumbrado: 0.15,
};

/**
 * Normaliza un porcentaje de cobertura a score 0-1.
 * 95%+ = 1.0, escala lineal desde 0%.
 */
function scoreCobertura(pct: number | null): number {
  if (pct == null) return 0.3; // Sin datos → neutro bajo
  return Math.min(1.0, pct / 95);
}

export function scoreServiciosBasicos(
  input: ServiciosBasicosInput
): ServiciosBasicosScoreResult {
  const criterios: ServiciosBasicosCriterionResult[] = [];

  // 1. Agua de red
  const aguaScore = scoreCobertura(input.pctAguaRed);
  criterios.push({
    indicador: "pct_agua_red",
    descripcion: "% hogares con agua de red",
    valorRaw: input.pctAguaRed,
    valorNormalizado: aguaScore,
    peso: WEIGHTS.agua,
    unidad: "%",
    interpretacion: input.pctAguaRed != null
      ? `${input.pctAguaRed.toFixed(1)}% de los hogares`
      : "Sin datos de cobertura de agua",
  });

  // 2. Red cloacal
  const cloacaScore = scoreCobertura(input.pctCloaca);
  criterios.push({
    indicador: "pct_cloaca",
    descripcion: "% hogares con red cloacal",
    valorRaw: input.pctCloaca,
    valorNormalizado: cloacaScore,
    peso: WEIGHTS.cloaca,
    unidad: "%",
    interpretacion: input.pctCloaca != null
      ? `${input.pctCloaca.toFixed(1)}% de los hogares`
      : "Sin datos de cobertura cloacal",
  });

  // 3. Gas de red
  const gasScore = scoreCobertura(input.pctGasRed);
  criterios.push({
    indicador: "pct_gas_red",
    descripcion: "% hogares con gas de red",
    valorRaw: input.pctGasRed,
    valorNormalizado: gasScore,
    peso: WEIGHTS.gas,
    unidad: "%",
    interpretacion: input.pctGasRed != null
      ? `${input.pctGasRed.toFixed(1)}% de los hogares`
      : "Sin datos de cobertura de gas",
  });

  // 4. Recolección de residuos
  const residuosVal = input.recoleccionResiduos ?? 0.3;
  criterios.push({
    indicador: "recoleccion_residuos",
    descripcion: "Recolección formal de residuos",
    valorRaw: input.recoleccionResiduos,
    valorNormalizado: residuosVal,
    peso: WEIGHTS.residuos,
    unidad: "índice",
    interpretacion: input.recoleccionResiduos != null
      ? input.recoleccionResiduos >= 1
        ? "Recolección completa"
        : input.recoleccionResiduos >= 0.5
          ? "Recolección parcial"
          : "Sin recolección formal"
      : "Sin datos",
  });

  // 5. Alumbrado público
  const alumbradoVal = input.alumbradoPublico ?? 0.3;
  criterios.push({
    indicador: "alumbrado_publico",
    descripcion: "Alumbrado público",
    valorRaw: input.alumbradoPublico,
    valorNormalizado: alumbradoVal,
    peso: WEIGHTS.alumbrado,
    unidad: "índice",
    interpretacion: input.alumbradoPublico != null
      ? input.alumbradoPublico >= 1
        ? "Cobertura completa"
        : input.alumbradoPublico >= 0.5
          ? "Cobertura parcial"
          : "Cobertura deficiente"
      : "Sin datos",
  });

  const scoreTotal =
    Math.round(
      criterios.reduce((sum, c) => sum + c.valorNormalizado * c.peso, 0) * 100 * 10
    ) / 10;

  return {
    scoreTotal,
    criterios,
    pctAguaRed: input.pctAguaRed,
    pctCloaca: input.pctCloaca,
    pctGasRed: input.pctGasRed,
  };
}
