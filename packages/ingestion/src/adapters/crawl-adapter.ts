/**
 * Convierte CrawlResult + SibomResult en DataPointInsert[]
 * para las dimensiones de TRANSPARENCIA y NORMATIVA.
 */

import { DataField, SourceLayer, ConfidenceLevel } from "@radar-municipal/core";
import type { DataPointInsert } from "../writers/data-point-writer";
import type { CrawlDocumentInput } from "../writers/document-writer";
import { crawlResultSchema, sibomResultSchema } from "../schemas";

/** Simplified crawl result shape */
interface CrawlResultShape {
  municipioId: string;
  portalUrl: string;
  portalAccesible: boolean;
  documentos: CrawlDocumentInput[];
}

/** Simplified SIBOM result shape */
interface SibomResultShape {
  municipioId: string;
  normasEncontradas: number;
  tieneBoletinSibom: boolean;
  boletinesPublicados: number;
  ordenanzaFiscalVigente: boolean;
  ordenanzaFiscalUrl?: string | null;
}

/**
 * Convierte resultados de crawl en dataPoints booleanos de transparencia.
 */
export function crawlToTransparenciaDataPoints(
  crawl: CrawlResultShape,
  anio: number
): DataPointInsert[] {
  const parseResult = crawlResultSchema.safeParse(crawl);
  if (!parseResult.success) {
    console.error("Validation failed for CrawlResult input:", parseResult.error.format());
    throw new Error(`Invalid CrawlResult: ${parseResult.error.issues.length} issue(s)`);
  }

  const points: DataPointInsert[] = [];
  const now = new Date();

  const CATEGORY_FIELD_MAP: Record<string, DataField> = {
    PRESUPUESTO: DataField.PRESUPUESTO_PUBLICADO,
    EJECUCION: DataField.EJECUCION_PUBLICADA,
    SEF: DataField.SEF_PUBLICADO,
    DEUDA: DataField.DEUDA_PUBLICADA,
    FINALIDAD_FUNCION: DataField.FINALIDAD_FUNCION_PUBLICADA,
  };

  for (const [cat, field] of Object.entries(CATEGORY_FIELD_MAP)) {
    const doc = crawl.documentos.find((d) => d.categoria === cat);
    points.push({
      municipioId: crawl.municipioId,
      campo: field,
      anio,
      valorBooleano: !!doc,
      fuenteCapa: SourceLayer.MUNICIPAL,
      fuenteOrganismo: "PORTAL_MUNICIPAL",
      fuenteUrl: doc?.url ?? crawl.portalUrl,
      fuenteFormato: doc?.formato ?? null,
      fuenteFechaAcceso: now,
      confianzaNivel: ConfidenceLevel.ALTA,
      confianzaNotas: doc ? null : "No detectado en crawl automático",
    });
  }

  return points;
}

/**
 * Convierte resultados de SIBOM en dataPoints para NORMATIVA.
 */
export function sibomToNormativaDataPoints(
  sibom: SibomResultShape,
  anio: number
): DataPointInsert[] {
  const parseResult = sibomResultSchema.safeParse(sibom);
  if (!parseResult.success) {
    console.error("Validation failed for SibomResult input:", parseResult.error.format());
    throw new Error(`Invalid SibomResult: ${parseResult.error.issues.length} issue(s)`);
  }

  const points: DataPointInsert[] = [];
  const now = new Date();

  points.push({
    municipioId: sibom.municipioId,
    campo: DataField.BOLETIN_SIBOM,
    anio,
    valorBooleano: sibom.tieneBoletinSibom,
    valorNumerico: sibom.boletinesPublicados,
    fuenteCapa: SourceLayer.PROVINCIAL,
    fuenteOrganismo: "SIBOM_SLYT",
    fuenteUrl: `https://sibom.slyt.gba.gob.ar`,
    fuenteFechaAcceso: now,
    confianzaNivel: ConfidenceLevel.ALTA,
  });

  points.push({
    municipioId: sibom.municipioId,
    campo: DataField.ORDENANZA_FISCAL_VIGENTE,
    anio,
    valorBooleano: sibom.ordenanzaFiscalVigente,
    fuenteCapa: SourceLayer.PROVINCIAL,
    fuenteOrganismo: "SIBOM_SLYT",
    fuenteUrl: sibom.ordenanzaFiscalUrl ?? `https://sibom.slyt.gba.gob.ar`,
    fuenteFechaAcceso: now,
    confianzaNivel: ConfidenceLevel.ALTA,
  });

  return points;
}
