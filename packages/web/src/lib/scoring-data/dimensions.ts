import {
  ScoringDimension,
  SCORING_DIMENSION_LABELS,
} from "@radar-municipal/core";

import type { RankingEntry } from "./types";
import { getRanking } from "./ranking";

/** Dimension slug to score field mapping */
const DIMENSION_SLUG_MAP: Record<string, { dimension: ScoringDimension; scoreField: keyof RankingEntry }> = {
  transparencia: { dimension: ScoringDimension.TRANSPARENCIA, scoreField: "scoreTransparencia" },
  fiscal: { dimension: ScoringDimension.FISCAL, scoreField: "scoreFiscal" },
  normativa: { dimension: ScoringDimension.NORMATIVA, scoreField: "scoreNormativa" },
  "participacion-ciudadana": { dimension: ScoringDimension.PARTICIPACION_CIUDADANA, scoreField: "scoreParticipacion" },
  "gasto-por-funcion": { dimension: ScoringDimension.GASTO_POR_FUNCION, scoreField: "scoreGastoFuncion" },
  "economia-local": { dimension: ScoringDimension.ECONOMIA_LOCAL, scoreField: "scoreEconomiaLocal" },
  "servicios-basicos": { dimension: ScoringDimension.SERVICIOS_BASICOS, scoreField: "scoreServiciosBasicos" },
  "educacion-salud": { dimension: ScoringDimension.EDUCACION_SALUD, scoreField: "scoreEducacionSalud" },
  "conectividad-digital": { dimension: ScoringDimension.CONECTIVIDAD_DIGITAL, scoreField: "scoreConectividad" },
  "espacio-publico": { dimension: ScoringDimension.ESPACIO_PUBLICO, scoreField: "scoreEspacioPublico" },
  "seguridad-vial": { dimension: ScoringDimension.SEGURIDAD_VIAL, scoreField: "scoreSeguridadVial" },
  "presion-impositiva": { dimension: ScoringDimension.PRESION_IMPOSITIVA, scoreField: "scorePresionImpositiva" },
};

export function getDimensionSlugs(): string[] {
  return Object.keys(DIMENSION_SLUG_MAP);
}

export function getDimensionBySlug(slug: string): {
  dimension: ScoringDimension;
  label: string;
  ranking: { municipioId: string; nombre: string; score: number | null; posicion: number }[];
} | null {
  const entry = DIMENSION_SLUG_MAP[slug];
  if (!entry) return null;

  const allRanking = getRanking();
  const ranked = allRanking
    .map((r) => ({
      municipioId: r.municipio.id,
      nombre: r.municipio.nombre,
      score: r[entry.scoreField] as number | null,
    }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .map((item, i) => ({ ...item, posicion: i + 1 }));

  return {
    dimension: entry.dimension,
    label: SCORING_DIMENSION_LABELS[entry.dimension],
    ranking: ranked,
  };
}

export { DIMENSION_SLUG_MAP };
