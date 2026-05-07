import {
  type DocumentAudit,
  type AccessibilityAudit,
  DocumentFormat,
} from "@radar-municipal/core";
import type { CriterionResult } from "./publication";

/**
 * Mapea clicks desde home a score.
 * 1-2 clicks = 1.0, 3 = 0.7, 4 = 0.4, 5+ = 0.2, null/inaccesible = 0.0
 */
function clicksToScore(clicks: number | null, accesible: boolean): number {
  if (!accesible || clicks == null) return 0;
  if (clicks <= 2) return 1.0;
  if (clicks === 3) return 0.7;
  if (clicks === 4) return 0.4;
  return 0.2;
}

/** Formatos que se consideran machine-readable */
const MACHINE_READABLE_FORMATS = new Set([
  DocumentFormat.CSV,
  DocumentFormat.XLS,
  DocumentFormat.JSON,
  DocumentFormat.HTML,
]);

/**
 * Calcula el ratio de machine-readability sobre documentos publicados.
 * PDF parseable cuenta como machine-readable.
 */
function machineReadabilityRatio(documentos: DocumentAudit[]): {
  ratio: number;
  readable: number;
  total: number;
} {
  const published = documentos.filter((d) => d.publicado);
  if (published.length === 0) return { ratio: 0, readable: 0, total: 0 };

  const readable = published.filter((d) => {
    if (d.formato && MACHINE_READABLE_FORMATS.has(d.formato)) return true;
    if (d.formato === DocumentFormat.PDF && d.esParseable) return true;
    return false;
  }).length;

  return {
    ratio: readable / published.length,
    readable,
    total: published.length,
  };
}

/**
 * Evalúa los 3 criterios de accesibilidad:
 * - accesibilidad_clicks
 * - menu_transparencia
 * - machine_readability
 */
export function scoreAccessibility(
  accesibilidad: AccessibilityAudit,
  documentos: DocumentAudit[]
): CriterionResult[] {
  const results: CriterionResult[] = [];

  // 1. Clicks desde home
  const clickScore = clicksToScore(
    accesibilidad.clicksDesdeHome,
    accesibilidad.portalAccesible
  );
  results.push({
    criterio: "accesibilidad_clicks",
    valor: clickScore,
    evidencia: accesibilidad.portalAccesible
      ? accesibilidad.clicksDesdeHome != null
        ? `${accesibilidad.clicksDesdeHome} clicks desde la home hasta datos fiscales. Score: ${(clickScore * 100).toFixed(0)}%`
        : "Portal accesible pero no se determinó la cantidad de clicks"
      : "Portal no accesible",
  });

  // 2. Menú de transparencia visible
  results.push({
    criterio: "menu_transparencia",
    valor: accesibilidad.menuTransparenciaVisible ? 1 : 0,
    evidencia: accesibilidad.menuTransparenciaVisible
      ? "Menú o sección de transparencia visible en el sitio"
      : "No se encontró menú o sección de transparencia visible",
  });

  // 3. Machine readability
  const mr = machineReadabilityRatio(documentos);
  results.push({
    criterio: "machine_readability",
    valor: mr.ratio,
    evidencia:
      mr.total > 0
        ? `${mr.readable} de ${mr.total} documentos publicados en formatos reutilizables (${(mr.ratio * 100).toFixed(0)}%)`
        : "Sin documentos publicados para evaluar formatos",
  });

  return results;
}
