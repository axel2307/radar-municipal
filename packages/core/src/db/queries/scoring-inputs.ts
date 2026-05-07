/**
 * Funciones que reconstruyen los inputs tipados de cada dimensión de scoring
 * a partir de dataPoints en la base de datos.
 *
 * Cada función lee los DataField relevantes y retorna la interfaz exacta
 * que espera la función de scoring correspondiente en @radar-municipal/scoring.
 */

import { eq, and } from "drizzle-orm";
import type { DrizzleDb, DataPointRow } from "./data-points";
import { getDataPointsByFields } from "./data-points";
import { DataField } from "../../constants/data-fields";
import { SourceLayer } from "../../constants/source-layers";
import { ConfidenceLevel } from "../../types/provenance";
import { municipios, documents, sources } from "../schema";

import {
  DocumentCategory,
  DocumentFormat,
} from "../../types/document";

import type {
  FiscalIndicatorSourced,
  FiscalIndicator,
  SourcedValue,
  DataPointSource,
  DataPointConfidence,
  NormativaData,
  ComprasData,
  DocumentAudit,
  AccessibilityAudit,
  PilotAuditEntry,
} from "../../types/index";

// ─────────────────────────────────────────
// Helpers para reconstruir SourcedValue
// ─────────────────────────────────────────

function rowToSource(row: DataPointRow): DataPointSource {
  return {
    capa: row.fuenteCapa as SourceLayer,
    organismo: row.fuenteOrganismo,
    url: row.fuenteUrl,
    formato: row.fuenteFormato,
    fechaAcceso: row.fuenteFechaAcceso.toISOString(),
    fechaPublicacion: row.fuenteFechaPublicacion?.toISOString() ?? null,
  };
}

function rowToConfidence(row: DataPointRow): DataPointConfidence {
  return {
    nivel: row.confianzaNivel as ConfidenceLevel,
    notas: row.confianzaNotas,
    validadoContra: row.confianzaValidadoContra,
  };
}

function rowToSourcedValue(row: DataPointRow | undefined): SourcedValue<number> {
  if (!row) {
    return { valor: null, fuente: null, confianza: null };
  }
  return {
    valor: row.valorNumerico,
    fuente: rowToSource(row),
    confianza: rowToConfidence(row),
  };
}

function getNumeric(
  map: Map<DataField, DataPointRow>,
  field: DataField
): number | null {
  return map.get(field)?.valorNumerico ?? null;
}

function getBoolean(
  map: Map<DataField, DataPointRow>,
  field: DataField
): boolean | null {
  return map.get(field)?.valorBooleano ?? null;
}

function getBooleanAsNumber(
  map: Map<DataField, DataPointRow>,
  field: DataField
): number | null {
  const val = map.get(field);
  if (!val) return null;
  // Si hay valorNumerico (0/0.5/1), preferirlo
  if (val.valorNumerico != null) return val.valorNumerico;
  // Si hay boolean, convertir
  if (val.valorBooleano != null) return val.valorBooleano ? 1 : 0;
  return null;
}

function getText(
  map: Map<DataField, DataPointRow>,
  field: DataField
): string | null {
  return map.get(field)?.valorTexto ?? null;
}

// ─────────────────────────────────────────
// Helpers para obtener población
// ─────────────────────────────────────────

async function getPoblacion(
  db: DrizzleDb,
  municipioId: string
): Promise<number | null> {
  const rows = await db
    .select({ poblacion: municipios.poblacion })
    .from(municipios)
    .where(eq(municipios.id, municipioId))
    .limit(1);
  return rows[0]?.poblacion ?? null;
}

// ─────────────────────────────────────────
// FISCAL
// ─────────────────────────────────────────

export interface FiscalDbInput {
  fiscal: FiscalIndicatorSourced;
  poblacion: number;
}

