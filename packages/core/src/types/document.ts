export enum DocumentCategory {
  PRESUPUESTO = "PRESUPUESTO",
  EJECUCION = "EJECUCION",
  SEF = "SEF",
  DEUDA = "DEUDA",
  FINALIDAD_FUNCION = "FINALIDAD_FUNCION",
  /**
   * Ordenanza Fiscal: código tributario procedimental (define hechos
   * imponibles, sujetos, procedimiento de determinación). Señal de
   * transparencia normativa pero NO contiene alícuotas parseables.
   */
  ORDENANZA_FISCAL = "ORDENANZA_FISCAL",
  /**
   * Ordenanza Impositiva (o Tarifaria): fija alícuotas y tarifas concretas
   * aplicables en el ejercicio. Es la entrada del parser batch que calcula
   * los 4 casos testigo de presión impositiva.
   */
  ORDENANZA_IMPOSITIVA = "ORDENANZA_IMPOSITIVA",
  LICITACION = "LICITACION",
  ADJUDICACION = "ADJUDICACION",
  OTRO = "OTRO",
}

export enum DocumentFormat {
  PDF = "PDF",
  CSV = "CSV",
  XLS = "XLS",
  HTML = "HTML",
  JSON = "JSON",
}

export interface Document {
  id: number;
  municipioId: string;
  sourceId: number | null;
  categoria: DocumentCategory;
  anio: number;
  trimestre: number | null;
  formato: DocumentFormat;
  url: string | null;
  fechaPublicacion: string | null;
  fechaCorte: string | null;
  esParseable: boolean;
}
