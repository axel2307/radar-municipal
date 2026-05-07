export enum ScoringDimension {
  // ─── Existentes ───
  TRANSPARENCIA = "TRANSPARENCIA",
  FISCAL = "FISCAL",
  NORMATIVA = "NORMATIVA",
  COMPRAS = "COMPRAS",
  CALIDAD_DATOS = "CALIDAD_DATOS",

  // ─── Nuevas: ciudadanas ───
  SERVICIOS_BASICOS = "SERVICIOS_BASICOS",
  EDUCACION_SALUD = "EDUCACION_SALUD",
  CONECTIVIDAD_DIGITAL = "CONECTIVIDAD_DIGITAL",
  ESPACIO_PUBLICO = "ESPACIO_PUBLICO",
  SEGURIDAD_VIAL = "SEGURIDAD_VIAL",
  PARTICIPACION_CIUDADANA = "PARTICIPACION_CIUDADANA",

  // ─── Nuevas: económicas ───
  GASTO_POR_FUNCION = "GASTO_POR_FUNCION",
  ECONOMIA_LOCAL = "ECONOMIA_LOCAL",
  PRESION_IMPOSITIVA = "PRESION_IMPOSITIVA",
}

/**
 * Categorías que agrupan dimensiones para el ranking.
 * Cada categoría tiene un peso en el score total.
 */
export enum ScoringCategory {
  GOBIERNO_ABIERTO = "GOBIERNO_ABIERTO",
  ECONOMIA_FINANZAS = "ECONOMIA_FINANZAS",
  CALIDAD_DE_VIDA = "CALIDAD_DE_VIDA",
  INFRAESTRUCTURA_MOVILIDAD = "INFRAESTRUCTURA_MOVILIDAD",
}

export interface CategoryConfig {
  label: string;
  description: string;
  peso: number;
  color: string;
  textColor: string;
  dimensions: { dimension: ScoringDimension; pesoEnCategoria: number }[];
}

export const SCORING_CATEGORIES: Record<ScoringCategory, CategoryConfig> = {
  [ScoringCategory.GOBIERNO_ABIERTO]: {
    label: "Gobierno Abierto",
    description: "Transparencia, normativa y participación ciudadana",
    peso: 0.25,
    color: "bg-blue-100",
    textColor: "text-blue-700",
    dimensions: [
      { dimension: ScoringDimension.TRANSPARENCIA, pesoEnCategoria: 0.40 },
      { dimension: ScoringDimension.NORMATIVA, pesoEnCategoria: 0.30 },
      { dimension: ScoringDimension.PARTICIPACION_CIUDADANA, pesoEnCategoria: 0.30 },
    ],
  },
  [ScoringCategory.ECONOMIA_FINANZAS]: {
    label: "Economía y Finanzas",
    description: "Salud fiscal, composición del gasto y economía local",
    peso: 0.30,
    color: "bg-amber-100",
    textColor: "text-amber-700",
    dimensions: [
      { dimension: ScoringDimension.FISCAL, pesoEnCategoria: 0.25 },
      { dimension: ScoringDimension.GASTO_POR_FUNCION, pesoEnCategoria: 0.30 },
      { dimension: ScoringDimension.ECONOMIA_LOCAL, pesoEnCategoria: 0.30 },
      { dimension: ScoringDimension.PRESION_IMPOSITIVA, pesoEnCategoria: 0.15 },
    ],
  },
  [ScoringCategory.CALIDAD_DE_VIDA]: {
    label: "Calidad de Vida",
    description: "Servicios básicos, educación, salud, conectividad y espacio público",
    peso: 0.30,
    color: "bg-green-100",
    textColor: "text-green-700",
    dimensions: [
      { dimension: ScoringDimension.SERVICIOS_BASICOS, pesoEnCategoria: 0.30 },
      { dimension: ScoringDimension.EDUCACION_SALUD, pesoEnCategoria: 0.30 },
      { dimension: ScoringDimension.CONECTIVIDAD_DIGITAL, pesoEnCategoria: 0.20 },
      { dimension: ScoringDimension.ESPACIO_PUBLICO, pesoEnCategoria: 0.20 },
    ],
  },
  [ScoringCategory.INFRAESTRUCTURA_MOVILIDAD]: {
    label: "Infraestructura y Movilidad",
    description: "Seguridad vial, estado de rutas y transporte",
    peso: 0.15,
    color: "bg-violet-100",
    textColor: "text-violet-700",
    dimensions: [
      { dimension: ScoringDimension.SEGURIDAD_VIAL, pesoEnCategoria: 1.0 },
    ],
  },
};

/** Result of the weighted total computation */
export interface WeightedTotalResult {
  scoreTotal: number;
  categoryScores: Record<ScoringCategory, number | null>;
}

/**
 * Compute weighted total score using SCORING_CATEGORIES configuration.
 *
 * Graceful degradation:
 * 1. If a dimension within a category has no data (null), redistribute its
 *    pesoEnCategoria proportionally among sibling dimensions that do have data.
 * 2. If ALL dimensions in a category have no data, set that category to null
 *    and redistribute its peso among categories that do have scores.
 * 3. If everything is null, return 0.
 */
export function computeWeightedTotal(
  dims: Map<ScoringDimension, number | null>
): WeightedTotalResult {
  const categoryScores: Record<string, number | null> = {};
  const categoryWeights: { category: ScoringCategory; peso: number; score: number }[] = [];

  for (const [cat, config] of Object.entries(SCORING_CATEGORIES) as [ScoringCategory, CategoryConfig][]) {
    const present = config.dimensions.filter(
      (d) => dims.has(d.dimension) && dims.get(d.dimension) != null
    );

    if (present.length === 0) {
      categoryScores[cat] = null;
      continue;
    }

    const totalPesoPresent = present.reduce((s, d) => s + d.pesoEnCategoria, 0);
    let catScore = 0;
    for (const d of present) {
      const normalizedWeight = d.pesoEnCategoria / totalPesoPresent;
      catScore += dims.get(d.dimension)! * normalizedWeight;
    }
    catScore = Math.round(catScore * 10) / 10;
    categoryScores[cat] = catScore;
    categoryWeights.push({ category: cat, peso: config.peso, score: catScore });
  }

  if (categoryWeights.length === 0) {
    return {
      scoreTotal: 0,
      categoryScores: categoryScores as Record<ScoringCategory, number | null>,
    };
  }

  const totalPesoPresent = categoryWeights.reduce((s, c) => s + c.peso, 0);
  let scoreTotal = 0;
  for (const c of categoryWeights) {
    scoreTotal += c.score * (c.peso / totalPesoPresent);
  }
  scoreTotal = Math.round(scoreTotal * 10) / 10;

  return {
    scoreTotal,
    categoryScores: categoryScores as Record<ScoringCategory, number | null>,
  };
}

export interface DimensionScore {
  dimension: ScoringDimension;
  score: number;
  maxScore: number;
  details: string;
}

export interface ScoreEvidence {
  documentId: number | null;
  criterio: string;
  valor: number;
  peso: number;
}

export interface TransparencyScore {
  id: number;
  municipioId: string;
  anio: number;
  trimestre: number | null;
  dimensionScores: DimensionScore[];
  scoreTotal: number;
  evidencia: ScoreEvidence[];
  fechaCalculo: string;
}
