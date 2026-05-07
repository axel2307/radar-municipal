/**
 * Sistema de procedencia multicapa.
 *
 * Cada dato en Radar Municipal tiene:
 *   - Un valor (puede ser null si no se encontró)
 *   - Una fuente (capa + organismo + url + fecha)
 *   - Un nivel de confianza
 *
 * Las "brechas de datos" (DataGap) registran cuándo un dato
 * que debería existir en la capa municipal no está disponible.
 */

import type { SourceLayer } from "../constants/source-layers";
import type { DataField } from "../constants/data-fields";

// ─────────────────────────────────────────
// SourcedValue: valor con procedencia
// ─────────────────────────────────────────

/** Información de procedencia de un dato */
export interface DataPointSource {
  capa: SourceLayer;
  /** ID del organismo (de KNOWN_ORGANISMS) */
  organismo: string;
  /** URL directa al dato o documento fuente */
  url: string | null;
  /** Formato del documento fuente */
  formato: string | null;
  /** Fecha en que se accedió/extrajo el dato (ISO 8601) */
  fechaAcceso: string;
  /** Fecha de publicación original (ISO 8601, si se conoce) */
  fechaPublicacion: string | null;
}

export enum ConfidenceLevel {
  /** Dato primario verificado, machine-readable */
  ALTA = "ALTA",
  /** Dato de fuente oficial pero no verificado cruzadamente */
  MEDIA = "MEDIA",
  /** Dato de fuente secundaria o con posibles inconsistencias */
  BAJA = "BAJA",
  /** Valor estimado o calculado con supuestos */
  ESTIMACION = "ESTIMACION",
}

/** Nivel de confianza de un dato */
export interface DataPointConfidence {
  nivel: ConfidenceLevel;
  notas: string | null;
  /** Campo contra el que se validó (si aplica) */
  validadoContra: string | null;
}

/**
 * Valor con procedencia completa.
 * Tipo genérico para envolver cualquier campo con su fuente.
 */
export interface SourcedValue<T> {
  valor: T | null;
  fuente: DataPointSource | null;
  confianza: DataPointConfidence | null;
}

// ─────────────────────────────────────────
// DataPoint: registro atómico de un dato
// ─────────────────────────────────────────

export interface DataPoint {
  id: number;
  municipioId: string;
  campo: DataField;
  /** Valor numérico (para campos cuantitativos) */
  valorNumerico: number | null;
  /** Valor textual (para campos cualitativos) */
  valorTexto: string | null;
  /** Valor booleano (para campos de existencia) */
  valorBooleano: boolean | null;
  unidad: string | null;
  anio: number;
  trimestre: number | null;
  fechaCorte: string | null;
  fuente: DataPointSource;
  confianza: DataPointConfidence;
}

// ─────────────────────────────────────────
// DataGap: brecha de datos
// ─────────────────────────────────────────

/**
 * Tipos de brecha de datos:
 *
 * OPACIDAD_SELECTIVA: el municipio publica algunos datos pero no este.
 *   Ejemplo: publica presupuesto y ejecución pero no deuda.
 *   Es la señal más fuerte de un problema de transparencia.
 *
 * PROACTIVIDAD: el dato solo existe en fuente provincial/nacional.
 *   El municipio podría publicarlo pero no lo hace proactivamente.
 *
 * CONSISTENTE: el municipio no publica nada de esta categoría,
 *   y tampoco hay fuente alternativa.
 *
 * SIN_DATOS: no se encontró el dato en ninguna fuente.
 */
export enum DataGapType {
  OPACIDAD_SELECTIVA = "OPACIDAD_SELECTIVA",
  PROACTIVIDAD = "PROACTIVIDAD",
  CONSISTENTE = "CONSISTENTE",
  SIN_DATOS = "SIN_DATOS",
}

export const DATA_GAP_TYPE_META: Record<DataGapType, { label: string; color: string; severity: number }> = {
  [DataGapType.OPACIDAD_SELECTIVA]: {
    label: "Opacidad selectiva",
    color: "text-red-600",
    severity: 3,
  },
  [DataGapType.PROACTIVIDAD]: {
    label: "Falta de proactividad",
    color: "text-orange-600",
    severity: 2,
  },
  [DataGapType.CONSISTENTE]: {
    label: "Consistente (no publica nada)",
    color: "text-yellow-600",
    severity: 1,
  },
  [DataGapType.SIN_DATOS]: {
    label: "Sin datos en ninguna fuente",
    color: "text-gray-500",
    severity: 0,
  },
};

export interface DataGap {
  id: number;
  municipioId: string;
  campo: DataField;
  anio: number;
  trimestre: number | null;
  /** ¿Existe el dato publicado por el municipio? */
  existeEnMunicipal: boolean;
  /** ¿Existe el dato en alguna fuente provincial? */
  existeEnProvincial: boolean;
  /** Tipo de brecha diagnosticada */
  tipo: DataGapType;
}
