/**
 * Tipos para Pilar 4 — Compras públicas (Sprint 15+).
 *
 * Hoy `ComprasData` (en normativa.ts) es un binario "publica licitaciones"
 * con un conteo crudo. Pilar 4 necesita un nivel más profundo: cada
 * contratación con su monto, fecha y estado, ingerida desde portales CKAN.
 * `Contratacion` representa UNA licitación o adjudicación; el agregador
 * de stats vive aguas arriba (en scoring/web).
 *
 * Diseñado contra el schema de Quilmes CKAN (Sprint 15 discovery): el dataset
 * expone `id, anio, estado, objeto, presupuesto_cifra, fecha_apertura,
 * lugar_apertura`. NO incluye `proveedor` ni `monto adjudicado`, así que el
 * cálculo de HHI (concentración de proveedores) NO es factible con este
 * dataset. Otros municipios pueden exponer esos campos; cuando aparezcan,
 * extendemos este tipo (campos opcionales, backward-compatible).
 */

export type ContratacionEstado =
  | "ABIERTA"
  | "EN_EVALUACION"
  | "ADJUDICADA"
  | "FINALIZADA"
  | "DESIERTA"
  | "ANULADA"
  | "DESCONOCIDO";

export interface Contratacion {
  /** ID estable. Idealmente `${municipioId}-${anio}-${idLocal}`. */
  id: string;
  /** INDEC id del partido. */
  municipioId: string;
  /** Año fiscal de la contratación. */
  anio: number;
  /** Estado normalizado (ver ContratacionEstado). */
  estado: ContratacionEstado;
  /** Texto del estado original tal como aparece en la fuente. Útil para auditoría. */
  estadoRaw: string | null;
  /** Descripción del objeto / glosa. Trimmed. */
  objeto: string | null;
  /**
   * Presupuesto oficial en ARS nominales (monto licitado / techo). NO es
   * monto adjudicado: salvo que la fuente diga lo contrario, esto es lo
   * que el municipio publicó como precio máximo o presupuesto base.
   */
  montoPresupuesto: number | null;
  /** Fecha de apertura de sobres (ISO 8601 yyyy-mm-dd, o null si ilegible). */
  fechaApertura: string | null;
  /** Lugar físico de apertura. Útil para detectar "salones" recurrentes. */
  lugarApertura: string | null;
  /**
   * Proveedor adjudicado, si la fuente lo expone. Sprint 15: siempre null
   * (Quilmes no lo trae). Si en el futuro un dataset trae adjudicación,
   * se rellena aquí.
   */
  proveedor: string | null;
  /** URL del dataset CKAN/Junar de origen. */
  fuenteUrl: string;
  /** Etiqueta de la plataforma de origen (CKAN, Junar, otro). */
  fuenteTipo: "CKAN" | "JUNAR" | "OTRO";
}

/**
 * Aggregate de contrataciones para un municipio + año, calculable a partir
 * de `Contratacion[]` filtrado. Sprint 15: stats básicos sin HHI (sin
 * proveedor no se puede calcular concentración). Sprint 16: si TODAS las
 * contrataciones del set tienen proveedor + monto, computamos HHI.
 */
export interface ContratacionesAggregate {
  municipioId: string;
  anio: number;
  totalContrataciones: number;
  /** Suma de presupuestos (excluye nulls). */
  montoTotalPresupuesto: number;
  /** Cuántas tienen presupuesto numérico válido. */
  conMontoValido: number;
  /** Mediana de monto (excluye nulls). */
  medianaMonto: number | null;
  /** Distribución por estado normalizado. */
  porEstado: Partial<Record<ContratacionEstado, number>>;
  /**
   * Herfindahl-Hirschman Index sobre proveedores adjudicados, escala 0-10000.
   * 0 = perfectamente fragmentado. 10000 = un solo proveedor concentra el 100%.
   * Threshold típicos:
   *   < 1500: mercado competitivo
   *   1500-2500: moderadamente concentrado
   *   > 2500: altamente concentrado
   * `null` si no hay suficientes contrataciones con proveedor + monto.
   */
  hhiProveedores: number | null;
  /** Cantidad de proveedores únicos en el set (denominador del HHI). */
  proveedoresUnicos: number | null;
  /** URL del dataset usado para auditoría. */
  fuenteUrl: string;
}

// Sprint 27: `RefreshManifest` se movió a `refresh.ts` (ahora compartido
// entre Pilar 4, Pilar 2 y futuros refreshers). Re-exportamos desde acá
// para no romper consumers que importaban desde `contratacion.ts`.
export type { RefreshManifest } from "./refresh";
