/**
 * @radar-municipal/ingestion — Data ingestion pipeline
 *
 * Writes data into the PostgreSQL database from various sources:
 * scrapers, national datasets, and manual JSON files.
 */

// Writers
export {
  type DataPointInsert,
  type BatchResult,
  upsertDataPoint,
  upsertDataPointsBatch,
} from "./writers/data-point-writer";

export {
  type CrawlDocumentInput,
  type CrawlResultInput,
  upsertCrawlDocuments,
} from "./writers/document-writer";

// Adapters
export { rafamToDataPoints } from "./adapters/rafam-adapter";
export {
  crawlToTransparenciaDataPoints,
  sibomToNormativaDataPoints,
} from "./adapters/crawl-adapter";

// Bulk loaders
export { loadIndecCenso } from "./bulk-loaders/indec-loader";
export { loadEnacom } from "./bulk-loaders/enacom-loader";
export { loadAnsv } from "./bulk-loaders/ansv-loader";
export { loadEducacionSalud } from "./bulk-loaders/educacion-salud-loader";
export { loadEconomia } from "./bulk-loaders/economia-loader";

// Gap detector
export { detectAndStoreDataGaps, type DataGapInsert } from "./gap-detector";
