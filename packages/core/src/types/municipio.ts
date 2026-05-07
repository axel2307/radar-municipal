export interface Municipio {
  /** Código INDEC de 6 dígitos (ej: "060063" para Bahía Blanca) */
  id: string;
  nombre: string;
  partido: string;
  urlOficial: string | null;
  poblacion: number | null;
  superficieKm2: number | null;
  densidad: number | null;
  region: Region;
  esPiloto: boolean;
}

export enum Region {
  AMBA = "AMBA",
  CONURBANO_SUR = "CONURBANO_SUR",
  CONURBANO_NORTE = "CONURBANO_NORTE",
  CONURBANO_OESTE = "CONURBANO_OESTE",
  INTERIOR = "INTERIOR",
  COSTA_ATLANTICA = "COSTA_ATLANTICA",
}
