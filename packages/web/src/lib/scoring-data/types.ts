import type {
  Municipio,
  PilotAuditEntry,
  ScoreEvidence,
  DataGapType,
  FiscalPrimaryField,
  SourcedValue,
} from "@radar-municipal/core";
import type {
  CriterionBreakdown,
} from "@radar-municipal/scoring";
import { ScoringCategory } from "@radar-municipal/core";

// ─────────────────────────────────────────
// Internal raw entry interfaces (used by loaders)
// ─────────────────────────────────────────

export interface FiscalSourcedEntry {
  municipioId: string;
  nombre: string;
  anio: number;
  trimestre: number;
  gastoTotal: SourcedValue<number>;
  gastoPersonal: SourcedValue<number>;
  gastoCapital: SourcedValue<number>;
  deudaTotal: SourcedValue<number>;
  ingresoTotal: SourcedValue<number>;
  resultadoFiscal: SourcedValue<number>;
  gastoPcapita: SourcedValue<number>;
  deudaPcapita: SourcedValue<number>;
  pctPersonal: SourcedValue<number>;
  pctCapital: SourcedValue<number>;
  autonomiaFiscal?: SourcedValue<number>;
  presionTributaria?: SourcedValue<number>;
  eficienciaAdmin?: SourcedValue<number>;
  notas: string;
}

export interface NormativaRawEntry {
  municipioId: string;
  nombre: string;
  fechaScrape: string;
  normasEncontradas: number;
  tieneBoletinSibom: boolean;
  boletinesPublicados: number;
  ultimoBoletinAnio: number | null;
  ordenanzaFiscalVigente: {
    municipioId: string;
    tipo: string;
    numero: string;
    anio: number;
    fecha: string | null;
    titulo: string;
    urlPdf: string | null;
  } | null;
  compras: {
    publicaLicitaciones: boolean;
    urlPortalCompras: string | null;
    publicaAdjudicaciones: boolean;
    licitacionesDetectadas: number;
    plataforma: string | null;
    notas: string | null;
  };
}

export interface DataGapRawEntry {
  municipioId: string;
  nombre: string;
  gaps: {
    campo: string;
    anio: number;
    trimestre: number;
    existeEnMunicipal: boolean;
    existeEnProvincial: boolean;
    tipo: DataGapType;
  }[];
}

export interface ServiciosBasicosRawEntry {
  municipioId: string;
  nombre: string;
  anio: number;
  fuente: string;
  pctAguaRed: number | null;
  pctCloaca: number | null;
  pctGasRed: number | null;
  recoleccionResiduos: number | null;
  alumbradoPublico: number | null;
  notas: string;
}

export interface ParticipacionRawEntry {
  municipioId: string;
  nombre: string;
  anio: number;
  fuente: string;
  presupuestoParticipativo: number | null;
  audienciasPublicas: number | null;
  sistemaReclamos: number | null;
  transparenciaHcd: number | null;
  evidenciaPresupuesto: string | null;
  evidenciaAudiencias: string | null;
  urlReclamos: string | null;
  urlHcd: string | null;
  notas: string;
}

export interface EducacionSaludRawEntry {
  municipioId: string;
  nombre: string;
  anio: number;
  fuente: string;
  escuelasPer10k: number | null;
  centrosSaludPer10k: number | null;
  camasPer10k: number | null;
  jardinesPerNinos: number | null;
  notas: string;
}

export interface ConectividadRawEntry {
  municipioId: string;
  nombre: string;
  anio: number;
  fuente: string;
  pctInternet: number | null;
  bandaAnchaPer100: number | null;
  pctComputadora: number | null;
  serviciosDigitales: number | null;
  notas: string;
}

export interface EconomiaLocalRawEntry {
  municipioId: string;
  nombre: string;
  anio: number;
  fuente: string;
  empleoPcapita: number | null;
  variacionEmpleo: number | null;
  empresasPer1000: number | null;
  construccion: number | null;
  recaudacionPcapita: number | null;
  notas: string;
}

export interface GastoFuncionRawEntry {
  municipioId: string;
  nombre: string;
  anio: number;
  fuente: string;
  pctServiciosSociales: number | null;
  pctServiciosEconomicos: number | null;
  pctAdminGubernamental: number | null;
  pctDeudaPublica: number | null;
  notas: string;
}

