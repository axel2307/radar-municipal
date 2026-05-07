/**
 * Re-export all database query modules.
 */

// Data points queries
export {
  type DrizzleDb,
  type DataPointRow,
  getDataPoint,
  getDataPointsByFields,
  getDataPointsForField,
  getAllDataPointsForMunicipio,
  countFieldsForMunicipio,
} from "./data-points";

// Scoring input reconstructors
export {
  type FiscalDbInput,
  type ServiciosBasicosInput,
  type ConectividadInput,
  type EducacionSaludInput,
  type EconomiaLocalInput,
  type GastoFuncionInput,
  type SeguridadVialInput,
  type EspacioPublicoInput,
  type ParticipacionInput,
  type NormativaDbInput,
  type AllScoringInputs,
  getFiscalInput,
  getServiciosBasicosInput,
  getConectividadInput,
  getEducacionSaludInput,
  getEconomiaLocalInput,
  getGastoFuncionInput,
  getSeguridadVialInput,
  getEspacioPublicoInput,
  getParticipacionInput,
  getNormativaInput,
  getTransparenciaInput,
  getAllScoringInputs,
} from "./scoring-inputs";

// Score cache
export {
  type CachedDimensionScore,
  type CachedScoreRow,
  getCachedScores,
  setCachedScores,
  invalidateScoreCache,
  getAllCachedScores,
  isCacheFresh,
} from "./scoring-cache";
