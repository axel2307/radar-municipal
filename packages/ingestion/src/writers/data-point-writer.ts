/**
 * Escritor de dataPoints en la base de datos.
 *
 * Usa UPSERT (ON CONFLICT DO UPDATE) para idempotencia:
 * si ya existe un dataPoint con el mismo (municipioId, campo, anio, trimestre, fuenteCapa),
 * se actualiza el valor y metadatos.
 */

import { sql } from "drizzle-orm";
import { dataPoints, invalidateScoreCache, type DrizzleDb } from "@radar-municipal/core/db";

/** Shape for inserting a dataPoint */
export interface DataPointInsert {
  municipioId: string;
  campo: string;
  anio: number;
  trimestre?: number | null;
  fechaCorte?: Date | null;
  valorNumerico?: number | null;
  valorTexto?: string | null;
  valorBooleano?: boolean | null;
  unidad?: string | null;
  fuenteCapa: string;
  fuenteOrganismo: string;
  fuenteUrl?: string | null;
  fuenteFormato?: string | null;
  fuenteFechaAcceso: Date;
  fuenteFechaPublicacion?: Date | null;
  confianzaNivel: string;
  confianzaNotas?: string | null;
  confianzaValidadoContra?: string | null;
}

/**
 * Inserta o actualiza un solo dataPoint.
 */
export async function upsertDataPoint(
  db: DrizzleDb,
  point: DataPointInsert
): Promise<void> {
  await db
    .insert(dataPoints)
    .values({
      municipioId: point.municipioId,
      campo: point.campo,
      anio: point.anio,
      trimestre: point.trimestre ?? null,
      fechaCorte: point.fechaCorte ?? null,
      valorNumerico: point.valorNumerico ?? null,
      valorTexto: point.valorTexto ?? null,
      valorBooleano: point.valorBooleano ?? null,
      unidad: point.unidad ?? null,
      fuenteCapa: point.fuenteCapa,
      fuenteOrganismo: point.fuenteOrganismo,
      fuenteUrl: point.fuenteUrl ?? null,
      fuenteFormato: point.fuenteFormato ?? null,
      fuenteFechaAcceso: point.fuenteFechaAcceso,
      fuenteFechaPublicacion: point.fuenteFechaPublicacion ?? null,
      confianzaNivel: point.confianzaNivel,
      confianzaNotas: point.confianzaNotas ?? null,
      confianzaValidadoContra: point.confianzaValidadoContra ?? null,
    })
    .onConflictDoUpdate({
      target: [
        dataPoints.municipioId,
        dataPoints.campo,
        dataPoints.anio,
        dataPoints.trimestre,
        dataPoints.fuenteCapa,
      ],
      set: {
        valorNumerico: point.valorNumerico ?? null,
        valorTexto: point.valorTexto ?? null,
        valorBooleano: point.valorBooleano ?? null,
        unidad: point.unidad ?? null,
        fuenteOrganismo: point.fuenteOrganismo,
        fuenteUrl: point.fuenteUrl ?? null,
        fuenteFormato: point.fuenteFormato ?? null,
        fuenteFechaAcceso: point.fuenteFechaAcceso,
        fuenteFechaPublicacion: point.fuenteFechaPublicacion ?? null,
        confianzaNivel: point.confianzaNivel,
        confianzaNotas: point.confianzaNotas ?? null,
        confianzaValidadoContra: point.confianzaValidadoContra ?? null,
      },
    });
}

/** Batch insert/update result */
export interface BatchResult {
  total: number;
  errors: string[];
}

/** Chunk size for batch inserts (Postgres parameter limit ~65535 / ~20 params per row) */
const CHUNK_SIZE = 100;

/**
 * Inserta o actualiza un batch de dataPoints.
 * Chunked en lotes de CHUNK_SIZE para respetar límites de parámetros PG.
 * Al final, invalida el cache de scores para los municipios afectados.
 */
export async function upsertDataPointsBatch(
  db: DrizzleDb,
  points: DataPointInsert[]
): Promise<BatchResult> {
  const errors: string[] = [];

  // Process in chunks
  for (let i = 0; i < points.length; i += CHUNK_SIZE) {
    const chunk = points.slice(i, i + CHUNK_SIZE);

    try {
      // Use individual upserts for simplicity with ON CONFLICT
      // (Drizzle's batch insert doesn't support per-row conflict resolution well)
      for (const point of chunk) {
        await upsertDataPoint(db, point);
      }
    } catch (err) {
      errors.push(
        `Error en chunk ${Math.floor(i / CHUNK_SIZE)}: ${(err as Error).message}`
      );
    }
  }

  // Invalidate score cache for affected municipios
  const affectedMunicipios = new Set(points.map((p) => p.municipioId));
  for (const municipioId of affectedMunicipios) {
    try {
      await invalidateScoreCache(db, municipioId);
    } catch {
      // Non-fatal: cache will expire naturally
    }
  }

  return { total: points.length, errors };
}
