import {
  type PilotAuditEntry,
  type PilotAuditData,
  type FiscalIndicatorSourced,
  type NormativaData,
  type ComprasData,
  getMunicipioById,
} from "@radar-municipal/core";
import {
  calculateAllPilotScores,
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

import type {
  FiscalSourcedEntry,
  NormativaRawEntry,
  DataGapRawEntry,
  ServiciosBasicosRawEntry,
  ParticipacionRawEntry,
  EducacionSaludRawEntry,
  ConectividadRawEntry,
  EconomiaLocalRawEntry,
  GastoFuncionRawEntry,
  SeguridadVialRawEntry,
  EspacioPublicoRawEntry,
} from "./types";

import pilotAuditJson from "../../data/pilot-audit.json";
import autoAuditJson from "../../data/auto-audit.json";
import pilotFiscalJson from "../../data/pilot-fiscal.json";
import pilotNormativaJson from "../../data/pilot-normativa.json";
import pilotDataGapsJson from "../../data/pilot-data-gaps.json";
import pilotServiciosBasicosJson from "../../data/pilot-servicios-basicos.json";
import pilotParticipacionJson from "../../data/pilot-participacion.json";
import pilotEducacionSaludJson from "../../data/pilot-educacion-salud.json";
import pilotConectividadJson from "../../data/pilot-conectividad.json";
import pilotEconomiaLocalJson from "../../data/pilot-economia-local.json";
import pilotGastoFuncionJson from "../../data/pilot-gasto-funcion.json";
import pilotSeguridadVialJson from "../../data/pilot-seguridad-vial.json";
import pilotEspacioPublicoJson from "../../data/pilot-espacio-publico.json";

// ─────────────────────────────────────────
// Calcular scores al importar (build time para SSG)
// ─────────────────────────────────────────

// Transparencia: mezcla pilot (auditoría humana) + auto (crawler-automatico).
// Pilot tiene prioridad sobre auto si ambos cubren el mismo municipio —
// el ingest CLI ya excluye los 13 piloto por default, así que normalmente
// no hay colisión. Este filtro es una red de seguridad.
const pilotData = pilotAuditJson as unknown as PilotAuditData;
const autoData = autoAuditJson as unknown as PilotAuditData;
const pilotIds = new Set(pilotData.map((a) => a.municipioId));
export const auditData: PilotAuditData = [
  ...pilotData,
  ...autoData.filter((a) => !pilotIds.has(a.municipioId)),
];
export const allTransparencyScores = calculateAllPilotScores(auditData);
export const auditMap = new Map(auditData.map((a) => [a.municipioId, a]));

// Fiscal (nuevo formato SourcedValue)
const fiscalRaw = pilotFiscalJson as unknown as FiscalSourcedEntry[];
export const allFiscalScores = new Map<string, FiscalScoreResult>();
export const allFiscalSourced = new Map<string, FiscalSourcedEntry>();

for (const entry of fiscalRaw) {
  const municipio = getMunicipioById(entry.municipioId);
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

// Normativa + Compras
const normativaRaw = pilotNormativaJson as NormativaRawEntry[];
export const allNormativaScores = new Map<string, NormativaScoreResult>();
export const allNormativaData = new Map<string, NormativaRawEntry>();

for (const entry of normativaRaw) {
  allNormativaData.set(entry.municipioId, entry);
  const normData: NormativaData = {
    municipioId: entry.municipioId,
    nombre: entry.nombre,
    fechaScrape: entry.fechaScrape,
    normasEncontradas: entry.normasEncontradas,
    normas: [],
    ordenanzaFiscalVigente: entry.ordenanzaFiscalVigente as NormativaData["ordenanzaFiscalVigente"],
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

// Data Gaps
const dataGapsRaw = pilotDataGapsJson as unknown as DataGapRawEntry[];
export const allDataGaps = new Map<string, DataGapRawEntry["gaps"]>();
for (const entry of dataGapsRaw) {
  allDataGaps.set(entry.municipioId, entry.gaps);
}

// Servicios Básicos
const serviciosBasicosRaw = pilotServiciosBasicosJson as ServiciosBasicosRawEntry[];
export const allServiciosBasicosScores = new Map<string, ServiciosBasicosScoreResult>();
export const allServiciosBasicosData = new Map<string, ServiciosBasicosRawEntry>();

for (const entry of serviciosBasicosRaw) {
  allServiciosBasicosData.set(entry.municipioId, entry);
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

// Participación Ciudadana
const participacionRaw = pilotParticipacionJson as ParticipacionRawEntry[];
export const allParticipacionScores = new Map<string, ParticipacionScoreResult>();

for (const entry of participacionRaw) {
  allParticipacionScores.set(
    entry.municipioId,
    scoreParticipacion({
      presupuestoParticipativo: entry.presupuestoParticipativo,
      audienciasPublicas: entry.audienciasPublicas,
      sistemaReclamos: entry.sistemaReclamos,
      transparenciaHcd: entry.transparenciaHcd,
      evidenciaPresupuesto: entry.evidenciaPresupuesto,
      evidenciaAudiencias: entry.evidenciaAudiencias,
      urlReclamos: entry.urlReclamos,
      urlHcd: entry.urlHcd,
    })
  );
}

// Educación y Salud
const educacionSaludRaw = pilotEducacionSaludJson as EducacionSaludRawEntry[];
export const allEducacionSaludScores = new Map<string, EducacionSaludScoreResult>();
export const allEducacionSaludData = new Map<string, EducacionSaludRawEntry>();

for (const entry of educacionSaludRaw) {
  allEducacionSaludData.set(entry.municipioId, entry);
  allEducacionSaludScores.set(
    entry.municipioId,
    scoreEducacionSalud({
      escuelasPer10k: entry.escuelasPer10k,
      centrosSaludPer10k: entry.centrosSaludPer10k,
      camasPer10k: entry.camasPer10k,
      jardinesPerNinos: entry.jardinesPerNinos,
    })
  );
}

// Conectividad Digital
const conectividadRaw = pilotConectividadJson as ConectividadRawEntry[];
export const allConectividadScores = new Map<string, ConectividadScoreResult>();
export const allConectividadData = new Map<string, ConectividadRawEntry>();

for (const entry of conectividadRaw) {
  allConectividadData.set(entry.municipioId, entry);
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

// Economía Local
const economiaLocalRaw = pilotEconomiaLocalJson as EconomiaLocalRawEntry[];
export const allEconomiaLocalScores = new Map<string, EconomiaLocalScoreResult>();
export const allEconomiaLocalData = new Map<string, EconomiaLocalRawEntry>();

for (const entry of economiaLocalRaw) {
  allEconomiaLocalData.set(entry.municipioId, entry);
  allEconomiaLocalScores.set(
    entry.municipioId,
    scoreEconomiaLocal({
      empleoPcapita: entry.empleoPcapita,
      variacionEmpleo: entry.variacionEmpleo,
      empresasPer1000: entry.empresasPer1000,
      construccion: entry.construccion,
      recaudacionPcapita: entry.recaudacionPcapita,
    })
  );
}

// Gasto por Función
const gastoFuncionRaw = pilotGastoFuncionJson as GastoFuncionRawEntry[];
export const allGastoFuncionScores = new Map<string, GastoFuncionScoreResult>();
export const allGastoFuncionData = new Map<string, GastoFuncionRawEntry>();

for (const entry of gastoFuncionRaw) {
  allGastoFuncionData.set(entry.municipioId, entry);
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

// Seguridad Vial
const seguridadVialRaw = pilotSeguridadVialJson as SeguridadVialRawEntry[];
export const allSeguridadVialScores = new Map<string, SeguridadVialScoreResult>();
export const allSeguridadVialData = new Map<string, SeguridadVialRawEntry>();

for (const entry of seguridadVialRaw) {
  allSeguridadVialData.set(entry.municipioId, entry);
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

// Espacio Público
const espacioPublicoRaw = pilotEspacioPublicoJson as EspacioPublicoRawEntry[];
export const allEspacioPublicoScores = new Map<string, EspacioPublicoScoreResult>();
export const allEspacioPublicoData = new Map<string, EspacioPublicoRawEntry>();

for (const entry of espacioPublicoRaw) {
  allEspacioPublicoData.set(entry.municipioId, entry);
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
