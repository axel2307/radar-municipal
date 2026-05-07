/**
 * Scheduler con escritura a DB: orquesta crawling + ingesta.
 *
 * Usa inyección de dependencias para las funciones de escritura,
 * evitando dependencia circular con @radar-municipal/ingestion.
 *
 * La CLI (crawl-all-db.ts) conecta las implementaciones concretas.
 */

import {
  MUNICIPIOS_PILOTO,
  MUNICIPIOS,
  type PilotAuditData,
} from "@radar-municipal/core";
import { type DrizzleDb, invalidateScoreCache } from "@radar-municipal/core/db";
import { crawlTransparencyPortal } from "../crawlers/transparency-crawler";
import { scrapeSibom } from "../crawlers/sibom-scraper";
import { normalizeToPilotAudit, mergeAudits } from "../normalizers/audit-normalizer";
import { parseRafamFromUrl } from "../parsers/rafam-parser";
import type { CrawlTarget, CrawlResult, SibomResult, DetectedDocument } from "../types";

// ─────────────────────────────────────────
// Injected writer interfaces
// ─────────────────────────────────────────

/** Shape of a data point to insert (mirrors ingestion's DataPointInsert) */
export interface DataPointShape {
  municipioId: string;
  campo: string;
  anio: number;
  trimestre?: number | null;
  valorNumerico?: number | null;
  valorTexto?: string | null;
  valorBooleano?: boolean | null;
  unidad?: string | null;
  fuenteCapa: string;
  fuenteOrganismo: string;
  fuenteUrl?: string | null;
  fuenteFormato?: string | null;
  fuenteFechaAcceso?: Date | null;
  confianzaNivel: string;
  confianzaNotas?: string | null;
}

/** Crawl document input shape */
export interface CrawlDocInputShape {
  categoria: string;
  url: string | null;
  formato: string;
  anio: number;
  trimestre?: number | null;
  tamanoBytes?: number | null;
  esParseable?: boolean | null;
}

/** Crawl result input shape for the document writer */
export interface CrawlResultInputShape {
  municipioId: string;
  nombre: string;
  url: string;
  fechaCrawl: string;
  documentos: CrawlDocInputShape[];
}

/** Simplified crawl result for transparency adapter */
export interface TranspCrawlShape {
  municipioId: string;
  portalUrl: string;
  portalAccesible: boolean;
  documentos: CrawlDocInputShape[];
}

/** Simplified SIBOM result for normativa adapter */
export interface SibomShape {
  municipioId: string;
  normasEncontradas: number;
  tieneBoletinSibom: boolean;
  boletinesPublicados: number;
  ordenanzaFiscalVigente: boolean;
  ordenanzaFiscalUrl?: string | null;
}

/** RAFAM parse result shape */
export interface RafamResultShape {
  success: boolean;
  tipoDocumento: string;
  anio: number | null;
  trimestre: number | null;
  datos: Record<string, unknown>;
  warnings: string[];
  [key: string]: unknown;
}

/** Injected writer functions — provided by the CLI layer */
export interface DbWriters {
  upsertCrawlDocuments(db: DrizzleDb, input: CrawlResultInputShape): Promise<void>;
  crawlToTransparenciaDataPoints(crawl: TranspCrawlShape, anio: number): DataPointShape[];
  sibomToNormativaDataPoints(sibom: SibomShape, anio: number): DataPointShape[];
  rafamToDataPoints(result: RafamResultShape, municipioId: string, sourceUrl: string): DataPointShape[];
  upsertDataPointsBatch(db: DrizzleDb, points: DataPointShape[]): Promise<{ inserted: number; updated: number }>;
  detectAndStoreDataGaps(db: DrizzleDb, municipioId: string, anio: number): Promise<void>;
}

