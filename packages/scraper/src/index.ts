/**
 * @radar-municipal/scraper
 *
 * Pipeline de extracción de datos de portales municipales.
 * Incluye crawlers de transparencia, SIBOM y detección de PDFs.
 */

export const SCRAPER_VERSION = "0.2.0";

// Tipos
export type {
  CrawlTarget,
  CrawlOptions,
  CrawlResult,
  DetectedDocument,
  AccessibilityResult,
  SibomResult,
  SibomNorma,
  ScrapeJob,
  JobStatus,
} from "./types";
export { DEFAULT_CRAWL_OPTIONS } from "./types";

// Crawlers
export { crawlTransparencyPortal } from "./crawlers/transparency-crawler";
export { scrapeSibom } from "./crawlers/sibom-scraper";

// Parsers
export { detectPdfParseable, detectFileFormat } from "./parsers/pdf-detector";
export { parseRafamFromUrl, parseRafamFromBuffer, type RafamParseResult } from "./parsers/rafam-parser";
export {
  parseOrdenanzaImpositivaFromHtml,
  parseOrdenanzaImpositivaFromPdf,
  parseOrdenanzaImpositivaFromUrl,
  extractTarifas,
  computeMontosFromTarifas,
  extractAnioFiscal,
  type OrdenanzaImpositivaParseResult,
  type TarifasExtraidas,
  type ParseOptions,
  type OcrBackend,
} from "./parsers/ordenanza-impositiva";

// Normalizers
export { normalizeToPilotAudit, mergeAudits } from "./normalizers/audit-normalizer";

// Scheduler
export { runScheduledCrawl } from "./scheduler/schedule";
export type { ScheduleConfig, ScheduleProgress, ScheduleResult } from "./scheduler/schedule";
export { runScheduledCrawlWithDb } from "./scheduler/schedule-db";
export type { ScheduleDbConfig, ScheduleDbProgress, ScheduleDbResult, DbWriters } from "./scheduler/schedule-db";

// Constants
export { getSibomCityId, SIBOM_CITY_IDS } from "./constants/sibom-ids";
