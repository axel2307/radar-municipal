/**
 * DB-backed scoring data service.
 *
 * Replaces the JSON-loading service with PostgreSQL queries.
 * All functions are async (DB access). Uses the scoring cache
 * for performance.
 *
 * The public API is identical to scoring-data.ts but async,
 * so routes need minimal changes (add `await`).
 */

import {
  MUNICIPIOS,
  type Municipio,
  getMunicipioById as getMunById,
  ScoringDimension,
  ScoringCategory,
  computeWeightedTotal,
  flattenFiscalIndicator,
  FISCAL_PRIMARY_FIELDS,
  type FiscalPrimaryField,
  type SourcedValue,
} from "@radar-municipal/core";
import {
  type DrizzleDb,
  getAllScoringInputs,
  getFiscalInput,
  getTransparenciaInput,
  getNormativaInput,
  getCachedScores,
  setCachedScores,
  getAllCachedScores,
  countFieldsForMunicipio,
  type CachedDimensionScore,
} from "@radar-municipal/core/db";
import {
  calculateTransparencyScore,
  getScoreBreakdown,
  scoreFiscalSourced,
  scoreNormativa,
  scoreServiciosBasicos,
  scoreParticipacion,
  scoreEducacionSalud,
  scoreConectividad,
  scoreEconomiaLocal,
  scoreGastoFuncion,
  scoreSeguridadVial,
  scoreEspacioPublico,
  type FiscalScoreResult,
  type NormativaScoreResult,
  type CriterionBreakdown,
} from "@radar-municipal/scoring";

const DEFAULT_ANIO = 2025;

// ─────────────────────────────────────────
// Score calculation with caching
// ─────────────────────────────────────────

/**
 * Calculate all 11 dimension scores for a municipality.
 * Uses cache if available and fresh; otherwise computes and caches.
 */
async function computeAllScores(
  db: DrizzleDb,
  municipioId: string,
  anio: number = DEFAULT_ANIO
): Promise<{
  dimensionScores: Map<ScoringDimension, number | null>;
  scoreTotal: number;
  categoryScores: Record<ScoringCategory, number | null>;
} | null> {
  // Check cache first
  const cached = await getCachedScores(db, municipioId, anio);
  if (cached) {
    const dimMap = new Map<ScoringDimension, number | null>();
    for (const ds of cached.dimensionScores) {
      dimMap.set(ds.dimension as ScoringDimension, ds.score);
    }
    return {
      dimensionScores: dimMap,
      scoreTotal: cached.scoreTotal,
      categoryScores: (cached.categoryScores ?? {}) as Record<ScoringCategory, number | null>,
    };
  }

  // Compute fresh
  const inputs = await getAllScoringInputs(db, municipioId, anio);

  const dimScores = new Map<ScoringDimension, number | null>();

  // Transparencia
  if (inputs.transparencia) {
    try {
      const ts = calculateTransparencyScore(inputs.transparencia);
      dimScores.set(ScoringDimension.TRANSPARENCIA, ts.scoreTotal);
    } catch {
      dimScores.set(ScoringDimension.TRANSPARENCIA, null);
    }
  } else {
    dimScores.set(ScoringDimension.TRANSPARENCIA, null);
  }

  // Fiscal
  if (inputs.fiscal) {
    try {
      const fs = scoreFiscalSourced(inputs.fiscal);
      dimScores.set(ScoringDimension.FISCAL, fs.scoreTotal);
    } catch {
      dimScores.set(ScoringDimension.FISCAL, null);
    }
  } else {
    dimScores.set(ScoringDimension.FISCAL, null);
  }

  // Normativa
  if (inputs.normativa) {
    try {
      const ns = scoreNormativa(inputs.normativa);
      dimScores.set(ScoringDimension.NORMATIVA, ns.scoreTotal);
    } catch {
      dimScores.set(ScoringDimension.NORMATIVA, null);
    }
  } else {
    dimScores.set(ScoringDimension.NORMATIVA, null);
  }

  // Simple dimensions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simpleDims: [unknown, ScoringDimension, (input: any) => { scoreTotal: number }][] = [
    [inputs.serviciosBasicos, ScoringDimension.SERVICIOS_BASICOS, scoreServiciosBasicos],
    [inputs.participacion, ScoringDimension.PARTICIPACION_CIUDADANA, scoreParticipacion],
    [inputs.educacionSalud, ScoringDimension.EDUCACION_SALUD, scoreEducacionSalud],
    [inputs.conectividad, ScoringDimension.CONECTIVIDAD_DIGITAL, scoreConectividad],
    [inputs.economiaLocal, ScoringDimension.ECONOMIA_LOCAL, scoreEconomiaLocal],
    [inputs.gastoFuncion, ScoringDimension.GASTO_POR_FUNCION, scoreGastoFuncion],
    [inputs.seguridadVial, ScoringDimension.SEGURIDAD_VIAL, scoreSeguridadVial],
    [inputs.espacioPublico, ScoringDimension.ESPACIO_PUBLICO, scoreEspacioPublico],
  ];

  for (const [input, dim, scorer] of simpleDims) {
    if (input) {
      try {
        const result = scorer(input);
        dimScores.set(dim, result.scoreTotal);
      } catch {
        dimScores.set(dim, null);
      }
    } else {
      dimScores.set(dim, null);
    }
  }

  const weighted = computeWeightedTotal(dimScores);

  // Cache results
  const cacheEntries: CachedDimensionScore[] = [];
  for (const [dim, score] of dimScores) {
    cacheEntries.push({ dimension: dim, score });
  }

  try {
    await setCachedScores(
      db,
      municipioId,
      anio,
      cacheEntries,
      weighted.scoreTotal,
      weighted.categoryScores
    );
  } catch {
    // Non-fatal: cache write failure
  }

  return {
    dimensionScores: dimScores,
    scoreTotal: weighted.scoreTotal,
    categoryScores: weighted.categoryScores,
  };
}

