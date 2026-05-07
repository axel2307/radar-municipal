/**
 * Queries genéricas contra la tabla data_points.
 *
 * Cada DataPoint almacena un valor atómico con procedencia completa.
 * Estas funciones priorizan por capa de fuente:
 *   MUNICIPAL > PROVINCIAL > NACIONAL > DERIVADA
 */

import { eq, and, inArray, sql, desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { dataPoints } from "../schema";
import type { DataField } from "../../constants/data-fields";
import type * as schema from "../schema";

export type DrizzleDb = NodePgDatabase<typeof schema>;

/** Row shape returned from dataPoints queries */
export interface DataPointRow {
  id: number;
  municipioId: string;
  campo: string;
  anio: number;
  trimestre: number | null;
  valorNumerico: number | null;
  valorTexto: string | null;
  valorBooleano: boolean | null;
  unidad: string | null;
  fuenteCapa: string;
  fuenteOrganismo: string;
  fuenteUrl: string | null;
  fuenteFormato: string | null;
  fuenteFechaAcceso: Date;
  fuenteFechaPublicacion: Date | null;
  confianzaNivel: string;
  confianzaNotas: string | null;
  confianzaValidadoContra: string | null;
}

/**
 * Expresión SQL para ordenar por prioridad de capa.
 * MUNICIPAL=1 (mayor prioridad) → DERIVADA=4 (menor).
 */
const CAPA_PRIORITY = sql`CASE fuente_capa
  WHEN 'MUNICIPAL' THEN 1
  WHEN 'PROVINCIAL' THEN 2
  WHEN 'NACIONAL' THEN 3
  WHEN 'DERIVADA' THEN 4
  ELSE 5
END`;

/**
 * Retorna el mejor dataPoint para un campo, priorizando por capa.
 */
export async function getDataPoint(
  db: DrizzleDb,
  municipioId: string,
  campo: DataField,
  anio: number,
  trimestre?: number | null
): Promise<DataPointRow | null> {
  const conditions = [
    eq(dataPoints.municipioId, municipioId),
    eq(dataPoints.campo, campo),
    eq(dataPoints.anio, anio),
  ];

  if (trimestre != null) {
    conditions.push(eq(dataPoints.trimestre, trimestre));
  }

  const rows = await db
    .select()
    .from(dataPoints)
    .where(and(...conditions))
    .orderBy(CAPA_PRIORITY)
    .limit(1);

  return (rows[0] as DataPointRow) ?? null;
}

/**
 * Batch: retorna Map<DataField, DataPointRow> para múltiples campos de un municipio.
 * Para cada campo, selecciona la fila con mayor prioridad de capa.
 */
export async function getDataPointsByFields(
  db: DrizzleDb,
  municipioId: string,
  campos: DataField[],
  anio: number
): Promise<Map<DataField, DataPointRow>> {
  if (campos.length === 0) return new Map();

  const rows = await db
    .select()
    .from(dataPoints)
    .where(
      and(
        eq(dataPoints.municipioId, municipioId),
        inArray(dataPoints.campo, campos),
        eq(dataPoints.anio, anio)
      )
    )
    .orderBy(CAPA_PRIORITY);

  // Keep only the best (first) row per campo
  const result = new Map<DataField, DataPointRow>();
  for (const row of rows) {
    const campo = row.campo as DataField;
    if (!result.has(campo)) {
      result.set(campo, row as DataPointRow);
    }
  }

  return result;
}

/**
 * Cross-municipio: retorna Map<municipioId, DataPointRow> para un campo en todos los municipios.
 * Útil para cálculos de ranking.
 */
export async function getDataPointsForField(
  db: DrizzleDb,
  campo: DataField,
  anio: number
): Promise<Map<string, DataPointRow>> {
  const rows = await db
    .select()
    .from(dataPoints)
    .where(
      and(
        eq(dataPoints.campo, campo),
        eq(dataPoints.anio, anio)
      )
    )
    .orderBy(CAPA_PRIORITY);

  // Keep only the best row per municipio
  const result = new Map<string, DataPointRow>();
  for (const row of rows) {
    if (!result.has(row.municipioId)) {
      result.set(row.municipioId, row as DataPointRow);
    }
  }

  return result;
}

/**
 * Todos los dataPoints de un municipio en un año.
 */
export async function getAllDataPointsForMunicipio(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<DataPointRow[]> {
  const rows = await db
    .select()
    .from(dataPoints)
    .where(
      and(
        eq(dataPoints.municipioId, municipioId),
        eq(dataPoints.anio, anio)
      )
    )
    .orderBy(dataPoints.campo, CAPA_PRIORITY);

  return rows as DataPointRow[];
}

/**
 * Cuenta cuántos campos distintos tiene un municipio en un año.
 * Útil para indicar completitud de datos.
 */
export async function countFieldsForMunicipio(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<number> {
  const result = await db
    .select({
      count: sql<number>`COUNT(DISTINCT campo)`,
    })
    .from(dataPoints)
    .where(
      and(
        eq(dataPoints.municipioId, municipioId),
        eq(dataPoints.anio, anio)
      )
    );

  return result[0]?.count ?? 0;
}
