export { type Municipio, Region } from "./municipio";
export { type Source, SourceType, SourceStatus } from "./source";
export {
  type Document,
  DocumentCategory,
  DocumentFormat,
} from "./document";
export {
  type TransparencyScore,
  type DimensionScore,
  type ScoreEvidence,
  ScoringDimension,
  ScoringCategory,
  type CategoryConfig,
  SCORING_CATEGORIES,
  type WeightedTotalResult,
  computeWeightedTotal,
} from "./score";
export {
  type FiscalIndicator,
  type FiscalIndicatorSourced,
  type FiscalPrimaryField,
  FISCAL_PRIMARY_FIELDS,
  flattenFiscalIndicator,
} from "./fiscal";
export {
  type DocumentAudit,
  type AccessibilityAudit,
  type PilotAuditEntry,
  type PilotAuditData,
} from "./audit";
export {
  type NormaTipo,
  type Norma,
  type NormativaData,
  type ComprasData,
} from "./normativa";
export {
  type SourcedValue,
  type DataPointSource,
  type DataPointConfidence,
  ConfidenceLevel,
  type DataPoint,
  type DataGap,
  DataGapType,
  DATA_GAP_TYPE_META,
} from "./provenance";
export {
  type CasoTestigoParams,
  CASOS_TESTIGO_DEFAULT,
  type PresionImpositivaData,
  type PresionImpositivaRankingEntry,
  type PresionImpositivaStats,
} from "./presion-impositiva";
export {
  type Contratacion,
  type ContratacionEstado,
  type ContratacionesAggregate,
} from "./contratacion";
export {
  type AcreedorSaldo,
  type StockDeudaSnapshot,
} from "./deuda";
export {
  type RefreshManifest,
  type MonthlyRefreshRun,
  type GlobalRefreshManifest,
} from "./refresh";
