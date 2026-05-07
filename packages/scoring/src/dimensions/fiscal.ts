/**
 * Dimensión de scoring fiscal.
 *
 * Evalúa la salud fiscal de un municipio usando indicadores comparables:
 *   1. Resultado fiscal per cápita (superávit/déficit)
 *   2. % de gasto en personal (menos es mejor, hasta cierto punto)
 *   3. % de gasto de capital (más es mejor, indica inversión)
 *   4. Deuda per cápita (menos es mejor)
 *   5. Presión fiscal (gasto total per cápita — contexto, no score directo)
 *
 * Cada indicador se normaliza a [0, 1] con funciones específicas.
 * El score fiscal total es la media ponderada.
 */

import {
  type FiscalIndicator,
  type FiscalIndicatorSourced,
  flattenFiscalIndicator,
  FISCAL_EXPANDED_WEIGHTS,
} from "@radar-municipal/core";

/** Datos de entrada: indicador fiscal + población para normalizar */
export interface FiscalInput {
  fiscal: FiscalIndicator;
  poblacion: number;
}

/** Entrada con procedencia — se aplana automáticamente para el scoring */
export interface FiscalInputSourced {
  fiscal: FiscalIndicatorSourced;
  poblacion: number;
}

/** Resultado por indicador */
export interface FiscalCriterionResult {
  indicador: string;
  descripcion: string;
  valorRaw: number | null;
  valorNormalizado: number;
  peso: number;
  unidad: string;
  interpretacion: string;
}

/** Score fiscal completo */
export interface FiscalScoreResult {
  scoreTotal: number;
  criterios: FiscalCriterionResult[];
  gastoPcapita: number | null;
  deudaPcapita: number | null;
  pctPersonal: number | null;
  pctCapital: number | null;
  resultadoPcapita: number | null;
  autonomiaFiscal: number | null;
  presionTributaria: number | null;
  eficienciaAdmin: number | null;
}

/**
 * Calcula el score fiscal de un municipio.
 * Soporta los 4 indicadores originales + 3 nuevos (expandidos).
 * Si los indicadores nuevos son null/undefined, redistribuye pesos
 * entre los 4 originales para backward compatibility.
 */