export interface ScheduleDbConfig {
  /** Drizzle DB instance */
  db: DrizzleDb;
  /** Injected writer functions */
  writers: DbWriters;
  /** Municipios a crawlear (default: todos los piloto) */
  municipioIds?: string[];
  /** Si debe crawlear TODOS los 135 (no solo pilotos) */
  allMunicipios?: boolean;
  /** Intervalo entre crawls por municipio en ms (default: 3000) */
  delayBetweenMs?: number;
  /** Si debe hacer merge con datos existentes */
  existingAudits?: PilotAuditData;
  /** Callback por municipio completado */
  onProgress?: (result: ScheduleDbProgress) => void;
  /** Headless mode (default: true) */
  headless?: boolean;
  /** Si parsear PDFs RAFAM detectados (default: true) */
  parseRafam?: boolean;
  /** Año fiscal a considerar (default: año actual) */
  anio?: number;
}

export interface ScheduleDbProgress {
  municipioId: string;
  nombre: string;
  index: number;
  total: number;
  status: "success" | "error";
  score?: number;
  error?: string;
  durationMs: number;
  dataPointsWritten: number;
  documentsDetected: number;
  rafamParsed: boolean;
}

export interface ScheduleDbResult {
  audits: PilotAuditData;
  crawlResults: CrawlResult[];
  sibomResults: SibomResult[];
  errors: { municipioId: string; error: string }[];
  totalDurationMs: number;
  totalDataPointsWritten: number;
  totalDocumentsDetected: number;
  totalRafamParsed: number;
}

/**
 * Ejecuta un ciclo completo de crawling con escritura a DB.
 */
