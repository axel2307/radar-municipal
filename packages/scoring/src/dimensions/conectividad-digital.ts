/**
 * Dimensión de scoring de conectividad digital.
 *
 * Evalúa el acceso digital del municipio:
 *   1. % hogares con acceso a internet (30%)
 *   2. Conexiones de banda ancha fija cada 100 hab (25%)
 *   3. % hogares con computadora/dispositivo (20%)
 *   4. Índice de servicios digitales municipales (25%)
 *
 * Fuentes: INDEC Censo 2022, ENACOM datos abiertos, auditoría de portales.
 */

export interface ConectividadInput {
  /** % de hogares con acceso a internet (0-100) */
  pctInternet: number | null;
  /** Conexiones de banda ancha fija cada 100 habitantes */
  bandaAnchaPer100: number | null;
  /** % de hogares con computadora o dispositivo (0-100) */
  pctComputadora: number | null;
  /** Índice de servicios digitales: 0=nada, 0.5=básico, 1=completo */
  serviciosDigitales: number | null;
}

export interface ConectividadCriterionResult {
  indicador: string;
  descripcion: string;
  valorRaw: number | null;
  valorNormalizado: number;
  peso: number;
  unidad: string;
  interpretacion: string;
}

export interface ConectividadScoreResult {
  scoreTotal: number;
  criterios: ConectividadCriterionResult[];
  pctInternet: number | null;
  bandaAnchaPer100: number | null;
  pctComputadora: number | null;
}

const WEIGHTS = {
  internet: 0.30,
  bandaAncha: 0.25,
  computadora: 0.20,
  serviciosDigitales: 0.25,
};

/** Normaliza porcentaje de cobertura digital a 0-1, cap al 90% */
function scorePctDigital(pct: number | null): number {
  if (pct == null) return 0.3;
  return Math.min(1.0, pct / 90);
}

/**
 * Normaliza banda ancha per 100 hab.
 * Referencia AR: ~20-25 es promedio urbano, >30 excelente.
 */
function scoreBandaAncha(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor >= 30) return 1.0;
  if (valor >= 25) return 0.8;
  if (valor >= 20) return 0.7;
  if (valor >= 15) return 0.5;
  if (valor >= 10) return 0.4;
  return 0.2;
}

export function scoreConectividad(
  input: ConectividadInput
): ConectividadScoreResult {
  const criterios: ConectividadCriterionResult[] = [];

  const intScore = scorePctDigital(input.pctInternet);
  criterios.push({
    indicador: "pct_internet",
    descripcion: "% hogares con internet",
    valorRaw: input.pctInternet,
    valorNormalizado: intScore,
    peso: WEIGHTS.internet,
    unidad: "%",
    interpretacion: input.pctInternet != null
      ? `${input.pctInternet.toFixed(1)}% de los hogares`
      : "Sin datos",
  });

  const baScore = scoreBandaAncha(input.bandaAnchaPer100);
  criterios.push({
    indicador: "banda_ancha_per_100",
    descripcion: "Banda ancha fija cada 100 hab",
    valorRaw: input.bandaAnchaPer100,
    valorNormalizado: baScore,
    peso: WEIGHTS.bandaAncha,
    unidad: "conn/100h",
    interpretacion: input.bandaAnchaPer100 != null
      ? `${input.bandaAnchaPer100.toFixed(1)} conexiones cada 100 hab`
      : "Sin datos",
  });

  const compScore = scorePctDigital(input.pctComputadora);
  criterios.push({
    indicador: "pct_computadora",
    descripcion: "% hogares con computadora",
    valorRaw: input.pctComputadora,
    valorNormalizado: compScore,
    peso: WEIGHTS.computadora,
    unidad: "%",
    interpretacion: input.pctComputadora != null
      ? `${input.pctComputadora.toFixed(1)}% de los hogares`
      : "Sin datos",
  });

  const sdScore = input.serviciosDigitales ?? 0.3;
  criterios.push({
    indicador: "servicios_digitales",
    descripcion: "Servicios digitales municipales",
    valorRaw: input.serviciosDigitales,
    valorNormalizado: sdScore,
    peso: WEIGHTS.serviciosDigitales,
    unidad: "índice",
    interpretacion: input.serviciosDigitales != null
      ? input.serviciosDigitales >= 1
        ? "Trámites online completos"
        : input.serviciosDigitales >= 0.5
          ? "Trámites online básicos"
          : "Sin trámites online"
      : "Sin datos",
  });

  const scoreTotal =
    Math.round(
      criterios.reduce((sum, c) => sum + c.valorNormalizado * c.peso, 0) * 100 * 10
    ) / 10;

  return {
    scoreTotal,
    criterios,
    pctInternet: input.pctInternet,
    bandaAnchaPer100: input.bandaAnchaPer100,
    pctComputadora: input.pctComputadora,
  };
}
