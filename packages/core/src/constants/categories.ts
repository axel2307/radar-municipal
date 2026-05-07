import { DocumentCategory, ScoringDimension } from "../types/index";

/** Categorías de documentos fiscales clave para scoring de transparencia */
export const FISCAL_DOCUMENT_CATEGORIES = [
  DocumentCategory.PRESUPUESTO,
  DocumentCategory.EJECUCION,
  DocumentCategory.SEF,
  DocumentCategory.DEUDA,
  DocumentCategory.FINALIDAD_FUNCION,
  DocumentCategory.ORDENANZA_FISCAL,
] as const;

/** Dimensiones activas actualmente */
export const ACTIVE_DIMENSIONS = [
  ScoringDimension.TRANSPARENCIA,
  ScoringDimension.FISCAL,
  ScoringDimension.NORMATIVA,
  ScoringDimension.PARTICIPACION_CIUDADANA,
  ScoringDimension.GASTO_POR_FUNCION,
  ScoringDimension.ECONOMIA_LOCAL,
  ScoringDimension.PRESION_IMPOSITIVA,
  ScoringDimension.SERVICIOS_BASICOS,
  ScoringDimension.EDUCACION_SALUD,
  ScoringDimension.CONECTIVIDAD_DIGITAL,
  ScoringDimension.ESPACIO_PUBLICO,
  ScoringDimension.SEGURIDAD_VIAL,
] as const;

/** Labels en español para UI */
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  [DocumentCategory.PRESUPUESTO]: "Presupuesto",
  [DocumentCategory.EJECUCION]: "Ejecución presupuestaria",
  [DocumentCategory.SEF]: "Situación económico-financiera",
  [DocumentCategory.DEUDA]: "Deuda pública",
  [DocumentCategory.FINALIDAD_FUNCION]: "Gasto por finalidad y función",
  [DocumentCategory.ORDENANZA_FISCAL]: "Ordenanza fiscal",
  [DocumentCategory.ORDENANZA_IMPOSITIVA]: "Ordenanza impositiva",
  [DocumentCategory.LICITACION]: "Licitación",
  [DocumentCategory.ADJUDICACION]: "Adjudicación",
  [DocumentCategory.OTRO]: "Otro",
};

export const SCORING_DIMENSION_LABELS: Record<ScoringDimension, string> = {
  [ScoringDimension.TRANSPARENCIA]: "Transparencia",
  [ScoringDimension.FISCAL]: "Fiscal",
  [ScoringDimension.NORMATIVA]: "Normativa",
  [ScoringDimension.COMPRAS]: "Compras y contrataciones",
  [ScoringDimension.CALIDAD_DATOS]: "Calidad de datos",
  [ScoringDimension.SERVICIOS_BASICOS]: "Servicios básicos",
  [ScoringDimension.EDUCACION_SALUD]: "Educación y salud",
  [ScoringDimension.CONECTIVIDAD_DIGITAL]: "Conectividad digital",
  [ScoringDimension.ESPACIO_PUBLICO]: "Espacio público",
  [ScoringDimension.SEGURIDAD_VIAL]: "Seguridad vial",
  [ScoringDimension.PARTICIPACION_CIUDADANA]: "Participación ciudadana",
  [ScoringDimension.GASTO_POR_FUNCION]: "Gasto por función",
  [ScoringDimension.ECONOMIA_LOCAL]: "Economía local",
  [ScoringDimension.PRESION_IMPOSITIVA]: "Presión impositiva",
};