export interface SeguridadVialRawEntry {
  municipioId: string;
  nombre: string;
  anio: number;
  fuente: string;
  siniestrosPer100k: number | null;
  kmPavimentadoPerKm2: number | null;
  transitoPublico: number | null;
  kmCiclovias: number | null;
  notas: string;
}

export interface EspacioPublicoRawEntry {
  municipioId: string;
  nombre: string;
  anio: number;
  fuente: string;
  espacioVerdePcapita: number | null;
  coberturaArbolado: number | null;
  separacionResiduos: number | null;
  incidentesAmbientales: number | null;
  notas: string;
}

// ─────────────────────────────────────────
// Exported types
// ─────────────────────────────────────────

/** Resumen de procedencia por municipio */
export interface ProvenanceSummary {
  /** Cuántos campos vienen de cada capa */
  porCapa: Record<string, number>;
  /** Total de campos con dato */
  totalConDato: number;
  /** Total de campos sin dato */
  totalSinDato: number;
}

/** Una brecha de datos para consumo del frontend */
export interface DataGapDetail {
  campo: string;
  anio: number;
  trimestre: number;
  existeEnMunicipal: boolean;
  existeEnProvincial: boolean;
  tipo: DataGapType;
}

export interface RankingEntry {
  posicion: number;
  municipio: Municipio;
  scoreTransparencia: number;
  scoreFiscal: number | null;
  scoreNormativa: number | null;
  scoreServiciosBasicos: number | null;
  scoreParticipacion: number | null;
  scoreEducacionSalud: number | null;
  scoreConectividad: number | null;
  scoreEconomiaLocal: number | null;
  scoreGastoFuncion: number | null;
  scoreSeguridadVial: number | null;
  scoreEspacioPublico: number | null;
  scorePresionImpositiva: number | null;
  scoreTotal: number;
  categoryScores: Record<ScoringCategory, number | null>;
  /** Cantidad de brechas de datos detectadas */
  cantidadBrechas: number;
}

export interface DocumentDetail {
  categoria: string;
  categoriaLabel: string;
  publicado: boolean;
  formato: string | null;
  url: string | null;
  rezagoDias: number | null;
  esParseable: boolean;
  notas: string | null;
}

/** Procedencia de un campo fiscal individual */
export interface FiscalFieldProvenance {
  campo: FiscalPrimaryField;
  capa: string | null;
  organismo: string | null;
  url: string | null;
  confianzaNivel: string | null;
  confianzaNotas: string | null;
}

export interface FiscalDetail {
  scoreTotal: number;
  criterios: {
    indicador: string;
    descripcion: string;
    valorRaw: number | null;
    valorNormalizado: number;
    peso: number;
    unidad: string;
    interpretacion: string;
  }[];
  gastoPcapita: number | null;
  deudaPcapita: number | null;
  pctPersonal: number | null;
  pctCapital: number | null;
  resultadoPcapita: number | null;
  autonomiaFiscal: number | null;
  presionTributaria: number | null;
  eficienciaAdmin: number | null;
  notas: string;
  /** Procedencia por campo primario */
  procedencia: FiscalFieldProvenance[];
}

export interface NormativaDetail {
  scoreTotal: number;
  criterios: { indicador: string; descripcion: string; valor: number; peso: number; evidencia: string }[];
  normasEncontradas: number;
  tieneBoletinSibom: boolean;
  boletinesPublicados: number;
  ordenanzaFiscal: string | null;
  compras: {
    publicaLicitaciones: boolean;
    publicaAdjudicaciones: boolean;
    urlPortalCompras: string | null;
    licitacionesDetectadas: number;
    plataforma: string | null;
  };
}

/** Detalle de scoring de servicios básicos */
export interface ServiciosBasicosDetail {
  scoreTotal: number;
  criterios: {
    indicador: string;
    descripcion: string;
    valorRaw: number | null;
    valorNormalizado: number;
    peso: number;
    unidad: string;
    interpretacion: string;
  }[];
  pctAguaRed: number | null;
  pctCloaca: number | null;
  pctGasRed: number | null;
  notas: string;
}

/** Detalle de scoring de participación ciudadana */
export interface ParticipacionDetail {
  scoreTotal: number;
  criterios: { indicador: string; descripcion: string; valor: number; peso: number; evidencia: string }[];
}

