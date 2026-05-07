/**
 * Normalizer: convierte resultados de crawl en formato PilotAuditEntry
 * compatible con el scoring engine.
 *
 * Toma los resultados crudos del crawler y los transforma a la estructura
 * estandarizada que el scoring engine espera.
 */

import {
  DocumentCategory,
  DocumentFormat,
  type DocumentAudit,
  type AccessibilityAudit,
  type PilotAuditEntry,
} from "@radar-municipal/core";
import type { CrawlResult, DetectedDocument, SibomResult } from "../types";

/** Categorías de documento fiscal obligatorias para el ranking */
const REQUIRED_CATEGORIES: DocumentCategory[] = [
  DocumentCategory.PRESUPUESTO,
  DocumentCategory.EJECUCION,
  DocumentCategory.SEF,
  DocumentCategory.DEUDA,
  DocumentCategory.FINALIDAD_FUNCION,
  DocumentCategory.ORDENANZA_FISCAL,
];

/** Umbral de confianza mínimo para considerar un documento como detectado */
const MIN_CONFIDENCE = 0.4;

/**
 * Convierte un CrawlResult + SibomResult en un PilotAuditEntry.
 */
export function normalizeToPilotAudit(
  crawlResult: CrawlResult,
  sibomResult?: SibomResult
): PilotAuditEntry {
  const accesibilidad = normalizeAccessibility(crawlResult);
  const documentos = normalizeDocuments(crawlResult, sibomResult);

  return {
    municipioId: crawlResult.municipioId,
    fechaAuditoria: crawlResult.fechaCrawl.split("T")[0],
    auditor: "scraper-automatico",
    accesibilidad,
    documentos,
  };
}

/**
 * Normaliza la accesibilidad desde el resultado de crawl.
 */
function normalizeAccessibility(result: CrawlResult): AccessibilityAudit {
  return {
    urlPortal: result.accesibilidad.urlPortal,
    portalAccesible: result.sitioOnline && result.accesibilidad.portalAccesible,
    clicksDesdeHome: result.accesibilidad.clicksDesdeHome,
    menuTransparenciaVisible: result.accesibilidad.menuTransparenciaVisible,
  };
}

/**
 * Normaliza documentos detectados al formato de auditoría.
 *
 * Para cada categoría requerida:
 * - Si se encontró al menos un documento con confianza suficiente → publicado=true
 * - Si no se encontró → publicado=false
 *
 * Prioriza el documento con mayor confianza por categoría.
 */
function normalizeDocuments(
  crawlResult: CrawlResult,
  sibomResult?: SibomResult
): DocumentAudit[] {
  const audits: DocumentAudit[] = [];

  for (const categoria of REQUIRED_CATEGORIES) {
    // Buscar en documentos detectados del portal
    const candidates = crawlResult.documentos
      .filter(
        (d) => d.categoria === categoria && d.confianza >= MIN_CONFIDENCE
      )
      .sort((a, b) => b.confianza - a.confianza);

    const bestCandidate = candidates[0] ?? null;

    // Para ordenanza fiscal, también revisar SIBOM
    if (
      categoria === DocumentCategory.ORDENANZA_FISCAL &&
      !bestCandidate &&
      sibomResult?.ordenanzaFiscalVigente
    ) {
      const sibomOrdenanza = sibomResult.ordenanzaFiscalVigente;
      audits.push({
        categoria,
        publicado: true,
        url: sibomOrdenanza.urlPdf,
        formato: sibomOrdenanza.urlPdf?.endsWith(".pdf")
          ? DocumentFormat.PDF
          : null,
        anio: sibomOrdenanza.anio,
        trimestre: null,
        fechaPublicacion: sibomOrdenanza.fecha,
        fechaCorte: null,
        esParseable: false, // Conservador: no verificado
        notas: `Detectada en SIBOM: ${sibomOrdenanza.titulo}`,
      });
      continue;
    }

    if (bestCandidate) {
      audits.push(detectedToAudit(categoria, bestCandidate));
    } else {
      // Documento no encontrado
      audits.push({
        categoria,
        publicado: false,
        url: null,
        formato: null,
        anio: null,
        trimestre: null,
        fechaPublicacion: null,
        fechaCorte: null,
        esParseable: false,
        notas: "No detectado por scraper automático",
      });
    }
  }

  return audits;
}

/**
 * Convierte un DetectedDocument en un DocumentAudit.
 */