// ─────────────────────────────────────────
// Public API (async versions)
// ─────────────────────────────────────────

export function getAllMunicipios(filters?: {
  piloto?: boolean;
  q?: string;
}): Municipio[] {
  let result = MUNICIPIOS;
  if (filters?.piloto) {
    result = result.filter((m) => m.esPiloto);
  }
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    result = result.filter(
      (m) =>
        m.nombre.toLowerCase().includes(q) ||
        m.partido.toLowerCase().includes(q)
    );
  }
  return result;
}

export function getMunicipioById(id: string): Municipio | undefined {
  return MUNICIPIOS.find((m) => m.id === id);
}

export async function getRanking(
  db: DrizzleDb,
  options?: { categoria?: ScoringCategory; anio?: number }
) {
  const anio = options?.anio ?? DEFAULT_ANIO;

  // Compute scores for ALL municipalities (not just pilots)
  const entries = await Promise.all(
    MUNICIPIOS.map(async (m) => {
      const scores = await computeAllScores(db, m.id, anio);
      const fieldCount = await countFieldsForMunicipio(db, m.id, anio);

      return {
        municipioId: m.id,
        nombre: m.nombre,
        partido: m.partido,
        poblacion: m.poblacion,
        superficieKm2: m.superficieKm2,
        scoreTransparencia: scores?.dimensionScores.get(ScoringDimension.TRANSPARENCIA) ?? null,
        scoreFiscal: scores?.dimensionScores.get(ScoringDimension.FISCAL) ?? null,
        scoreNormativa: scores?.dimensionScores.get(ScoringDimension.NORMATIVA) ?? null,
        scoreServiciosBasicos: scores?.dimensionScores.get(ScoringDimension.SERVICIOS_BASICOS) ?? null,
        scoreParticipacion: scores?.dimensionScores.get(ScoringDimension.PARTICIPACION_CIUDADANA) ?? null,
        scoreEducacionSalud: scores?.dimensionScores.get(ScoringDimension.EDUCACION_SALUD) ?? null,
        scoreConectividad: scores?.dimensionScores.get(ScoringDimension.CONECTIVIDAD_DIGITAL) ?? null,
        scoreEconomiaLocal: scores?.dimensionScores.get(ScoringDimension.ECONOMIA_LOCAL) ?? null,
        scoreGastoFuncion: scores?.dimensionScores.get(ScoringDimension.GASTO_POR_FUNCION) ?? null,
        scoreSeguridadVial: scores?.dimensionScores.get(ScoringDimension.SEGURIDAD_VIAL) ?? null,
        scoreEspacioPublico: scores?.dimensionScores.get(ScoringDimension.ESPACIO_PUBLICO) ?? null,
        scoreTotal: scores?.scoreTotal ?? 0,
        categoryScores: scores?.categoryScores ?? {} as Record<ScoringCategory, number | null>,
        cantidadCampos: fieldCount,
      };
    })
  );

  // Filter out municipalities with no data at all (optional)
  const withData = entries.filter((e) => e.cantidadCampos > 0 || e.scoreTotal > 0);

  return withData
    .sort((a, b) => {
      if (options?.categoria) {
        const catA = a.categoryScores[options.categoria] ?? -1;
        const catB = b.categoryScores[options.categoria] ?? -1;
        return catB - catA;
      }
      return b.scoreTotal - a.scoreTotal;
    })
    .map((entry, i) => ({ ...entry, posicion: i + 1 }));
}

export async function getMunicipioScores(
  db: DrizzleDb,
  municipioId: string,
  anio: number = DEFAULT_ANIO
) {
  return computeAllScores(db, municipioId, anio);
}

export async function getMunicipioFiscalScore(
  db: DrizzleDb,
  municipioId: string,
  anio: number = DEFAULT_ANIO
): Promise<FiscalScoreResult | null> {
  const input = await getFiscalInput(db, municipioId, anio);
  if (!input) return null;
  return scoreFiscalSourced(input);
}

export async function getMunicipioNormativaScore(
  db: DrizzleDb,
  municipioId: string,
  anio: number = DEFAULT_ANIO
): Promise<NormativaScoreResult | null> {
  const { getNormativaInput: getNorm } = await import("@radar-municipal/core/db");
  const input = await getNorm(db, municipioId, anio);
  if (!input) return null;
  return scoreNormativa(input);
}

export async function getMunicipioBreakdown(
  db: DrizzleDb,
  municipioId: string,
  anio: number = DEFAULT_ANIO
): Promise<CriterionBreakdown[] | null> {
  const input = await getTransparenciaInput(db, municipioId, anio);
  if (!input) return null;
  return getScoreBreakdown(input);
}

export function getAuditDate(): string {
  return new Date().toISOString().slice(0, 10);
}