/** Detalle de scoring de educación y salud */
export interface EducacionSaludDetail {
  scoreTotal: number;
  criterios: {
    indicador: string;
    descripcion: string;
    valorRaw: number | null;
    valorNormalizado: number;
    peso: number;
    unidad: string;
    interpretacion: string;
  }[];
  escuelasPer10k: number | null;
  centrosSaludPer10k: number | null;
  camasPer10k: number | null;
  notas: string;
}

/** Detalle de scoring de conectividad digital */
export interface ConectividadDetail {
  scoreTotal: number;
  criterios: {
    indicador: string;
    descripcion: string;
    valorRaw: number | null;
    valorNormalizado: number;
    peso: number;
    unidad: string;
    interpretacion: string;
  }[];
  pctInternet: number | null;
  bandaAnchaPer100: number | null;
  pctComputadora: number | null;
  notas: string;
}

/** Detalle de scoring de economía local */
export interface EconomiaLocalDetail {
  scoreTotal: number;
  criterios: {
    indicador: string;
    descripcion: string;
    valorRaw: number | null;
    valorNormalizado: number;
    peso: number;
    unidad: string;
    interpretacion: string;
  }[];
  empleoPcapita: number | null;
  variacionEmpleo: number | null;
  empresasPer1000: number | null;
  notas: string;
}

/** Detalle de scoring de gasto por función */
export interface GastoFuncionDetail {
  scoreTotal: number;
  criterios: {
    indicador: string;
    descripcion: string;
    valorRaw: number | null;
    valorNormalizado: number;
    peso: number;
    unidad: string;
    interpretacion: string;
  }[];
  pctServiciosSociales: number | null;
  pctServiciosEconomicos: number | null;
  pctAdminGubernamental: number | null;
  diversificacionHhi: number | null;
  notas: string;
}

/** Detalle de scoring de seguridad vial */
export interface SeguridadVialDetail {
  scoreTotal: number;
  criterios: {
    indicador: string;
    descripcion: string;
    valorRaw: number | null;
    valorNormalizado: number;
    peso: number;
    unidad: string;
    interpretacion: string;
  }[];
  siniestrosPer100k: number | null;
  kmPavimentadoPerKm2: number | null;
  kmCiclovias: number | null;
  notas: string;
}

/** Detalle de scoring de espacio público */
export interface EspacioPublicoDetail {
  scoreTotal: number;
  criterios: {
    indicador: string;
    descripcion: string;
    valorRaw: number | null;
    valorNormalizado: number;
    peso: number;
    unidad: string;
    interpretacion: string;
  }[];
  espacioVerdePcapita: number | null;
  coberturaArbolado: number | null;
  separacionResiduos: number | null;
  notas: string;
}

export interface MunicipioDetail {
  municipio: Municipio;
  audit: PilotAuditEntry;
  scoreTransparencia: number;
  scoreFiscal: number | null;
  scoreNormativa: number | null;
  scoreServiciosBasicos: number | null;
  scoreParticipacion: number | null;
  scoreEducacionSalud: number | null;
  scoreConectividad: number | null;
  scoreEconomiaLocal: number | null;
  scoreGastoFuncion: number | null;
  scoreSeguridadVial: number | null;
  scoreEspacioPublico: number | null;
  scorePresionImpositiva: number | null;
  scoreTotal: number;
  categoryScores: Record<ScoringCategory, number | null>;
  evidencia: ScoreEvidence[];
  breakdown: CriterionBreakdown[];
  documentos: DocumentDetail[];
  accesibilidad: {
    urlPortal: string | null;
    portalAccesible: boolean;
    clicksDesdeHome: number | null;
    menuTransparenciaVisible: boolean;
  };
  fiscal: FiscalDetail | null;
  normativa: NormativaDetail | null;
  serviciosBasicos: ServiciosBasicosDetail | null;
  participacion: ParticipacionDetail | null;
  educacionSalud: EducacionSaludDetail | null;
  conectividad: ConectividadDetail | null;
  economiaLocal: EconomiaLocalDetail | null;
  gastoFuncion: GastoFuncionDetail | null;
  seguridadVial: SeguridadVialDetail | null;
  espacioPublico: EspacioPublicoDetail | null;
  fechaAuditoria: string;
  /** Brechas de datos detectadas */
  dataGaps: DataGapDetail[];
  /** Resumen de procedencia de datos fiscales */
  procedenciaSummary: ProvenanceSummary | null;
}