const FISCAL_FIELDS = [
  DataField.GASTO_TOTAL,
  DataField.GASTO_PERSONAL,
  DataField.GASTO_CAPITAL,
  DataField.DEUDA_STOCK,
  DataField.INGRESO_TOTAL,
  DataField.RESULTADO_FISCAL,
  DataField.GASTO_PCAPITA,
  DataField.DEUDA_PCAPITA,
  DataField.PCT_PERSONAL,
  DataField.PCT_CAPITAL,
  DataField.AUTONOMIA_FISCAL,
  DataField.PRESION_TRIBUTARIA,
  DataField.EFICIENCIA_ADMIN,
] as const;

export async function getFiscalInput(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<FiscalDbInput | null> {
  const [map, poblacion] = await Promise.all([
    getDataPointsByFields(db, municipioId, [...FISCAL_FIELDS], anio),
    getPoblacion(db, municipioId),
  ]);

  if (map.size === 0 || !poblacion) return null;

  const fiscal: FiscalIndicatorSourced = {
    id: 0,
    municipioId,
    anio,
    trimestre: null,
    gastoTotal: rowToSourcedValue(map.get(DataField.GASTO_TOTAL)),
    gastoPersonal: rowToSourcedValue(map.get(DataField.GASTO_PERSONAL)),
    gastoCapital: rowToSourcedValue(map.get(DataField.GASTO_CAPITAL)),
    deudaTotal: rowToSourcedValue(map.get(DataField.DEUDA_STOCK)),
    ingresoTotal: rowToSourcedValue(map.get(DataField.INGRESO_TOTAL)),
    resultadoFiscal: rowToSourcedValue(map.get(DataField.RESULTADO_FISCAL)),
    gastoPcapita: rowToSourcedValue(map.get(DataField.GASTO_PCAPITA)),
    deudaPcapita: rowToSourcedValue(map.get(DataField.DEUDA_PCAPITA)),
    pctPersonal: rowToSourcedValue(map.get(DataField.PCT_PERSONAL)),
    pctCapital: rowToSourcedValue(map.get(DataField.PCT_CAPITAL)),
  };

  // Campos expandidos opcionales
  if (map.has(DataField.AUTONOMIA_FISCAL)) {
    fiscal.autonomiaFiscal = rowToSourcedValue(map.get(DataField.AUTONOMIA_FISCAL));
  }
  if (map.has(DataField.PRESION_TRIBUTARIA)) {
    fiscal.presionTributaria = rowToSourcedValue(map.get(DataField.PRESION_TRIBUTARIA));
  }
  if (map.has(DataField.EFICIENCIA_ADMIN)) {
    fiscal.eficienciaAdmin = rowToSourcedValue(map.get(DataField.EFICIENCIA_ADMIN));
  }

  return { fiscal, poblacion };
}

// ─────────────────────────────────────────
// SERVICIOS BÁSICOS
// ─────────────────────────────────────────

export interface ServiciosBasicosInput {
  pctAguaRed: number | null;
  pctCloaca: number | null;
  pctGasRed: number | null;
  recoleccionResiduos: number | null;
  alumbradoPublico: number | null;
}

const SERVICIOS_BASICOS_FIELDS = [
  DataField.PCT_AGUA_RED,
  DataField.PCT_CLOACA,
  DataField.PCT_GAS_RED,
  DataField.RECOLECCION_RESIDUOS,
  DataField.ALUMBRADO_PUBLICO,
] as const;

export async function getServiciosBasicosInput(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<ServiciosBasicosInput | null> {
  const map = await getDataPointsByFields(db, municipioId, [...SERVICIOS_BASICOS_FIELDS], anio);
  if (map.size === 0) return null;

  return {
    pctAguaRed: getNumeric(map, DataField.PCT_AGUA_RED),
    pctCloaca: getNumeric(map, DataField.PCT_CLOACA),
    pctGasRed: getNumeric(map, DataField.PCT_GAS_RED),
    recoleccionResiduos: getBooleanAsNumber(map, DataField.RECOLECCION_RESIDUOS),
    alumbradoPublico: getBooleanAsNumber(map, DataField.ALUMBRADO_PUBLICO),
  };
}

// ─────────────────────────────────────────
// CONECTIVIDAD DIGITAL
// ─────────────────────────────────────────

export interface ConectividadInput {
  pctInternet: number | null;
  bandaAnchaPer100: number | null;
  pctComputadora: number | null;
  serviciosDigitales: number | null;
}

const CONECTIVIDAD_FIELDS = [
  DataField.PCT_INTERNET,
  DataField.BANDA_ANCHA_PER_100,
  DataField.PCT_COMPUTADORA,
  DataField.SERVICIOS_DIGITALES,
] as const;

export async function getConectividadInput(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<ConectividadInput | null> {
  const map = await getDataPointsByFields(db, municipioId, [...CONECTIVIDAD_FIELDS], anio);
  if (map.size === 0) return null;

  return {
    pctInternet: getNumeric(map, DataField.PCT_INTERNET),
    bandaAnchaPer100: getNumeric(map, DataField.BANDA_ANCHA_PER_100),
    pctComputadora: getNumeric(map, DataField.PCT_COMPUTADORA),
    serviciosDigitales: getNumeric(map, DataField.SERVICIOS_DIGITALES),
  };
}

// ─────────────────────────────────────────
// EDUCACIÓN Y SALUD
// ─────────────────────────────────────────

export interface EducacionSaludInput {
  escuelasPer10k: number | null;
  centrosSaludPer10k: number | null;
  camasPer10k: number | null;
  jardinesPerNinos: number | null;
}

const EDUCACION_SALUD_FIELDS = [
  DataField.ESCUELAS_PER_10K,
  DataField.CENTROS_SALUD_PER_10K,
  DataField.CAMAS_PER_10K,
  DataField.JARDINES_PER_NINOS,
] as const;

export async function getEducacionSaludInput(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<EducacionSaludInput | null> {
  const map = await getDataPointsByFields(db, municipioId, [...EDUCACION_SALUD_FIELDS], anio);
  if (map.size === 0) return null;

  return {
    escuelasPer10k: getNumeric(map, DataField.ESCUELAS_PER_10K),
    centrosSaludPer10k: getNumeric(map, DataField.CENTROS_SALUD_PER_10K),
    camasPer10k: getNumeric(map, DataField.CAMAS_PER_10K),
    jardinesPerNinos: getNumeric(map, DataField.JARDINES_PER_NINOS),
  };
}

// ─────────────────────────────────────────
// ECONOMÍA LOCAL
// ─────────────────────────────────────────

export interface EconomiaLocalInput {
  empleoPcapita: number | null;
  variacionEmpleo: number | null;
  empresasPer1000: number | null;
  construccion: number | null;
  recaudacionPcapita: number | null;
}

const ECONOMIA_LOCAL_FIELDS = [
  DataField.EMPLEO_REGISTRADO_PER_CAPITA,
  DataField.VARIACION_EMPLEO_INTERANUAL,
  DataField.EMPRESAS_PER_CAPITA,
  DataField.PERMISOS_CONSTRUCCION,
  DataField.RECAUDACION_PROPIA_PER_CAPITA,
] as const;

export async function getEconomiaLocalInput(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<EconomiaLocalInput | null> {
  const map = await getDataPointsByFields(db, municipioId, [...ECONOMIA_LOCAL_FIELDS], anio);
  if (map.size === 0) return null;

  return {
    empleoPcapita: getNumeric(map, DataField.EMPLEO_REGISTRADO_PER_CAPITA),
    variacionEmpleo: getNumeric(map, DataField.VARIACION_EMPLEO_INTERANUAL),
    empresasPer1000: getNumeric(map, DataField.EMPRESAS_PER_CAPITA),
    construccion: getNumeric(map, DataField.PERMISOS_CONSTRUCCION),
    recaudacionPcapita: getNumeric(map, DataField.RECAUDACION_PROPIA_PER_CAPITA),
  };
}

// ─────────────────────────────────────────
// GASTO POR FUNCIÓN
// ─────────────────────────────────────────

export interface GastoFuncionInput {
  pctServiciosSociales: number | null;
  pctServiciosEconomicos: number | null;
  pctAdminGubernamental: number | null;
  pctDeudaPublica: number | null;
}

const GASTO_FUNCION_FIELDS = [
  DataField.PCT_SERVICIOS_SOCIALES,
  DataField.PCT_SERVICIOS_ECONOMICOS,
  DataField.PCT_ADMIN_GUBERNAMENTAL,
  DataField.PCT_DEUDA_PUBLICA,
] as const;

export async function getGastoFuncionInput(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<GastoFuncionInput | null> {
  const map = await getDataPointsByFields(db, municipioId, [...GASTO_FUNCION_FIELDS], anio);
  if (map.size === 0) return null;

  return {
    pctServiciosSociales: getNumeric(map, DataField.PCT_SERVICIOS_SOCIALES),
    pctServiciosEconomicos: getNumeric(map, DataField.PCT_SERVICIOS_ECONOMICOS),
    pctAdminGubernamental: getNumeric(map, DataField.PCT_ADMIN_GUBERNAMENTAL),
    pctDeudaPublica: getNumeric(map, DataField.PCT_DEUDA_PUBLICA),
  };
}

// ─────────────────────────────────────────
// SEGURIDAD VIAL
// ─────────────────────────────────────────

export interface SeguridadVialInput {
  siniestrosPer100k: number | null;
  kmPavimentadoPerKm2: number | null;
  transitoPublico: number | null;
  kmCiclovias: number | null;
}

const SEGURIDAD_VIAL_FIELDS = [
  DataField.SINIESTROS_PER_100K,
  DataField.KM_PAVIMENTADO_PER_KM2,
  DataField.TRANSITO_PUBLICO,
  DataField.KM_CICLOVIAS,
] as const;

export async function getSeguridadVialInput(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<SeguridadVialInput | null> {
  const map = await getDataPointsByFields(db, municipioId, [...SEGURIDAD_VIAL_FIELDS], anio);
  if (map.size === 0) return null;

  return {
    siniestrosPer100k: getNumeric(map, DataField.SINIESTROS_PER_100K),
    kmPavimentadoPerKm2: getNumeric(map, DataField.KM_PAVIMENTADO_PER_KM2),
    transitoPublico: getNumeric(map, DataField.TRANSITO_PUBLICO),
    kmCiclovias: getNumeric(map, DataField.KM_CICLOVIAS),
  };
}

// ─────────────────────────────────────────
// ESPACIO PÚBLICO
// ─────────────────────────────────────────

export interface EspacioPublicoInput {
  espacioVerdePcapita: number | null;
  coberturaArbolado: number | null;
  separacionResiduos: number | null;
  incidentesAmbientales: number | null;
}

const ESPACIO_PUBLICO_FIELDS = [
  DataField.ESPACIO_VERDE_PCAPITA,
  DataField.COBERTURA_ARBOLADO,
  DataField.SEPARACION_RESIDUOS,
  DataField.INCIDENTES_AMBIENTALES,
] as const;

export async function getEspacioPublicoInput(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<EspacioPublicoInput | null> {
  const map = await getDataPointsByFields(db, municipioId, [...ESPACIO_PUBLICO_FIELDS], anio);
  if (map.size === 0) return null;

  return {
    espacioVerdePcapita: getNumeric(map, DataField.ESPACIO_VERDE_PCAPITA),
    coberturaArbolado: getNumeric(map, DataField.COBERTURA_ARBOLADO),
    separacionResiduos: getNumeric(map, DataField.SEPARACION_RESIDUOS),
    incidentesAmbientales: getNumeric(map, DataField.INCIDENTES_AMBIENTALES),
  };
}

// ─────────────────────────────────────────
// PARTICIPACIÓN CIUDADANA
// ─────────────────────────────────────────

export interface ParticipacionInput {
  presupuestoParticipativo: number | null;
  audienciasPublicas: number | null;
  sistemaReclamos: number | null;
  transparenciaHcd: number | null;
  evidenciaPresupuesto: string | null;
  evidenciaAudiencias: string | null;
  urlReclamos: string | null;
  urlHcd: string | null;
}

const PARTICIPACION_FIELDS = [
  DataField.PRESUPUESTO_PARTICIPATIVO,
  DataField.AUDIENCIAS_PUBLICAS,
  DataField.SISTEMA_RECLAMOS,
  DataField.TRANSPARENCIA_HCD,
] as const;

export async function getParticipacionInput(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<ParticipacionInput | null> {
  const map = await getDataPointsByFields(db, municipioId, [...PARTICIPACION_FIELDS], anio);
  if (map.size === 0) return null;

  return {
    presupuestoParticipativo: getBooleanAsNumber(map, DataField.PRESUPUESTO_PARTICIPATIVO),
    audienciasPublicas: getBooleanAsNumber(map, DataField.AUDIENCIAS_PUBLICAS),
    sistemaReclamos: getBooleanAsNumber(map, DataField.SISTEMA_RECLAMOS),
    transparenciaHcd: getBooleanAsNumber(map, DataField.TRANSPARENCIA_HCD),
    evidenciaPresupuesto: getText(map, DataField.PRESUPUESTO_PARTICIPATIVO),
    evidenciaAudiencias: getText(map, DataField.AUDIENCIAS_PUBLICAS),
    urlReclamos: getText(map, DataField.SISTEMA_RECLAMOS),
    urlHcd: getText(map, DataField.TRANSPARENCIA_HCD),
  };
}

// ─────────────────────────────────────────
// NORMATIVA
// ─────────────────────────────────────────

export interface NormativaDbInput {
  normativa: NormativaData;
  compras: ComprasData;
}

const NORMATIVA_FIELDS = [
  DataField.BOLETIN_SIBOM,
  DataField.ORDENANZA_FISCAL_VIGENTE,
  DataField.LICITACIONES_PUBLICADAS,
  DataField.ADJUDICACIONES_PUBLICADAS,
] as const;

export async function getNormativaInput(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<NormativaDbInput | null> {
  const map = await getDataPointsByFields(db, municipioId, [...NORMATIVA_FIELDS], anio);
  if (map.size === 0) return null;

  const tieneBoletinSibom = getBoolean(map, DataField.BOLETIN_SIBOM) ?? false;
  const ordenanzaVigente = getBoolean(map, DataField.ORDENANZA_FISCAL_VIGENTE) ?? false;
  const publicaLicit = getBoolean(map, DataField.LICITACIONES_PUBLICADAS) ?? false;
  const publicaAdj = getBoolean(map, DataField.ADJUDICACIONES_PUBLICADAS) ?? false;

  // Count bolletines from text field if available
  const boletinRow = map.get(DataField.BOLETIN_SIBOM);
  const boletinesPublicados = boletinRow?.valorNumerico ?? 0;

  const normativa: NormativaData = {
    municipioId,
    nombre: "",
    fechaScrape: new Date().toISOString().slice(0, 10),
    normasEncontradas: boletinesPublicados,
    normas: [],
    tieneBoletinSibom,
    boletinesPublicados,
    ultimoBoletinAnio: tieneBoletinSibom ? anio : null,
    ordenanzaFiscalVigente: ordenanzaVigente
      ? {
          municipioId,
          tipo: "ORDENANZA" as const,
          numero: "s/n",
          anio: anio,
          fecha: null,
          titulo: "Ordenanza fiscal vigente",
          urlPdf: map.get(DataField.ORDENANZA_FISCAL_VIGENTE)?.fuenteUrl ?? null,
        }
      : null,
  };

  const compras: ComprasData = {
    municipioId,
    publicaLicitaciones: publicaLicit,
    urlPortalCompras: map.get(DataField.LICITACIONES_PUBLICADAS)?.fuenteUrl ?? null,
    publicaAdjudicaciones: publicaAdj,
    licitacionesDetectadas: map.get(DataField.LICITACIONES_PUBLICADAS)?.valorNumerico ?? 0,
    plataforma: null,
    notas: null,
  };

  return { normativa, compras };
}

// ─────────────────────────────────────────
// TRANSPARENCIA (usa documents + sources, no dataPoints)
// ─────────────────────────────────────────

const TRANSPARENCY_CATEGORIES = [
  DocumentCategory.PRESUPUESTO,
  DocumentCategory.EJECUCION,
  DocumentCategory.SEF,
  DocumentCategory.DEUDA,
  DocumentCategory.FINALIDAD_FUNCION,
  DocumentCategory.ORDENANZA_FISCAL,
] as const;

export async function getTransparenciaInput(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<PilotAuditEntry | null> {
  // Get all documents for this municipio in this year
  const docs = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.municipioId, municipioId),
        eq(documents.anio, anio)
      )
    );

  // Get source record (portal) for accessibility info
  const sourceRows = await db
    .select()
    .from(sources)
    .where(eq(sources.municipioId, municipioId))
    .limit(1);

  const source = sourceRows[0];

  // Build document audits
  const documentAudits: DocumentAudit[] = TRANSPARENCY_CATEGORIES.map((cat) => {
    const doc = docs.find((d) => d.categoria === cat);
    return {
      categoria: cat,
      publicado: !!doc,
      url: doc?.url ?? null,
      formato: (doc?.formato as DocumentFormat) ?? null,
      anio: doc?.anio ?? anio,
      trimestre: doc?.trimestre ?? null,
      fechaPublicacion: doc?.fechaPublicacion?.toISOString() ?? null,
      fechaCorte: doc?.fechaCorte?.toISOString() ?? null,
      esParseable: doc?.esParseable ?? false,
      notas: null,
    };
  });

  // Build accessibility audit
  const accesibilidad: AccessibilityAudit = {
    urlPortal: source?.url ?? null,
    portalAccesible: source ? source.estado === "ACTIVO" : false,
    clicksDesdeHome: null,
    menuTransparenciaVisible: false,
  };

  return {
    municipioId,
    fechaAuditoria: new Date().toISOString().slice(0, 10),
    auditor: "db-query",
    accesibilidad,
    documentos: documentAudits,
  };
}

// ─────────────────────────────────────────
// ALL INPUTS (utility for bulk scoring)
// ─────────────────────────────────────────

export interface AllScoringInputs {
  fiscal: FiscalDbInput | null;
  serviciosBasicos: ServiciosBasicosInput | null;
  conectividad: ConectividadInput | null;
  educacionSalud: EducacionSaludInput | null;
  economiaLocal: EconomiaLocalInput | null;
  gastoFuncion: GastoFuncionInput | null;
  seguridadVial: SeguridadVialInput | null;
  espacioPublico: EspacioPublicoInput | null;
  participacion: ParticipacionInput | null;
  normativa: NormativaDbInput | null;
  transparencia: PilotAuditEntry | null;
}

/**
 * Carga todos los inputs de scoring para un municipio.
 * Ejecuta las 11 queries en paralelo para eficiencia.
 */
export async function getAllScoringInputs(
  db: DrizzleDb,
  municipioId: string,
  anio: number
): Promise<AllScoringInputs> {
  const [
    fiscal,
    serviciosBasicos,
    conectividad,
    educacionSalud,
    economiaLocal,
    gastoFuncion,
    seguridadVial,
    espacioPublico,
    participacion,
    normativa,
    transparencia,
  ] = await Promise.all([
    getFiscalInput(db, municipioId, anio),
    getServiciosBasicosInput(db, municipioId, anio),
    getConectividadInput(db, municipioId, anio),
    getEducacionSaludInput(db, municipioId, anio),
    getEconomiaLocalInput(db, municipioId, anio),
    getGastoFuncionInput(db, municipioId, anio),
    getSeguridadVialInput(db, municipioId, anio),
    getEspacioPublicoInput(db, municipioId, anio),
    getParticipacionInput(db, municipioId, anio),
    getNormativaInput(db, municipioId, anio),
    getTransparenciaInput(db, municipioId, anio),
  ]);

  return {
    fiscal,
    serviciosBasicos,
    conectividad,
    educacionSalud,
    economiaLocal,
    gastoFuncion,
    seguridadVial,
    espacioPublico,
    participacion,
    normativa,
    transparencia,
  };
}
