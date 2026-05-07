import {
  MUNICIPIOS,
  MUNICIPIOS_PILOTO,
  type Municipio,
  type PilotAuditData,
  type TransparencyScore,
  type FiscalIndicatorSourced,
  type NormativaData,
  type ComprasData,
  type SourcedValue,
  type DataGapType,
  getMunicipioById as getMunById,
  flattenFiscalIndicator,
  FISCAL_PRIMARY_FIELDS,
  type FiscalPrimaryField,
  ScoringDimension,
  ScoringCategory,
  computeWeightedTotal,
} from "@radar-municipal/core";
import {
  calculateAllPilotScores,
  getScoreBreakdown,
  scoreFiscalSourced,
  scoreNormativa,
  scoreServiciosBasicos,
  scoreParticipacion,
  scoreEducacionSalud,
  scoreConectividad,
  scoreEconomiaLocal,
  scoreGastoFuncion,
  scoreSeguridadVial,
  scoreEspacioPublico,
  type CriterionBreakdown,
  type FiscalScoreResult,
  type NormativaScoreResult,
  type ServiciosBasicosScoreResult,
  type ParticipacionScoreResult,
  type EducacionSaludScoreResult,
  type ConectividadScoreResult,
  type EconomiaLocalScoreResult,
  type GastoFuncionScoreResult,
  type SeguridadVialScoreResult,
  type EspacioPublicoScoreResult,
} from "@radar-municipal/scoring";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Load data
const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../../../../data");

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, filename), "utf-8")) as T;
}

// ─────────────────────────────────────────
// Transparencia
// ─────────────────────────────────────────
const auditData = loadJson<PilotAuditData>("pilot-audit.json");
const allScores = calculateAllPilotScores(auditData);
const auditMap = new Map(auditData.map((a) => [a.municipioId, a]));

