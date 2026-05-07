import type { SourceLayer } from "../constants/source-layers";

export enum SourceType {
  // ─── Municipales ───
  PORTAL_TRANSPARENCIA = "PORTAL_TRANSPARENCIA",
  DATOS_ABIERTOS = "DATOS_ABIERTOS",
  BOLETIN_OFICIAL = "BOLETIN_OFICIAL",

  // ─── Provinciales ───
  SIBOM = "SIBOM",
  CONTADURIA_GENERAL = "CONTADURIA_GENERAL",
  TRIBUNAL_CUENTAS = "TRIBUNAL_CUENTAS",
  ARBA = "ARBA",
  MIN_ECONOMIA_PBA = "MIN_ECONOMIA_PBA",

  // ─── Nacionales ───
  INDEC = "INDEC",
  MIN_INTERIOR = "MIN_INTERIOR",
  OSM = "OSM",

  OTRO = "OTRO",
}

export enum SourceStatus {
  ACTIVO = "ACTIVO",
  CAIDO = "CAIDO",
  NO_ENCONTRADO = "NO_ENCONTRADO",
}

export interface Source {
  id: number;
  municipioId: string;
  tipo: SourceType;
  /** Capa de procedencia institucional */
  capa: SourceLayer;
  url: string;
  ultimoAcceso: string | null;
  estado: SourceStatus;
}
