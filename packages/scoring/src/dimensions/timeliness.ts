import { type DocumentAudit, DocumentCategory } from "@radar-municipal/core";
import type { CriterionResult } from "./publication";

const MAX_REZAGO_DIAS = 180;

/**
 * Calcula el score de rezago (timeliness) de la ejecución presupuestaria.
 * Fórmula: max(0, 1 - días / 180)
 *   - 0 días = 1.0 (publicación inmediata)
 *   - 90 días = 0.5
 *   - 180+ días = 0.0
 */
export function scoreTimeliness(
  documentos: DocumentAudit[]
): CriterionResult & { rezagoDias: number | null } {
  const ejecucion = documentos.find(
    (d) => d.categoria === DocumentCategory.EJECUCION
  );

  if (!ejecucion || !ejecucion.publicado) {
    return {
      criterio: "rezago_dias",
      valor: 0,
      rezagoDias: null,
      evidencia: "Ejecución presupuestaria no publicada; rezago no calculable",
    };
  }

  if (!ejecucion.fechaPublicacion || !ejecucion.fechaCorte) {
    return {
      criterio: "rezago_dias",
      valor: 0,
      rezagoDias: null,
      evidencia:
        "Ejecución publicada pero sin fechas suficientes para calcular rezago",
    };
  }

  const fechaPub = new Date(ejecucion.fechaPublicacion);
  const fechaCorte = new Date(ejecucion.fechaCorte);
  const diffMs = fechaPub.getTime() - fechaCorte.getTime();
  const dias = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  const valor = Math.max(0, 1 - dias / MAX_REZAGO_DIAS);

  return {
    criterio: "rezago_dias",
    valor,
    rezagoDias: dias,
    evidencia: `Rezago de ${dias} días desde cierre (${ejecucion.fechaCorte}) hasta publicación (${ejecucion.fechaPublicacion}). Score: ${(valor * 100).toFixed(0)}%`,
  };
}
