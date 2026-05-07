import {
  type DocumentAudit,
  DocumentCategory,
  DOCUMENT_CATEGORY_LABELS,
} from "@radar-municipal/core";

export interface CriterionResult {
  criterio: string;
  valor: number;
  evidencia: string;
}

const PUBLICATION_CRITERIA: { criterio: string; categoria: DocumentCategory }[] = [
  { criterio: "presupuesto_publicado", categoria: DocumentCategory.PRESUPUESTO },
  { criterio: "ejecucion_publicada", categoria: DocumentCategory.EJECUCION },
  { criterio: "finalidad_funcion", categoria: DocumentCategory.FINALIDAD_FUNCION },
  { criterio: "deuda_publicada", categoria: DocumentCategory.DEUDA },
];

/**
 * Evalúa si los 4 documentos fiscales clave están publicados.
 * Retorna 1.0 si publicado, 0.0 si no.
 */
export function scorePublication(documentos: DocumentAudit[]): CriterionResult[] {
  return PUBLICATION_CRITERIA.map(({ criterio, categoria }) => {
    const doc = documentos.find((d) => d.categoria === categoria);
    const label = DOCUMENT_CATEGORY_LABELS[categoria];

    if (!doc || !doc.publicado) {
      return {
        criterio,
        valor: 0,
        evidencia: `${label}: no publicado`,
      };
    }

    const parts = [label, "publicado"];
    if (doc.formato) parts.push(`en formato ${doc.formato}`);
    if (doc.anio) parts.push(`(${doc.anio}${doc.trimestre ? ` T${doc.trimestre}` : ""})`);
    if (doc.url) parts.push(`[fuente]`);

    return {
      criterio,
      valor: 1,
      evidencia: parts.join(" "),
    };
  });
}
