/**
 * Tipos para la dimensión normativa.
 * Estructuran la información extraída de SIBOM y boletines oficiales.
 */

export type NormaTipo = "ORDENANZA" | "DECRETO" | "RESOLUCION" | "LICITACION" | "OTRO";

export interface Norma {
  municipioId: string;
  tipo: NormaTipo;
  numero: string;
  anio: number;
  fecha: string | null;
  titulo: string;
  urlPdf: string | null;
}

export interface NormativaData {
  municipioId: string;
  nombre: string;
  fechaScrape: string;
  /** Total de normas encontradas en SIBOM */
  normasEncontradas: number;
  /** Lista de normas (últimas, no necesariamente todas) */
  normas: Norma[];
  /** Ordenanza fiscal vigente detectada */
  ordenanzaFiscalVigente: Norma | null;
  /** ¿Tiene boletín oficial consultable en SIBOM? */
  tieneBoletinSibom: boolean;
  /** Cantidad de boletines publicados en SIBOM */
  boletinesPublicados: number;
  /** Año del boletín más reciente */
  ultimoBoletinAnio: number | null;
}

export interface ComprasData {
  municipioId: string;
  /** ¿Publica licitaciones vigentes? */
  publicaLicitaciones: boolean;
  /** URL del portal de compras o licitaciones */
  urlPortalCompras: string | null;
  /** ¿Publica adjudicaciones? */
  publicaAdjudicaciones: boolean;
  /** Cantidad de licitaciones detectadas */
  licitacionesDetectadas: number;
  /** Plataforma de compras (si detectada) */
  plataforma: string | null;
  /** Notas */
  notas: string | null;
}
