import { DocumentCategory, DocumentFormat } from "@radar-municipal/core";

// ─────────────────────────────────────────
// Configuración de crawling
// ─────────────────────────────────────────

/** Configuración para un municipio a crawlear */
export interface CrawlTarget {
  municipioId: string;
  nombre: string;
  urlOficial: string;
  /** URLs extra conocidas (portal transparencia, datos abiertos, etc.) */
  urlsConocidas?: string[];
}

/** Opciones globales de crawl */
export interface CrawlOptions {
  /** Timeout por página en ms (default: 30000) */
  pageTimeout?: number;
  /** Máximo de páginas a visitar por municipio (default: 20) */
  maxPages?: number;
  /** Headless mode (default: true) */
  headless?: boolean;
  /** User agent override */
  userAgent?: string;
  /** Directorio de output para resultados */
  outputDir?: string;
}

export const DEFAULT_CRAWL_OPTIONS: Required<CrawlOptions> = {
  pageTimeout: 30000,
  maxPages: 20,
  headless: true,
  userAgent:
    "RadarMunicipal/1.0 (https://radarmunicipal.ar; transparencia@radarmunicipal.ar)",
  outputDir: "./output",
};

// ─────────────────────────────────────────
// Resultados de detección
// ─────────────────────────────────────────

/** Documento detectado en un portal municipal */
export interface DetectedDocument {
  categoria: DocumentCategory;
  url: string;
  /** Formato detectado por extensión/content-type */
  formato: DocumentFormat | null;
  /** Texto del link o heading que lo contenía */
  textoContexto: string;
  /** Confianza de la detección (0-1) */
  confianza: number;
  /** Si pudimos descargar y verificar el archivo */
  verificado: boolean;
  /** Tamaño en bytes si disponible */
  tamanoBytes: number | null;
  /** ¿Es un PDF parseable (tiene texto)? null si no es PDF o no se verificó */
  esParseable: boolean | null;
  /** Año fiscal detectado del contexto */
  anioDetectado: number | null;
  /** Trimestre detectado del contexto */
  trimestreDetectado: number | null;
}

/** Resultado de la detección de accesibilidad */
export interface AccessibilityResult {
  urlPortal: string | null;
  portalAccesible: boolean;
  clicksDesdeHome: number | null;
  menuTransparenciaVisible: boolean;
  /** Ruta de navegación encontrada (ej: ["Home", "Gobierno", "Transparencia"]) */
  rutaNavegacion: string[];
  /** URLs de secciones de transparencia encontradas */
  urlsTransparencia: string[];
}

/** Resultado completo de crawl de un municipio */
export interface CrawlResult {
  municipioId: string;
  nombre: string;
  fechaCrawl: string;
  duracionMs: number;
  /** ¿El sitio principal estaba online? */
  sitioOnline: boolean;
  /** Error global si el sitio no responde */
  error: string | null;
  accesibilidad: AccessibilityResult;
  documentos: DetectedDocument[];
  /** Páginas visitadas */
  paginasVisitadas: number;
  /** Warnings durante el crawl */
  warnings: string[];
}

// ─────────────────────────────────────────
// SIBOM
// ─────────────────────────────────────────

/** Norma extraída de SIBOM */
export interface SibomNorma {
  tipo: "ORDENANZA" | "DECRETO" | "RESOLUCION" | "OTRO";
  numero: string;
  anio: number;
  fecha: string | null;
  titulo: string;
  urlPdf: string | null;
  municipioId: string;
}

/** Resultado de scraping de SIBOM para un municipio */
export interface SibomResult {
  municipioId: string;
  nombre: string;
  fechaScrape: string;
  normasEncontradas: number;
  normas: SibomNorma[];
  /** Si buscamos ordenanza fiscal específicamente */
  ordenanzaFiscalVigente: SibomNorma | null;
  error: string | null;
}

// ─────────────────────────────────────────
// Job tracking
// ─────────────────────────────────────────

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface ScrapeJob {
  id: string;
  municipioId: string;
  tipo: "transparencia" | "sibom";
  status: JobStatus;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  result: CrawlResult | SibomResult | null;
}
