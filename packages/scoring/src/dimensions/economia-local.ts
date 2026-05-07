/**
 * Dimensión de scoring de economía local.
 *
 * Evalúa la dinámica económica del partido:
 *   1. Empleo registrado per cápita (30%)
 *   2. Variación interanual del empleo (20%)
 *   3. Empresas registradas per cápita (20%)
 *   4. Actividad de construcción (15%)
 *   5. Recaudación propia per cápita (15%)
 *
 * Fuentes: OEDE (Min. Trabajo), AFIP, IERIC, RAFAM.
 */

export interface EconomiaLocalInput {
  /** Empleo registrado privado / población (0-1, típicamente 0.10-0.35) */
  empleoPcapita: number | null;
  /** Variación interanual del empleo registrado (%, puede ser negativo) */
  variacionEmpleo: number | null;
  /** Empresas registradas cada 1.000 habitantes */
  empresasPer1000: number | null;
  /** Índice de construcción: 0=sin datos, 0.5=baja, 1=alta actividad */
  construccion: number | null;
  /** Recaudación propia municipal per cápita ($/hab) */
  recaudacionPcapita: number | null;
}

export interface EconomiaLocalCriterionResult {
  indicador: string;
  descripcion: string;
  valorRaw: number | null;
  valorNormalizado: number;
  peso: number;
  unidad: string;
  interpretacion: string;
}

export interface EconomiaLocalScoreResult {
  scoreTotal: number;
  criterios: EconomiaLocalCriterionResult[];
  empleoPcapita: number | null;
  variacionEmpleo: number | null;
  empresasPer1000: number | null;
}

const WEIGHTS = {
  empleo: 0.30,
  variacion: 0.20,
  empresas: 0.20,
  construccion: 0.15,
  recaudacion: 0.15,
};

/**
 * Normaliza ratio empleo/población.
 * 0.30+ es excelente (30% de la población tiene empleo registrado privado).
 * 0.10 es bajo.
 */
function scoreEmpleo(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor >= 0.30) return 1.0;
  if (valor >= 0.25) return 0.8;
  if (valor >= 0.20) return 0.7;
  if (valor >= 0.15) return 0.5;
  if (valor >= 0.10) return 0.4;
  return 0.2;
}

/**
 * Normaliza variación interanual del empleo.
 * >5% crecimiento = excelente, <-5% = muy malo.
 */
function scoreVariacion(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor >= 5) return 1.0;
  if (valor >= 3) return 0.8;
  if (valor >= 1) return 0.7;
  if (valor >= 0) return 0.5;
  if (valor >= -3) return 0.3;
  return 0.1;
}

/**
 * Normaliza empresas per 1000 hab.
 * Referencia: 15-25 es bueno en PBA, >30 excelente.
 */
function scoreEmpresas(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor >= 30) return 1.0;
  if (valor >= 20) return 0.8;
  if (valor >= 15) return 0.6;
  if (valor >= 10) return 0.4;
  return 0.2;
}

/**
 * Normaliza recaudación propia per cápita.
 * Más recaudación = más actividad económica local (proxy).
 */
function scoreRecaudacion(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor >= 200000) return 1.0;
  if (valor >= 150000) return 0.8;
  if (valor >= 100000) return 0.6;
  if (valor >= 50000) return 0.4;
  return 0.2;
}

export function scoreEconomiaLocal(
  input: EconomiaLocalInput
): EconomiaLocalScoreResult {
  const criterios: EconomiaLocalCriterionResult[] = [];

  const empScore = scoreEmpleo(input.empleoPcapita);
  criterios.push({
    indicador: "empleo_pcapita",
    descripcion: "Empleo registrado per cápita",
    valorRaw: input.empleoPcapita,
    valorNormalizado: empScore,
    peso: WEIGHTS.empleo,
    unidad: "ratio",
    interpretacion: input.empleoPcapita != null
      ? `${(input.empleoPcapita * 100).toFixed(1)}% de la población con empleo registrado privado`
      : "Sin datos",
  });

  const varScore = scoreVariacion(input.variacionEmpleo);
  criterios.push({
    indicador: "variacion_empleo",
    descripcion: "Variación interanual del empleo",
    valorRaw: input.variacionEmpleo,
    valorNormalizado: varScore,
    peso: WEIGHTS.variacion,
    unidad: "%",
    interpretacion: input.variacionEmpleo != null
      ? input.variacionEmpleo >= 0
        ? `Creció ${input.variacionEmpleo.toFixed(1)}% interanual`
        : `Cayó ${Math.abs(input.variacionEmpleo).toFixed(1)}% interanual`
      : "Sin datos",
  });

  const emprsScore = scoreEmpresas(input.empresasPer1000);
  criterios.push({
    indicador: "empresas_per_1000",
    descripcion: "Empresas registradas cada 1.000 hab",
    valorRaw: input.empresasPer1000,
    valorNormalizado: emprsScore,
    peso: WEIGHTS.empresas,
    unidad: "emp/1000h",
    interpretacion: input.empresasPer1000 != null
      ? `${input.empresasPer1000.toFixed(1)} empresas cada 1.000 hab`
      : "Sin datos",
  });

  const constScore = input.construccion ?? 0.3;
  criterios.push({
    indicador: "construccion",
    descripcion: "Actividad de construcción",
    valorRaw: input.construccion,
    valorNormalizado: constScore,
    peso: WEIGHTS.construccion,
    unidad: "índice",
    interpretacion: input.construccion != null
      ? input.construccion >= 1
        ? "Alta actividad"
        : input.construccion >= 0.5
          ? "Actividad moderada"
          : "Baja actividad"
      : "Sin datos",
  });

  const recScore = scoreRecaudacion(input.recaudacionPcapita);
  criterios.push({
    indicador: "recaudacion_pcapita",
    descripcion: "Recaudación propia per cápita",
    valorRaw: input.recaudacionPcapita,
    valorNormalizado: recScore,
    peso: WEIGHTS.recaudacion,
    unidad: "$/hab",
    interpretacion: input.recaudacionPcapita != null
      ? `$${Math.round(input.recaudacionPcapita).toLocaleString("es-AR")}/hab`
      : "Sin datos",
  });

  const scoreTotal =
    Math.round(
      criterios.reduce((sum, c) => sum + c.valorNormalizado * c.peso, 0) * 100 * 10
    ) / 10;

  return {
    scoreTotal,
    criterios,
    empleoPcapita: input.empleoPcapita,
    variacionEmpleo: input.variacionEmpleo,
    empresasPer1000: input.empresasPer1000,
  };
}
