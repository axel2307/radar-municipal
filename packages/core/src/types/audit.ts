import { DocumentCategory, DocumentFormat } from "./document";

/**
 * Auditoría de publicación de un documento fiscal específico.
 * Null en campos = dato no encontrado o no aplicable.
 */
export interface DocumentAudit {
  categoria: DocumentCategory;
  publicado: boolean;
  url: string | null;
  formato: DocumentFormat | null;
  anio: number | null;
  trimestre: number | null;
  /** Fecha de publicación o última modificación (ISO 8601) */
  fechaPublicacion: string | null;
  /** Fecha de cierre del período que cubre (ISO 8601) */
  fechaCorte: string | null;
  /** ¿El archivo es parseable automáticamente? (false = escaneado) */
  esParseable: boolean;
  notas: string | null;
}

/**
 * Auditoría de accesibilidad del portal municipal.
 */
export interface AccessibilityAudit {
  urlPortal: string | null;
  portalAccesible: boolean;
  /** Clicks desde la home hasta encontrar datos fiscales */
  clicksDesdeHome: number | null;
  /** ¿Hay un menú/sección "Transparencia" visible? */
  menuTransparenciaVisible: boolean;
}

/**
 * Entrada completa de auditoría para un municipio.
 * Input principal del scoring engine.
 */
export interface PilotAuditEntry {
  municipioId: string;
  fechaAuditoria: string;
  auditor: string;
  accesibilidad: AccessibilityAudit;
  documentos: DocumentAudit[];
}

/** Dataset completo de auditoría piloto */
export type PilotAuditData = PilotAuditEntry[];