// ─────────────────────────────────────────
// Fiscal (formato SourcedValue)
// ─────────────────────────────────────────
interface FiscalSourcedEntry {
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

const fiscalRaw = loadJson<FiscalSourcedEntry[]>("pilot-fiscal.json");
const allFiscalScores = new Map<string, FiscalScoreResult>();
const allFiscalSourced = new Map<string, FiscalSourcedEntry>();

for (const entry of fiscalRaw) {
  const municipio = getMunById(entry.municipioId);
  if (!municipio || !municipio.poblacion) continue;
  allFiscalSourced.set(entry.municipioId, entry);

  const sourced: FiscalIndicatorSourced = {
    id: 0,
    municipioId: entry.municipioId,
    anio: entry.anio,
    trimestre: entry.trimestre,
    gastoTotal: entry.gastoTotal,
    gastoPersonal: entry.gastoPersonal,
    gastoCapital: entry.gastoCapital,
    deudaTotal: entry.deudaTotal,
    ingresoTotal: entry.ingresoTotal,
    resultadoFiscal: entry.resultadoFiscal,
    gastoPcapita: entry.gastoPcapita,
    deudaPcapita: entry.deudaPcapita,
    pctPersonal: entry.pctPersonal,
    pctCapital: entry.pctCapital,
    ...(entry.autonomiaFiscal ? { autonomiaFiscal: entry.autonomiaFiscal } : {}),
    ...(entry.presionTributaria ? { presionTributaria: entry.presionTributaria } : {}),
    ...(entry.eficienciaAdmin ? { eficienciaAdmin: entry.eficienciaAdmin } : {}),
  };

  allFiscalScores.set(
    entry.municipioId,
    scoreFiscalSourced({ fiscal: sourced, poblacion: municipio.poblacion })
  );
}

// ─────────────────────────────────────────
// Normativa
// ─────────────────────────────────────────
const allNormativaScores = new Map<string, NormativaScoreResult>();
try {
  const normativaRaw = loadJson<any[]>("pilot-normativa.json");
  for (const entry of normativaRaw) {
    const normData: NormativaData = {
      municipioId: entry.municipioId,
      nombre: entry.nombre,
      fechaScrape: entry.fechaScrape,
      normasEncontradas: entry.normasEncontradas,
      normas: [],
      ordenanzaFiscalVigente: entry.ordenanzaFiscalVigente,
      tieneBoletinSibom: entry.tieneBoletinSibom,
      boletinesPublicados: entry.boletinesPublicados,
      ultimoBoletinAnio: entry.ultimoBoletinAnio,
    };
    const comprasData: ComprasData = {
      municipioId: entry.municipioId,
      ...entry.compras,
    };
    allNormativaScores.set(
      entry.municipioId,
      scoreNormativa({ normativa: normData, compras: comprasData })
    );
  }
} catch { /* normativa data not available */ }

// ─────────────────────────────────────────
// Servicios Básicos
// ─────────────────────────────────────────
const allServiciosBasicosScores = new Map<string, ServiciosBasicosScoreResult>();
try {
  const sbRaw = loadJson<any[]>("pilot-servicios-basicos.json");
  for (const entry of sbRaw) {
    allServiciosBasicosScores.set(
      entry.municipioId,
      scoreServiciosBasicos({
        pctAguaRed: entry.pctAguaRed,
        pctCloaca: entry.pctCloaca,
        pctGasRed: entry.pctGasRed,
        recoleccionResiduos: entry.recoleccionResiduos,
        alumbradoPublico: entry.alumbradoPublico,
      })
    );
  }
} catch { /* data not available */ }

// ─────────────────────────────────────────
// Participación Ciudadana
// ─────────────────────────────────────────
const allParticipacionScores = new Map<string, ParticipacionScoreResult>();
try {
  const pRaw = loadJson<any[]>("pilot-participacion.json");
  for (const entry of pRaw) {
    allParticipacionScores.set(
      entry.municipioId,
      scoreParticipacion({
        presupuestoParticipativo: entry.presupuestoParticipativo,
        audienciasPublicas: entry.audienciasPublicas,
        sistemaReclamos: entry.sistemaReclamos,
        transparenciaHcd: entry.transparenciaHcd,
        evidenciaPresupuesto: entry.evidenciaPresupuesto ?? null,
        evidenciaAudiencias: entry.evidenciaAudiencias ?? null,
        urlReclamos: entry.urlReclamos ?? null,
        urlHcd: entry.urlHcd ?? null,
      })
    );
  }
} catch { /* data not available */ }

// ─────────────────────────────────────────
// Educación y Salud
// ─────────────────────────────────────────
const allEducacionSaludScores = new Map<string, EducacionSaludScoreResult>();
try {
  const esRaw = loadJson<any[]>("pilot-educacion-salud.json");
  for (const entry of esRaw) {
    allEducacionSaludScores.set(
      entry.municipioId,
      scoreEducacionSalud({
        escuelasPer10k: entry.escuelasPer10k,
        centrosSaludPer10k: entry.centrosSaludPer10k,
        camasPer10k: entry.camasPer10k,
        jardinesPerNinos: entry.jardinesPerNinos ?? null,
      })
    );
  }
} catch { /* data not available */ }

// ─────────────────────────────────────────
// Conectividad Digital
// ─────────────────────────────────────────
const allConectividadScores = new Map<string, ConectividadScoreResult>();
try {
  const cRaw = loadJson<any[]>("pilot-conectividad.json");
  for (const entry of cRaw) {
    allConectividadScores.set(
      entry.municipioId,
      scoreConectividad({
        pctInternet: entry.pctInternet,
        bandaAnchaPer100: entry.bandaAnchaPer100,
        pctComputadora: entry.pctComputadora,
        serviciosDigitales: entry.serviciosDigitales,
      })
    );
  }
} catch { /* data not available */ }

// ─────────────────────────────────────────
// Economía Local
// ─────────────────────────────────────────
const allEconomiaLocalScores = new Map<string, EconomiaLocalScoreResult>();
try {
  const elRaw = loadJson<any[]>("pilot-economia-local.json");
  for (const entry of elRaw) {
    allEconomiaLocalScores.set(
      entry.municipioId,
      scoreEconomiaLocal({
        empleoPcapita: entry.empleoPcapita,
        variacionEmpleo: entry.variacionEmpleo,
        empresasPer1000: entry.empresasPer1000,
        construccion: entry.construccion ?? null,
        recaudacionPcapita: entry.recaudacionPcapita ?? null,
      })
    );
  }
} catch { /* data not available */ }

// ─────────────────────────────────────────
// Gasto por Función
// ─────────────────────────────────────────
const allGastoFuncionScores = new Map<string, GastoFuncionScoreResult>();
try {
  const gfRaw = loadJson<any[]>("pilot-gasto-funcion.json");
  for (const entry of gfRaw) {
    allGastoFuncionScores.set(
      entry.municipioId,
      scoreGastoFuncion({
        pctServiciosSociales: entry.pctServiciosSociales,
        pctServiciosEconomicos: entry.pctServiciosEconomicos,
        pctAdminGubernamental: entry.pctAdminGubernamental,
        pctDeudaPublica: entry.pctDeudaPublica,
      })
    );
  }
} catch { /* data not available */ }

// ─────────────────────────────────────────
// Seguridad Vial
// ─────────────────────────────────────────
const allSeguridadVialScores = new Map<string, SeguridadVialScoreResult>();
try {
  const svRaw = loadJson<any[]>("pilot-seguridad-vial.json");
  for (const entry of svRaw) {
    allSeguridadVialScores.set(
      entry.municipioId,
      scoreSeguridadVial({
        siniestrosPer100k: entry.siniestrosPer100k,
        kmPavimentadoPerKm2: entry.kmPavimentadoPerKm2,
        transitoPublico: entry.transitoPublico,
        kmCiclovias: entry.kmCiclovias,
      })
    );
  }
} catch { /* data not available */ }

// ─────────────────────────────────────────
// Espacio Público
// ─────────────────────────────────────────
const allEspacioPublicoScores = new Map<string, EspacioPublicoScoreResult>();
try {
  const epRaw = loadJson<any[]>("pilot-espacio-publico.json");
  for (const entry of epRaw) {
    allEspacioPublicoScores.set(
      entry.municipioId,
      scoreEspacioPublico({
        espacioVerdePcapita: entry.espacioVerdePcapita,
        coberturaArbolado: entry.coberturaArbolado,
        separacionResiduos: entry.separacionResiduos,
        incidentesAmbientales: entry.incidentesAmbientales,
      })
    );
  }
} catch { /* data not available */ }

// ─────────────────────────────────────────
// Data Gaps
// ─────────────────────────────────────────
interface DataGapRawEntry {
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

const allDataGaps = new Map<string, DataGapRawEntry["gaps"]>();
try {
  const gapsRaw = loadJson<DataGapRawEntry[]>("pilot-data-gaps.json");
  for (const entry of gapsRaw) {
    allDataGaps.set(entry.municipioId, entry.gaps);
  }
} catch { /* gaps data not available */ }

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function buildDimensionMap(scores: {
  transparencia: number;
  fiscal: number | null;
  normativa: number | null;
  serviciosBasicos: number | null;
  participacion: number | null;
  educacionSalud: number | null;
  conectividad: number | null;
  economiaLocal: number | null;
  gastoFuncion: number | null;
  seguridadVial: number | null;
  espacioPublico: number | null;
}): Map<ScoringDimension, number | null> {
  return new Map([
    [ScoringDimension.TRANSPARENCIA, scores.transparencia],
    [ScoringDimension.FISCAL, scores.fiscal],
    [ScoringDimension.NORMATIVA, scores.normativa],
    [ScoringDimension.SERVICIOS_BASICOS, scores.serviciosBasicos],
    [ScoringDimension.PARTICIPACION_CIUDADANA, scores.participacion],
    [ScoringDimension.EDUCACION_SALUD, scores.educacionSalud],
    [ScoringDimension.CONECTIVIDAD_DIGITAL, scores.conectividad],
    [ScoringDimension.ECONOMIA_LOCAL, scores.economiaLocal],
    [ScoringDimension.GASTO_POR_FUNCION, scores.gastoFuncion],
    [ScoringDimension.SEGURIDAD_VIAL, scores.seguridadVial],
    [ScoringDimension.ESPACIO_PUBLICO, scores.espacioPublico],
  ]);
}

function buildFiscalProvenance(entry: FiscalSourcedEntry) {
  return FISCAL_PRIMARY_FIELDS.map((campo) => {
    const sv = entry[campo] as SourcedValue<number>;
    return {
      campo,
      capa: sv.fuente?.capa ?? null,
      organismo: sv.fuente?.organismo ?? null,
      url: sv.fuente?.url ?? null,
      confianzaNivel: sv.confianza?.nivel ?? null,
      confianzaNotas: sv.confianza?.notas ?? null,
    };
  });
}

// ─────────────────────────────────────────
// Public API
// ─────────────────────────────────────────

export function getAllMunicipios(filters?: {
  piloto?: boolean;
  q?: string;
}): Municipio[] {
  let result = MUNICIPIOS;
  if (filters?.piloto) {
    result = result.filter((m) => m.esPiloto);
  }
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    result = result.filter(
      (m) =>
        m.nombre.toLowerCase().includes(q) ||
        m.partido.toLowerCase().includes(q)
    );
  }
  return result;
}

export function getMunicipioById(id: string): Municipio | undefined {
  return MUNICIPIOS.find((m) => m.id === id);
}

export function getRanking(options?: { categoria?: ScoringCategory }) {
  return MUNICIPIOS_PILOTO.map((m) => {
    const tScore = allScores.get(m.id);
    const fScore = allFiscalScores.get(m.id);
    const nScore = allNormativaScores.get(m.id);
    const sbScore = allServiciosBasicosScores.get(m.id);
    const pScore = allParticipacionScores.get(m.id);
    const esScore = allEducacionSaludScores.get(m.id);
    const cScore = allConectividadScores.get(m.id);
    const elScore = allEconomiaLocalScores.get(m.id);
    const gfScore = allGastoFuncionScores.get(m.id);
    const svScore = allSeguridadVialScores.get(m.id);
    const epScore = allEspacioPublicoScores.get(m.id);
    const scoreTransparencia = tScore?.scoreTotal ?? 0;
    const scoreFiscal = fScore?.scoreTotal ?? null;
    const scoreNormativa = nScore?.scoreTotal ?? null;
    const scoreServiciosBasicos = sbScore?.scoreTotal ?? null;
    const scoreParticipacion = pScore?.scoreTotal ?? null;
    const scoreEducacionSalud = esScore?.scoreTotal ?? null;
    const scoreConectividad = cScore?.scoreTotal ?? null;
    const scoreEconomiaLocal = elScore?.scoreTotal ?? null;
    const scoreGastoFuncion = gfScore?.scoreTotal ?? null;
    const scoreSeguridadVial = svScore?.scoreTotal ?? null;
    const scoreEspacioPublico = epScore?.scoreTotal ?? null;
    const gaps = allDataGaps.get(m.id) ?? [];

    const weighted = computeWeightedTotal(buildDimensionMap({
      transparencia: scoreTransparencia,
      fiscal: scoreFiscal,
      normativa: scoreNormativa,
      serviciosBasicos: scoreServiciosBasicos,
      participacion: scoreParticipacion,
      educacionSalud: scoreEducacionSalud,
      conectividad: scoreConectividad,
      economiaLocal: scoreEconomiaLocal,
      gastoFuncion: scoreGastoFuncion,
      seguridadVial: scoreSeguridadVial,
      espacioPublico: scoreEspacioPublico,
    }));

    return {
      municipioId: m.id,
      nombre: m.nombre,
      partido: m.partido,
      poblacion: m.poblacion,
      superficieKm2: m.superficieKm2,
      scoreTransparencia,
      scoreFiscal,
      scoreNormativa,
      scoreServiciosBasicos,
      scoreParticipacion,
      scoreEducacionSalud,
      scoreConectividad,
      scoreEconomiaLocal,
      scoreGastoFuncion,
      scoreSeguridadVial,
      scoreEspacioPublico,
      scoreTotal: weighted.scoreTotal,
      categoryScores: weighted.categoryScores,
      cantidadBrechas: gaps.length,
    };
  })
    .sort((a, b) => {
      if (options?.categoria) {
        const catA = a.categoryScores[options.categoria] ?? -1;
        const catB = b.categoryScores[options.categoria] ?? -1;
        return catB - catA;
      }
      return b.scoreTotal - a.scoreTotal;
    })
    .map((entry, i) => ({ ...entry, posicion: i + 1 }));
}

export function getMunicipioScores(
  municipioId: string
): TransparencyScore | null {
  return allScores.get(municipioId) ?? null;
}

export function getMunicipioFiscalScore(
  municipioId: string
): FiscalScoreResult | null {
  return allFiscalScores.get(municipioId) ?? null;
}

export function getMunicipioNormativaScore(
  municipioId: string
): NormativaScoreResult | null {
  return allNormativaScores.get(municipioId) ?? null;
}

export function getMunicipioServiciosBasicosScore(
  municipioId: string
): ServiciosBasicosScoreResult | null {
  return allServiciosBasicosScores.get(municipioId) ?? null;
}

export function getMunicipioParticipacionScore(
  municipioId: string
): ParticipacionScoreResult | null {
  return allParticipacionScores.get(municipioId) ?? null;
}

export function getMunicipioEducacionSaludScore(
  municipioId: string
): EducacionSaludScoreResult | null {
  return allEducacionSaludScores.get(municipioId) ?? null;
}

export function getMunicipioConectividadScore(
  municipioId: string
): ConectividadScoreResult | null {
  return allConectividadScores.get(municipioId) ?? null;
}

export function getMunicipioEconomiaLocalScore(
  municipioId: string
): EconomiaLocalScoreResult | null {
  return allEconomiaLocalScores.get(municipioId) ?? null;
}

export function getMunicipioGastoFuncionScore(
  municipioId: string
): GastoFuncionScoreResult | null {
  return allGastoFuncionScores.get(municipioId) ?? null;
}

export function getMunicipioSeguridadVialScore(
  municipioId: string
): SeguridadVialScoreResult | null {
  return allSeguridadVialScores.get(municipioId) ?? null;
}

export function getMunicipioEspacioPublicoScore(
  municipioId: string
): EspacioPublicoScoreResult | null {
  return allEspacioPublicoScores.get(municipioId) ?? null;
}

export function getMunicipioBreakdown(
  municipioId: string
): CriterionBreakdown[] | null {
  const audit = auditMap.get(municipioId);
  if (!audit) return null;
  return getScoreBreakdown(audit);
}

export function getMunicipioDataGaps(municipioId: string) {
  return allDataGaps.get(municipioId) ?? [];
}

export function getMunicipioFiscalProvenance(municipioId: string) {
  const fData = allFiscalSourced.get(municipioId);
  return fData ? buildFiscalProvenance(fData) : null;
}