function detectedToAudit(
  categoria: DocumentCategory,
  doc: DetectedDocument
): DocumentAudit {
  // Estimar fecha de corte basado en año/trimestre detectado
  let fechaCorte: string | null = null;
  if (doc.anioDetectado && doc.trimestreDetectado) {
    const month = doc.trimestreDetectado * 3;
    const lastDay = new Date(doc.anioDetectado, month, 0).getDate();
    fechaCorte = `${doc.anioDetectado}-${String(month).padStart(2, "0")}-${lastDay}`;
  } else if (doc.anioDetectado) {
    fechaCorte = `${doc.anioDetectado}-12-31`;
  }

  // Determinar si es parseable
  const esParseable =
    doc.esParseable ??
    (doc.formato !== null &&
      doc.formato !== DocumentFormat.PDF); // Si no es PDF, asumimos parseable

  const notas: string[] = [];
  if (doc.confianza < 0.6) {
    notas.push(`Confianza baja (${(doc.confianza * 100).toFixed(0)}%)`);
  }
  if (doc.textoContexto) {
    notas.push(`Contexto: "${doc.textoContexto.slice(0, 100)}"`);
  }

  return {
    categoria,
    publicado: true,
    url: doc.url,
    formato: doc.formato,
    anio: doc.anioDetectado,
    trimestre: doc.trimestreDetectado,
    fechaPublicacion: null, // No podemos determinar fecha de publicación del HTML
    fechaCorte,
    esParseable,
    notas: notas.join(". ") || null,
  };
}

/**
 * Merge inteligente: combina un audit existente (manual) con resultados de scraper.
 *
 * La auditoría manual tiene prioridad, pero el scraper puede:
 * - Actualizar URLs rotas
 * - Detectar documentos nuevos que no estaban en la auditoría manual
 * - Actualizar fechas y formatos
 */
export function mergeAudits(
  manual: PilotAuditEntry,
  scraped: PilotAuditEntry
): PilotAuditEntry {
  const mergedDocs: DocumentAudit[] = [];

  for (const cat of REQUIRED_CATEGORIES) {
    const manualDoc = manual.documentos.find((d) => d.categoria === cat);
    const scrapedDoc = scraped.documentos.find((d) => d.categoria === cat);

    if (manualDoc?.publicado && scrapedDoc?.publicado) {
      // Ambos lo tienen: mantener manual pero actualizar URL si cambió
      mergedDocs.push({
        ...manualDoc,
        url: scrapedDoc.url ?? manualDoc.url,
        notas: manualDoc.notas
          ? `${manualDoc.notas} | Verificado por scraper`
          : "Verificado por scraper",
      });
    } else if (manualDoc?.publicado) {
      // Solo manual lo tiene: mantener pero advertir
      mergedDocs.push({
        ...manualDoc,
        notas: manualDoc.notas
          ? `${manualDoc.notas} | No detectado por scraper (posible cambio en sitio)`
          : "No detectado por scraper (posible cambio en sitio)",
      });
    } else if (scrapedDoc?.publicado) {
      // Solo scraper lo encontró: nuevo descubrimiento
      mergedDocs.push({
        ...scrapedDoc,
        notas: scrapedDoc.notas
          ? `${scrapedDoc.notas} | Nuevo: detectado por scraper`
          : "Nuevo: detectado por scraper",
      });
    } else {
      // Ninguno lo tiene
      mergedDocs.push(
        manualDoc ?? scrapedDoc ?? {
          categoria: cat,
          publicado: false,
          url: null,
          formato: null,
          anio: null,
          trimestre: null,
          fechaPublicacion: null,
          fechaCorte: null,
          esParseable: false,
          notas: "No encontrado (manual + scraper)",
        }
      );
    }
  }

  // Accesibilidad: preferir scraper (más reciente)
  const accesibilidad: AccessibilityAudit = {
    urlPortal:
      scraped.accesibilidad.urlPortal ?? manual.accesibilidad.urlPortal,
    portalAccesible: scraped.accesibilidad.portalAccesible,
    clicksDesdeHome:
      scraped.accesibilidad.clicksDesdeHome ??
      manual.accesibilidad.clicksDesdeHome,
    menuTransparenciaVisible:
      scraped.accesibilidad.menuTransparenciaVisible,
  };

  return {
    municipioId: manual.municipioId,
    fechaAuditoria: scraped.fechaAuditoria, // Fecha del scrape
    auditor: `merge(${manual.auditor}, scraper-automatico)`,
    accesibilidad,
    documentos: mergedDocs,
  };
}