export async function runScheduledCrawlWithDb(
  config: ScheduleDbConfig
): Promise<ScheduleDbResult> {
  const {
    db,
    writers,
    delayBetweenMs = 3000,
    existingAudits,
    onProgress,
    headless = true,
    parseRafam = true,
    anio = new Date().getFullYear(),
  } = config;

  const startTime = Date.now();

  const existingMap = existingAudits
    ? new Map(existingAudits.map((a) => [a.municipioId, a]))
    : null;

  let municipios = config.allMunicipios
    ? MUNICIPIOS.filter((m) => m.urlOficial)
    : MUNICIPIOS_PILOTO.filter((m) => m.urlOficial);

  if (config.municipioIds?.length) {
    const ids = new Set(config.municipioIds);
    municipios = municipios.filter((m) => ids.has(m.id));
  }

  const result: ScheduleDbResult = {
    audits: [],
    crawlResults: [],
    sibomResults: [],
    errors: [],
    totalDurationMs: 0,
    totalDataPointsWritten: 0,
    totalDocumentsDetected: 0,
    totalRafamParsed: 0,
  };

  for (let i = 0; i < municipios.length; i++) {
    const m = municipios[i];
    const crawlStart = Date.now();
    let dataPointsWritten = 0;
    let documentsDetected = 0;
    let rafamParsed = false;

    try {
      const target: CrawlTarget = {
        municipioId: m.id,
        nombre: m.nombre,
        urlOficial: m.urlOficial!,
      };

      // 1. Crawl portal
      const crawlResult = await crawlTransparencyPortal(target, { headless });
      result.crawlResults.push(crawlResult);
      documentsDetected = crawlResult.documentos.length;

      // 2. Scrape SIBOM
      const sibomResult = await scrapeSibom(m.id, m.nombre);
      result.sibomResults.push(sibomResult);

      // 3. Normalizar
      let audit = normalizeToPilotAudit(crawlResult, sibomResult);
      const existing = existingMap?.get(m.id);
      if (existing) {
        audit = mergeAudits(existing, audit);
      }
      result.audits.push(audit);

      // ─── Escritura a DB ───

      // 4. Escribir documentos y fuentes
      const crawlInput: CrawlResultInputShape = {
        municipioId: m.id,
        nombre: m.nombre,
        url: m.urlOficial!,
        fechaCrawl: crawlResult.fechaCrawl,
        documentos: crawlResult.documentos.map((d) => ({
          categoria: d.categoria,
          url: d.url ?? null,
          formato: d.formato ?? "DESCONOCIDO",
          anio: d.anioDetectado ?? anio,
          trimestre: d.trimestreDetectado ?? null,
          tamanoBytes: d.tamanoBytes ?? null,
          esParseable: d.esParseable ?? null,
        })),
      };
      await writers.upsertCrawlDocuments(db, crawlInput);

      // 5. Transparencia → dataPoints
      const transpPoints = writers.crawlToTransparenciaDataPoints(
        {
          municipioId: m.id,
          portalUrl: m.urlOficial!,
          portalAccesible: crawlResult.sitioOnline,
          documentos: crawlInput.documentos,
        },
        anio
      );

      // 6. SIBOM → dataPoints normativa
      const sibomPoints = writers.sibomToNormativaDataPoints(
        {
          municipioId: m.id,
          normasEncontradas: sibomResult.normasEncontradas,
          tieneBoletinSibom: sibomResult.normasEncontradas > 0,
          boletinesPublicados: sibomResult.normasEncontradas,
          ordenanzaFiscalVigente: !!sibomResult.ordenanzaFiscalVigente,
          ordenanzaFiscalUrl: sibomResult.ordenanzaFiscalVigente?.urlPdf ?? null,
        },
        anio
      );

      // 7. Parse RAFAM PDFs si hay
      const allDataPoints: DataPointShape[] = [...transpPoints, ...sibomPoints];

      if (parseRafam) {
        const pdfDocs = crawlResult.documentos.filter(
          (d) => d.esParseable && d.url && isParseable(d)
        );

        for (const doc of pdfDocs) {
          try {
            const parseResult = await parseRafamFromUrl(doc.url, m.id);
            if (parseResult.success) {
              const rafamPoints = writers.rafamToDataPoints(
                parseResult as unknown as RafamResultShape,
                m.id,
                doc.url
              );
              allDataPoints.push(...rafamPoints);
              rafamParsed = true;
              result.totalRafamParsed++;
            }
          } catch {
            // RAFAM parse failure is not fatal
          }
        }
      }

      // 8. Escribir todos los dataPoints
      if (allDataPoints.length > 0) {
        const batchResult = await writers.upsertDataPointsBatch(db, allDataPoints);
        dataPointsWritten = batchResult.inserted + batchResult.updated;
      }

      // 9. Detectar gaps
      try {
        await writers.detectAndStoreDataGaps(db, m.id, anio);
      } catch {
        // Gap detection failure is not fatal
      }

      result.totalDataPointsWritten += dataPointsWritten;
      result.totalDocumentsDetected += documentsDetected;

      onProgress?.({
        municipioId: m.id,
        nombre: m.nombre,
        index: i,
        total: municipios.length,
        status: "success",
        durationMs: Date.now() - crawlStart,
        dataPointsWritten,
        documentsDetected,
        rafamParsed,
      });
    } catch (err) {
      const error = (err as Error).message;
      result.errors.push({ municipioId: m.id, error });

      onProgress?.({
        municipioId: m.id,
        nombre: m.nombre,
        index: i,
        total: municipios.length,
        status: "error",
        error,
        durationMs: Date.now() - crawlStart,
        dataPointsWritten: 0,
        documentsDetected: 0,
        rafamParsed: false,
      });
    }

    // Rate limiting
    if (i < municipios.length - 1) {
      await new Promise((r) => setTimeout(r, delayBetweenMs));
    }
  }

  // 10. Invalidar cache global al final del run
  try {
    await invalidateScoreCache(db);
  } catch {
    // Non-fatal
  }

  result.totalDurationMs = Date.now() - startTime;
  return result;
}

/** Determina si un documento detectado es un PDF fiscal parseable */
function isParseable(doc: DetectedDocument): boolean {
  const fiscalCategories = new Set([
    "PRESUPUESTO",
    "EJECUCION",
    "SEF",
    "DEUDA",
    "FINALIDAD_FUNCION",
  ]);
  return (
    doc.esParseable === true &&
    fiscalCategories.has(doc.categoria) &&
    !!doc.url
  );
}