export function scoreFiscal(input: FiscalInput): FiscalScoreResult {
  const { fiscal, poblacion } = input;

  // Valores derivados
  const gastoPcapita =
    fiscal.gastoTotal != null && poblacion > 0
      ? fiscal.gastoTotal / poblacion
      : null;

  const resultadoPcapita =
    fiscal.resultadoFiscal != null && poblacion > 0
      ? fiscal.resultadoFiscal / poblacion
      : null;

  const pctPersonal =
    fiscal.gastoPersonal != null && fiscal.gastoTotal != null && fiscal.gastoTotal > 0
      ? (fiscal.gastoPersonal / fiscal.gastoTotal) * 100
      : null;

  const pctCapital =
    fiscal.gastoCapital != null && fiscal.gastoTotal != null && fiscal.gastoTotal > 0
      ? (fiscal.gastoCapital / fiscal.gastoTotal) * 100
      : null;

  const deudaPcapita =
    fiscal.deudaTotal != null && poblacion > 0
      ? fiscal.deudaTotal / poblacion
      : null;

  const autonomiaFiscal = fiscal.autonomiaFiscal ?? null;
  const presionTributaria = fiscal.presionTributaria ?? null;
  const eficienciaAdmin = fiscal.eficienciaAdmin ?? null;

  // Build all criteria definitions with their scores
  const allCriteria: {
    key: string;
    indicador: string;
    descripcion: string;
    valorRaw: number | null;
    valorNormalizado: number;
    unidad: string;
    interpretacion: string;
    hasData: boolean;
  }[] = [
    {
      key: "resultadoPcapita",
      indicador: "resultado_pcapita",
      descripcion: "Resultado fiscal per cápita",
      valorRaw: resultadoPcapita,
      valorNormalizado: scoreResultadoPcapita(resultadoPcapita),
      unidad: "$/hab",
      interpretacion: resultadoPcapita != null
        ? resultadoPcapita >= 0
          ? `Superávit de $${formatNum(resultadoPcapita)}/hab`
          : `Déficit de $${formatNum(Math.abs(resultadoPcapita))}/hab`
        : "Sin datos de resultado fiscal",
      hasData: true, // always included (original)
    },
    {
      key: "pctPersonal",
      indicador: "pct_personal",
      descripcion: "% Gasto en personal",
      valorRaw: pctPersonal,
      valorNormalizado: scorePctPersonal(pctPersonal),
      unidad: "%",
      interpretacion: pctPersonal != null
        ? `${pctPersonal.toFixed(1)}% del gasto total`
        : "Sin datos de gasto en personal",
      hasData: true,
    },
    {
      key: "pctCapital",
      indicador: "pct_capital",
      descripcion: "% Gasto de capital",
      valorRaw: pctCapital,
      valorNormalizado: scorePctCapital(pctCapital),
      unidad: "%",
      interpretacion: pctCapital != null
        ? `${pctCapital.toFixed(1)}% del gasto total`
        : "Sin datos de gasto de capital",
      hasData: true,
    },
    {
      key: "deudaPcapita",
      indicador: "deuda_pcapita",
      descripcion: "Deuda per cápita",
      valorRaw: deudaPcapita,
      valorNormalizado: scoreDeudaPcapita(deudaPcapita, gastoPcapita),
      unidad: "$/hab",
      interpretacion: deudaPcapita != null
        ? `$${formatNum(deudaPcapita)}/hab`
        : "Sin datos de deuda",
      hasData: true,
    },
    {
      key: "autonomiaFiscal",
      indicador: "autonomia_fiscal",
      descripcion: "Autonomía fiscal",
      valorRaw: autonomiaFiscal,
      valorNormalizado: scoreAutonomiaFiscal(autonomiaFiscal),
      unidad: "%",
      interpretacion: autonomiaFiscal != null
        ? `${autonomiaFiscal.toFixed(1)}% de ingresos propios`
        : "Sin datos de autonomía fiscal",
      hasData: autonomiaFiscal != null,
    },
    {
      key: "presionTributaria",
      indicador: "presion_tributaria",
      descripcion: "Presión tributaria",
      valorRaw: presionTributaria,
      valorNormalizado: scorePresionTributaria(presionTributaria),
      unidad: "$/hab",
      interpretacion: presionTributaria != null
        ? `$${formatNum(presionTributaria)}/hab recaudación propia`
        : "Sin datos de presión tributaria",
      hasData: presionTributaria != null,
    },
    {
      key: "eficienciaAdmin",
      indicador: "eficiencia_admin",
      descripcion: "Eficiencia administrativa",
      valorRaw: eficienciaAdmin,
      valorNormalizado: scoreEficienciaAdmin(eficienciaAdmin),
      unidad: "%",
      interpretacion: eficienciaAdmin != null
        ? `${eficienciaAdmin.toFixed(1)}% gasto administrativo`
        : "Sin datos de eficiencia administrativa",
      hasData: eficienciaAdmin != null,
    },
  ];

  // Filter to criteria that have data (original 4 always present, new 3 only if provided)
  const activeCriteria = allCriteria.filter((c) => c.hasData);

  // Compute redistributed weights
  const totalActiveWeight = activeCriteria.reduce(
    (sum, c) => sum + (FISCAL_EXPANDED_WEIGHTS[c.key] ?? 0),
    0
  );

  const criterios: FiscalCriterionResult[] = activeCriteria.map((c) => ({
    indicador: c.indicador,
    descripcion: c.descripcion,
    valorRaw: c.valorRaw,
    valorNormalizado: c.valorNormalizado,
    peso: totalActiveWeight > 0
      ? (FISCAL_EXPANDED_WEIGHTS[c.key] ?? 0) / totalActiveWeight
      : 1 / activeCriteria.length,
    unidad: c.unidad,
    interpretacion: c.interpretacion,
  }));

  // Score total ponderado
  const scoreTotal =
    criterios.reduce((sum, c) => sum + c.valorNormalizado * c.peso, 0) * 100;

  return {
    scoreTotal: Math.round(scoreTotal * 10) / 10,
    criterios,
    gastoPcapita,
    deudaPcapita,
    pctPersonal,
    pctCapital,
    resultadoPcapita,
    autonomiaFiscal,
    presionTributaria,
    eficienciaAdmin,
  };
}

/**
 * Variante que acepta FiscalIndicatorSourced.
 * Aplana los SourcedValue a valores planos y delega a scoreFiscal.
 */
export function scoreFiscalSourced(input: FiscalInputSourced): FiscalScoreResult {
  return scoreFiscal({
    fiscal: flattenFiscalIndicator(input.fiscal),
    poblacion: input.poblacion,
  });
}

// ─────────────────────────────────────────
// Funciones de normalización
// ─────────────────────────────────────────

/**
 * Resultado fiscal per cápita:
 *   Superávit > 0: score entre 0.6 y 1.0 (proporcional, cap en ~50k/hab)
 *   Equilibrio (≈0): 0.5
 *   Déficit < 0: score entre 0.0 y 0.5 (proporcional, floor en -50k/hab)
 */
