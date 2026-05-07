/**
 * Sprint 20 — Tipos para Pilar 2 Stock de Deuda multi-municipio.
 *
 * La Provincia de Buenos Aires obliga a los municipios (Ley 12462/13295)
 * a publicar trimestralmente la "Planilla C — Stock de Deuda Pública y
 * Perfil de Vencimientos". El schema es estandarizado: filas por
 * organismo acreedor, columnas por año (saldo + amortización + intereses).
 *
 * `StockDeudaSnapshot` representa UN snapshot por municipio + fecha de
 * corte. Aggregator histórico (multi-snapshot) queda para Sprint 21+ si
 * tiene tracción.
 *
 * Schema confirmado uniforme en Sprint 19 sobre 4 municipios distintos
 * (Berisso, Carmen de Areco, Lincoln, F. Ameghino).
 */

/**
 * Saldo de UN acreedor a una fecha de corte. Sólo incluimos los rubros
 * con valor numérico > 0 — los rubros sin deuda están en la planilla pero
 * vacíos.
 */
export interface AcreedorSaldo {
  /** Nombre tal como aparece en el XLSX, normalizado (trim, single space). */
  nombre: string;
  /** Saldo a la fecha de corte en ARS nominales. */
  saldo: number;
  /**
   * Sección jerárquica donde apareció (ej. "1.1. DEUDA PÚBLICA CONSOLIDADA").
   * Útil para auditoría / agrupar en UI; null si la fila no tiene un
   * encabezado de sección visible cercano.
   */
  seccion: string | null;
}

export interface StockDeudaSnapshot {
  municipioId: string;
  /**
   * Nombre tal como aparece en la fila "Municipalidad de" del XLSX. Útil
   * para auditar contra el ID INDEC (Sprint 17 cazó este tipo de bug en
   * Pilar 4).
   */
  nombreFuente: string;
  /** Fecha del corte (formato ISO yyyy-mm-dd). */
  fechaSnapshot: string;
  /** Saldo total = suma de `acreedores[i].saldo`. ARS nominales. */
  saldoTotal: number;
  /** Cantidad de acreedores con saldo > 0. */
  acreedoresConSaldo: number;
  /** Detalle de acreedores con saldo. Excluye los sin deuda. */
  acreedores: AcreedorSaldo[];
  /** URL del XLSX que se parseó. Trazabilidad para auditoría. */
  fuenteUrl: string;
  /** ISO de cuándo se ejecutó el parser. */
  parsedAt: string;
}
