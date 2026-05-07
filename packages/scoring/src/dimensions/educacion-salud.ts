/**
 * Dimensión de scoring de educación y salud.
 *
 * Evalúa la infraestructura educativa y sanitaria per cápita:
 *   1. Escuelas públicas cada 10.000 hab (30%)
 *   2. Centros de salud cada 10.000 hab (30%)
 *   3. Camas hospitalarias cada 10.000 hab (25%)
 *   4. Jardines maternales por cada 1.000 niños 0-5 (15%)
 *
 * Fuentes: Mapa Educativo Nacional, REFES, INDEC.
 */

export interface EducacionSaludInput {
  /** Escuelas públicas cada 10.000 habitantes */
  escuelasPer10k: number | null;
  /** Centros de salud (CAPS + hospitales) cada 10.000 hab */
  centrosSaludPer10k: number | null;
  /** Camas hospitalarias cada 10.000 hab */
  camasPer10k: number | null;
  /** Jardines maternales cada 1.000 niños 0-5 */
  jardinesPerNinos: number | null;
}

export interface EducacionSaludCriterionResult {
  indicador: string;
  descripcion: string;
  valorRaw: number | null;
  valorNormalizado: number;
  peso: number;
  unidad: string;
  interpretacion: string;
}

export interface EducacionSaludScoreResult {
  scoreTotal: number;
  criterios: EducacionSaludCriterionResult[];
  escuelasPer10k: number | null;
  centrosSaludPer10k: number | null;
  camasPer10k: number | null;
}

const WEIGHTS = {
  escuelas: 0.30,
  centrosSalud: 0.30,
  camas: 0.25,
  jardines: 0.15,
};

/**
 * Normaliza escuelas per 10k.
 * Referencia PBA: ~15-25 escuelas/10k es bueno, <8 es bajo.
 */
function scoreEscuelas(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor >= 25) return 1.0;
  if (valor >= 20) return 0.9;
  if (valor >= 15) return 0.8;
  if (valor >= 10) return 0.6;
  if (valor >= 5) return 0.4;
  return 0.2;
}

/**
 * Normaliza centros de salud per 10k.
 * Referencia: ~3-5 centros/10k es bueno, >8 excelente.
 */
function scoreCentrosSalud(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor >= 8) return 1.0;
  if (valor >= 5) return 0.8;
  if (valor >= 3) return 0.6;
  if (valor >= 1.5) return 0.4;
  return 0.2;
}

/**
 * Normaliza camas per 10k.
 * OMS recomienda ~30 camas/10k. En PBA varía mucho.
 */
function scoreCamas(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor >= 30) return 1.0;
  if (valor >= 20) return 0.8;
  if (valor >= 10) return 0.6;
  if (valor >= 5) return 0.4;
  return 0.2;
}

/**
 * Normaliza jardines per 1000 niños 0-5.
 */
function scoreJardines(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor >= 5) return 1.0;
  if (valor >= 3) return 0.8;
  if (valor >= 2) return 0.6;
  if (valor >= 1) return 0.4;
  return 0.2;
}

export function scoreEducacionSalud(
  input: EducacionSaludInput
): EducacionSaludScoreResult {
  const criterios: EducacionSaludCriterionResult[] = [];

  const escScore = scoreEscuelas(input.escuelasPer10k);
  criterios.push({
    indicador: "escuelas_per_10k",
    descripcion: "Escuelas públicas cada 10.000 hab",
    valorRaw: input.escuelasPer10k,
    valorNormalizado: escScore,
    peso: WEIGHTS.escuelas,
    unidad: "esc/10kh",
    interpretacion: input.escuelasPer10k != null
      ? `${input.escuelasPer10k.toFixed(1)} escuelas cada 10.000 hab`
      : "Sin datos",
  });

  const csScore = scoreCentrosSalud(input.centrosSaludPer10k);
  criterios.push({
    indicador: "centros_salud_per_10k",
    descripcion: "Centros de salud cada 10.000 hab",
    valorRaw: input.centrosSaludPer10k,
    valorNormalizado: csScore,
    peso: WEIGHTS.centrosSalud,
    unidad: "cs/10kh",
    interpretacion: input.centrosSaludPer10k != null
      ? `${input.centrosSaludPer10k.toFixed(1)} centros cada 10.000 hab`
      : "Sin datos",
  });

  const camScore = scoreCamas(input.camasPer10k);
  criterios.push({
    indicador: "camas_per_10k",
    descripcion: "Camas hospitalarias cada 10.000 hab",
    valorRaw: input.camasPer10k,
    valorNormalizado: camScore,
    peso: WEIGHTS.camas,
    unidad: "camas/10kh",
    interpretacion: input.camasPer10k != null
      ? `${input.camasPer10k.toFixed(1)} camas cada 10.000 hab`
      : "Sin datos",
  });

  const jarScore = scoreJardines(input.jardinesPerNinos);
  criterios.push({
    indicador: "jardines_per_ninos",
    descripcion: "Jardines maternales cada 1.000 niños 0-5",
    valorRaw: input.jardinesPerNinos,
    valorNormalizado: jarScore,
    peso: WEIGHTS.jardines,
    unidad: "jard/1000n",
    interpretacion: input.jardinesPerNinos != null
      ? `${input.jardinesPerNinos.toFixed(1)} jardines cada 1.000 niños`
      : "Sin datos",
  });

  const scoreTotal =
    Math.round(
      criterios.reduce((sum, c) => sum + c.valorNormalizado * c.peso, 0) * 100 * 10
    ) / 10;

  return {
    scoreTotal,
    criterios,
    escuelasPer10k: input.escuelasPer10k,
    centrosSaludPer10k: input.centrosSaludPer10k,
    camasPer10k: input.camasPer10k,
  };
}