function scoreResultadoPcapita(valor: number | null): number {
  if (valor == null) return 0.3; // Sin datos → neutro bajo

  const cap = 50000; // Máximo razonable per cápita (en AR pesos)
  if (valor >= 0) {
    return 0.5 + 0.5 * Math.min(1, valor / cap);
  } else {
    return 0.5 * Math.max(0, 1 + valor / cap);
  }
}

/**
 * % Gasto en personal:
 *   < 40%: 1.0 (ideal para municipio)
 *   40-50%: 0.8
 *   50-60%: 0.6
 *   60-70%: 0.4
 *   70-80%: 0.2
 *   > 80%: 0.0
 *
 * Referencia: media nacional municipal ~55-65%.
 */
function scorePctPersonal(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor < 40) return 1.0;
  if (valor < 50) return 0.8;
  if (valor < 60) return 0.6;
  if (valor < 70) return 0.4;
  if (valor < 80) return 0.2;
  return 0.0;
}

/**
 * % Gasto de capital:
 *   > 20%: 1.0 (excelente inversión)
 *   15-20%: 0.8
 *   10-15%: 0.6
 *   5-10%: 0.4
 *   < 5%: 0.2
 *
 * Referencia: media municipal AR ~8-12%.
 */
function scorePctCapital(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor >= 20) return 1.0;
  if (valor >= 15) return 0.8;
  if (valor >= 10) return 0.6;
  if (valor >= 5) return 0.4;
  return 0.2;
}

/**
 * Deuda per cápita relativa al gasto per cápita:
 *   deuda/gasto < 5%: 1.0 (deuda insignificante)
 *   5-10%: 0.8
 *   10-20%: 0.6
 *   20-30%: 0.4
 *   > 30%: 0.2
 *
 * Si no hay dato de gasto, usa umbrales absolutos.
 */
function scoreDeudaPcapita(
  deuda: number | null,
  gasto: number | null
): number {
  if (deuda == null) return 0.3;
  if (deuda <= 0) return 1.0; // Sin deuda

  if (gasto != null && gasto > 0) {
    const ratio = (deuda / gasto) * 100;
    if (ratio < 5) return 1.0;
    if (ratio < 10) return 0.8;
    if (ratio < 20) return 0.6;
    if (ratio < 30) return 0.4;
    return 0.2;
  }

  // Fallback: umbrales absolutos (millones por hab)
  if (deuda < 10000) return 1.0;
  if (deuda < 30000) return 0.8;
  if (deuda < 60000) return 0.6;
  if (deuda < 100000) return 0.4;
  return 0.2;
}

/**
 * Autonomía fiscal (% ingresos propios sobre total):
 *   > 60%: 1.0 (alta autonomía)
 *   50-60%: 0.8
 *   40-50%: 0.6
 *   30-40%: 0.4
 *   20-30%: 0.2
 *   < 20%: 0.1
 *
 * Referencia: municipios PBA varían entre 15% y 70%.
 */
function scoreAutonomiaFiscal(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor >= 60) return 1.0;
  if (valor >= 50) return 0.8;
  if (valor >= 40) return 0.6;
  if (valor >= 30) return 0.4;
  if (valor >= 20) return 0.2;
  return 0.1;
}

/**
 * Presión tributaria (recaudación propia per cápita).
 * Moderate is ideal — too low means weak collection, too high means burden.
 * Uses an inverted-U curve:
 *   Optimal range: 50k-150k $/hab → 1.0-0.8
 *   Very low (< 20k): 0.3
 *   Very high (> 300k): 0.4
 */
function scorePresionTributaria(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor < 20000) return 0.3;
  if (valor < 50000) return 0.5;
  if (valor <= 150000) return 1.0;
  if (valor <= 200000) return 0.8;
  if (valor <= 300000) return 0.6;
  return 0.4;
}

/**
 * Eficiencia administrativa (% gasto admin sobre total).
 * Lower is better:
 *   < 10%: 1.0 (administración eficiente)
 *   10-15%: 0.8
 *   15-20%: 0.6
 *   20-25%: 0.4
 *   25-30%: 0.2
 *   > 30%: 0.1
 *
 * Referencia: media municipal AR ~15-25%.
 */
function scoreEficienciaAdmin(valor: number | null): number {
  if (valor == null) return 0.3;
  if (valor < 10) return 1.0;
  if (valor < 15) return 0.8;
  if (valor < 20) return 0.6;
  if (valor < 25) return 0.4;
  if (valor < 30) return 0.2;
  return 0.1;
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function formatNum(n: number): string {
  return Math.round(n).toLocaleString("es-AR");
}
