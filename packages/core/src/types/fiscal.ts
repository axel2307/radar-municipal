import type { SourcedValue } from "./provenance";

/**
 * Indicador fiscal con procedencia multicapa.
 *
 * Cada campo numérico es un SourcedValue que incluye el valor
 * y su fuente (capa, organismo, url, confianza).
 *
 * Los campos derivados (pcapita, pct) se calculan por el scoring
 * engine y tienen capa DERIVADA.
 */
export interface FiscalIndicatorSourced {
  id: number;
  municipioId: string;
  anio: number;
  trimestre: number | null;
  gastoTotal: SourcedValue<number>;
  gastoPersonal: SourcedValue<number>;
  gastoCapital: SourcedValue<number>;
  deudaTotal: SourcedValue<number>;
  ingresoTotal: SourcedValue<number>;
  resultadoFiscal: SourcedValue<number>;
  /** Derivados — se calculan a partir de los primarios */
  gastoPcapita: SourcedValue<number>;
  deudaPcapita: SourcedValue<number>;
  pctPersonal: SourcedValue<number>;
  pctCapital: SourcedValue<number>;
  /** Nuevos indicadores expandidos (opcionales para backward compat) */
  autonomiaFiscal?: SourcedValue<number>;
  presionTributaria?: SourcedValue<number>;
  eficienciaAdmin?: SourcedValue<number>;
}

/**
 * Indicador fiscal plano (sin procedencia).
 *
 * Mantenido para compatibilidad con el scoring engine actual
 * y con el mock data existente. Los adaptadores convierten
 * de FiscalIndicatorSourced a FiscalIndicator extrayendo .valor.
 */
export interface FiscalIndicator {
  id: number;
  municipioId: string;
  anio: number;
  trimestre: number | null;
  gastoTotal: number | null;
  gastoPersonal: number | null;
  gastoCapital: number | null;
  deudaTotal: number | null;
  ingresoTotal: number | null;
  resultadoFiscal: number | null;
  gastoPcapita: number | null;
  deudaPcapita: number | null;
  pctPersonal: number | null;
  pctCapital: number | null;
  /** Nuevos indicadores expandidos (opcionales para backward compat) */
  autonomiaFiscal?: number | null;
  presionTributaria?: number | null;
  eficienciaAdmin?: number | null;
}

/**
 * Extrae los valores planos de un FiscalIndicatorSourced.
 * Útil para pasar al scoring engine sin cambiar su firma.
 */
export function flattenFiscalIndicator(sourced: FiscalIndicatorSourced): FiscalIndicator {
  return {
    id: sourced.id,
    municipioId: sourced.municipioId,
    anio: sourced.anio,
    trimestre: sourced.trimestre,
    gastoTotal: sourced.gastoTotal.valor,
    gastoPersonal: sourced.gastoPersonal.valor,
    gastoCapital: sourced.gastoCapital.valor,
    deudaTotal: sourced.deudaTotal.valor,
    ingresoTotal: sourced.ingresoTotal.valor,
    resultadoFiscal: sourced.resultadoFiscal.valor,
    gastoPcapita: sourced.gastoPcapita.valor,
    deudaPcapita: sourced.deudaPcapita.valor,
    pctPersonal: sourced.pctPersonal.valor,
    pctCapital: sourced.pctCapital.valor,
    autonomiaFiscal: sourced.autonomiaFiscal?.valor ?? null,
    presionTributaria: sourced.presionTributaria?.valor ?? null,
    eficienciaAdmin: sourced.eficienciaAdmin?.valor ?? null,
  };
}

/** Campos fiscales primarios (no derivados) */
export const FISCAL_PRIMARY_FIELDS = [
  "gastoTotal",
  "gastoPersonal",
  "gastoCapital",
  "deudaTotal",
  "ingresoTotal",
  "resultadoFiscal",
] as const;

export type FiscalPrimaryField = typeof FISCAL_PRIMARY_FIELDS[number];
