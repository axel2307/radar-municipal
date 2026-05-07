import {
  type PilotAuditEntry,
  type PilotAuditData,
  type TransparencyScore,
  type DimensionScore,
  type ScoreEvidence,
  ScoringDimension,
  TRANSPARENCY_WEIGHTS,
} from "@radar-municipal/core";
import { scorePublication } from "../dimensions/publication";
import { scoreTimeliness } from "../dimensions/timeliness";
import { scoreAccessibility } from "../dimensions/accessibility";

/**
 * Calcula el TransparencyScore completo para un municipio a partir de su auditoría.
 */
export function calculateTransparencyScore(
  audit: PilotAuditEntry
): TransparencyScore {
  // 1. Evaluar cada grupo de criterios
  const publicationResults = scorePublication(audit.documentos);
  const timelinessResult = scoreTimeliness(audit.documentos);
  const accessibilityResults = scoreAccessibility(
    audit.accesibilidad,
    audit.documentos
  );

  // 2. Combinar todos los resultados
  const allResults = [
    ...publicationResults,
    timelinessResult,
    ...accessibilityResults,
  ];

  // 3. Calcular score ponderado (0-100)
  let scoreTotal = 0;
  const evidencia: ScoreEvidence[] = [];

  for (const result of allResults) {
    const weight = TRANSPARENCY_WEIGHTS.find(
      (w) => w.criterio === result.criterio
    );
    if (!weight) continue;

    const weighted = result.valor * weight.peso * 100;
    scoreTotal += weighted;

    evidencia.push({
      documentId: null,
      criterio: result.criterio,
      valor: result.valor,
      peso: weight.peso,
    });
  }

  // Redondear a 1 decimal
  scoreTotal = Math.round(scoreTotal * 10) / 10;

  // 4. Construir DimensionScore
  const dimensionScores: DimensionScore[] = [
    {
      dimension: ScoringDimension.TRANSPARENCIA,
      score: scoreTotal,
      maxScore: 100,
      details: `Score calculado sobre ${allResults.length} criterios con datos de auditoría del ${audit.fechaAuditoria}`,
    },
  ];

  return {
    id: 0,
    municipioId: audit.municipioId,
    anio: new Date(audit.fechaAuditoria).getFullYear(),
    trimestre: null,
    dimensionScores,
    scoreTotal,
    evidencia,
    fechaCalculo: new Date().toISOString(),
  };
}

/**
 * Calcula scores para todos los municipios de un dataset de auditoría.
 */
export function calculateAllPilotScores(
  auditData: PilotAuditData
): Map<string, TransparencyScore> {
  const scores = new Map<string, TransparencyScore>();
  for (const audit of auditData) {
    scores.set(audit.municipioId, calculateTransparencyScore(audit));
  }
  return scores;
}

/**
 * Resultado detallado por criterio para mostrar desglose en UI.
 */
export interface CriterionBreakdown {
  criterio: string;
  descripcion: string;
  valor: number;
  peso: number;
  contribucion: number;
  evidencia: string;
}

/**
 * Obtiene el desglose detallado de cada criterio para un municipio.
 */
export function getScoreBreakdown(
  audit: PilotAuditEntry
): CriterionBreakdown[] {
  const publicationResults = scorePublication(audit.documentos);
  const timelinessResult = scoreTimeliness(audit.documentos);
  const accessibilityResults = scoreAccessibility(
    audit.accesibilidad,
    audit.documentos
  );

  const allResults = [
    ...publicationResults,
    timelinessResult,
    ...accessibilityResults,
  ];

  return allResults
    .map((result) => {
      const weight = TRANSPARENCY_WEIGHTS.find(
        (w) => w.criterio === result.criterio
      );
      if (!weight) return null;

      return {
        criterio: result.criterio,
        descripcion: weight.descripcion,
        valor: result.valor,
        peso: weight.peso,
        contribucion: Math.round(result.valor * weight.peso * 100 * 10) / 10,
        evidencia: result.evidencia,
      };
    })
    .filter((r): r is CriterionBreakdown => r != null);
}
