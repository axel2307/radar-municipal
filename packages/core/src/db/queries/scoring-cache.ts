/**
 * Cache de scores calculados en la tabla transparency_scores.
 *
 * Almacena los scores de las 11 dimensiones y el score total ponderado
 * para evitar recalcular en cada request. Se invalida cuando se ingesan
 * nuevos datos para un municipio.
 */

import { eq, and, sql } from "drizzle-orm";
import type { DrizzleDb } from "./data-points";
import { transparencyScores } from "../schema";
import type { ScoringDimension, ScoringCategory } from "../../types/score";

/** Estructura de los scores cacheados por dimensión (stored as JSONB) */
export interface CachedDimensionScore {
  dimension: string; // ScoringDimension value
  score: number | null;
}

/** Row shape del cache */
export interface CachedScoreRow {
  municipioId: string;
  anio: number;
  trimestre: number | null;
  dimensionScores: CachedDimensionScore[];
  scoreTotal: number;
  categoryScores?: Record<string, number | null>;
  fechaCalculo: Date;
}

/** Default staleness threshold: 24 hours */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Obtiene scores cacheados si existen y no están stale.
 */
export async function getCachedScores(
  db: DrizzleDb,
  municipioId: string,
  anio: number,
  trimestre?: number | null,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<CachedScoreRow | null> {
  const conditions = [
    eq(transparencyScores.municipioId, municipioId),
    eq(transparencyScores.anio, anio),
  ];

  if (trimestre != null) {
    conditions.push(eq(transparencyScores.trimestre, trimestre));
  }

  const rows = await db
    .select()
    .from(transparencyScores)
    .where(and(...conditions))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];

  // Check staleness
  const age = Date.now() - row.fechaCalculo.getTime();
  if (age > ttlMs) return null;

  const evidencia = row.evidencia as Record<string, unknown> | null;

  return {
    municipioId: row.municipioId,
    anio: row.anio,
    trimestre: row.trimestre,
    dimensionScores: row.dimensionScores as CachedDimensionScore[],
    scoreTotal: row.scoreTotal,
    categoryScores: evidencia?.categoryScores as Record<string, number | null> | undefined,
    fechaCalculo: row.fechaCalculo,
  };
}

/**
 * Guarda/actualiza scores en el cache (UPSERT).
 */
export async function setCachedScores(
  db: DrizzleDb,
  municipioId: string,
  anio: number,
  dimensionScores: CachedDimensionScore[],
  scoreTotal: number,
  categoryScores?: Record<string, number | null>,
  trimestre?: number | null
): Promise<void> {
  const now = new Date();

  await db
    .insert(transparencyScores)
    .values({
      municipioId,
      anio,
      trimestre: trimestre ?? null,
      dimensionScores,
      scoreTotal,
      evidencia: categoryScores ? { categoryScores } : null,
      fechaCalculo: now,
    })
    .onConflictDoUpdate({
      target: [
        transparencyScores.municipioId,
        transparencyScores.anio,
        transparencyScores.trimestre,
      ],
      set: {
        dimensionScores,
        scoreTotal,
        evidencia: categoryScores ? { categoryScores } : null,
        fechaCalculo: now,
      },
    });
}

/**
 * Invalida el cache de scores para un municipio (o todos).
 */
export async function invalidateScoreCache(
  db: DrizzleDb,
  municipioId?: string,
  anio?: number
): Promise<number> {
  const conditions = [];

  if (municipioId) {
    conditions.push(eq(transparencyScores.municipioId, municipioId));
  }
  if (anio) {
    conditions.push(eq(transparencyScores.anio, anio));
  }

  if (conditions.length === 0) {
    // Delete all cache
    const result = await db.delete(transparencyScores);
    return 0; // drizzle doesn't return count easily
  }

  await db
    .delete(transparencyScores)
    .where(and(...conditions));

  return 0;
}

/**
 * Obtiene todos los scores cacheados para un año (para ranking bulk).
 * No filtra por TTL — el caller decide si recalcular.
 */
export async function getAllCachedScores(
  db: DrizzleDb,
  anio: number
): Promise<Map<string, CachedScoreRow>> {
  const rows = await db
    .select()
    .from(transparencyScores)
    .where(eq(transparencyScores.anio, anio));

  const result = new Map<string, CachedScoreRow>();
  for (const row of rows) {
    const evidencia = row.evidencia as Record<string, unknown> | null;
    result.set(row.municipioId, {
      municipioId: row.municipioId,
      anio: row.anio,
      trimestre: row.trimestre,
      dimensionScores: row.dimensionScores as CachedDimensionScore[],
      scoreTotal: row.scoreTotal,
      categoryScores: evidencia?.categoryScores as Record<string, number | null> | undefined,
      fechaCalculo: row.fechaCalculo,
    });
  }

  return result;
}

/**
 * Verifica si un municipio tiene cache fresco.
 */
export async function isCacheFresh(
  db: DrizzleDb,
  municipioId: string,
  anio: number,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<boolean> {
  const cached = await getCachedScores(db, municipioId, anio, null, ttlMs);
  return cached !== null;
}
