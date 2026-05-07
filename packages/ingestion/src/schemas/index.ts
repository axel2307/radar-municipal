/**
 * Re-export all Zod schemas for the ingestion pipeline.
 */

export {
  // Shared
  sourcedValueSchema,
  type SourcedValueInput,

  // Pilot JSON schemas
  pilotFiscalEntrySchema,
  pilotFiscalArraySchema,
  type PilotFiscalEntry,

  pilotAuditEntrySchema,
  pilotAuditArraySchema,
  type PilotAuditEntryInput,

  pilotNormativaEntrySchema,
  pilotNormativaArraySchema,
  type PilotNormativaEntry,

  pilotDataGapsEntrySchema,
  pilotDataGapsArraySchema,
  type PilotDataGapsEntry,

  pilotServiciosBasicosEntrySchema,
  pilotServiciosBasicosArraySchema,
  type PilotServiciosBasicosEntry,

  pilotParticipacionEntrySchema,
  pilotParticipacionArraySchema,
  type PilotParticipacionEntry,

  pilotEducacionSaludEntrySchema,
  pilotEducacionSaludArraySchema,
  type PilotEducacionSaludEntry,

  pilotConectividadEntrySchema,
  pilotConectividadArraySchema,
  type PilotConectividadEntry,

  pilotEconomiaLocalEntrySchema,
  pilotEconomiaLocalArraySchema,
  type PilotEconomiaLocalEntry,

  pilotGastoFuncionEntrySchema,
  pilotGastoFuncionArraySchema,
  type PilotGastoFuncionEntry,

  pilotSeguridadVialEntrySchema,
  pilotSeguridadVialArraySchema,
  type PilotSeguridadVialEntry,

  pilotEspacioPublicoEntrySchema,
  pilotEspacioPublicoArraySchema,
  type PilotEspacioPublicoEntry,
} from "./pilot-schemas";

export {
  dataPointInsertSchema,
  type DataPointInsertInput,

  crawlResultSchema,
  type CrawlResultInput,

  sibomResultSchema,
  type SibomResultInput,

  rafamResultSchema,
  type RafamResultInput,
} from "./data-point-schema";
