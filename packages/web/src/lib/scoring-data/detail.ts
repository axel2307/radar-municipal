import {
  getMunicipioById,
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
  computeWeightedTotal,
} from "@radar-municipal/core";
import {
  getScoreBreakdown,
} from "@radar-municipal/scoring";

import type {
  MunicipioDetail,
  DocumentDetail,
  FiscalDetail,
  NormativaDetail,
  ServiciosBasicosDetail,
  ParticipacionDetail,
  EducacionSaludDetail,
  ConectividadDetail,
  EconomiaLocalDetail,
  GastoFuncionDetail,
  SeguridadVialDetail,
  EspacioPublicoDetail,
  DataGapDetail,
} from "./types";
import { buildDimensionMap, buildProvenance, buildProvenanceSummary } from "./helpers";
import {
  auditMap,
  allTransparencyScores,
  allFiscalScores,
  allFiscalSourced,
  allNormativaScores,
  allNormativaData,
  allServiciosBasicosScores,
  allServiciosBasicosData,
  allParticipacionScores,
  allEducacionSaludScores,
  allEducacionSaludData,
  allConectividadScores,
  allConectividadData,
  allEconomiaLocalScores,
  allEconomiaLocalData,
  allGastoFuncionScores,
  allGastoFuncionData,
  allSeguridadVialScores,
  allSeguridadVialData,
  allEspacioPublicoScores,
  allEspacioPublicoData,
  allDataGaps,
} from "./loaders";
import { getPresionImpositivaScores } from "./presion-impositiva";

export function getMunicipioDetail(id: string): MunicipioDetail | null {
  const municipio = getMunicipioById(id);
  const audit = auditMap.get(id);
  const tScore = allTransparencyScores.get(id);
  if (!municipio || !audit || !tScore) return null;

  const breakdown = getScoreBreakdown(audit);
  const fScore = allFiscalScores.get(id);
  const fData = allFiscalSourced.get(id);
  const nScore = allNormativaScores.get(id);
  const nData = allNormativaData.get(id);
  const sbScore = allServiciosBasicosScores.get(id);
  const sbData = allServiciosBasicosData.get(id);
  const pScore = allParticipacionScores.get(id);
  const esScore = allEducacionSaludScores.get(id);
  const esData = allEducacionSaludData.get(id);
  const cScore = allConectividadScores.get(id);
  const cData = allConectividadData.get(id);
  const elScore = allEconomiaLocalScores.get(id);
  const elData = allEconomiaLocalData.get(id);
  const gfScore = allGastoFuncionScores.get(id);
  const gfData = allGastoFuncionData.get(id);
  const svScore = allSeguridadVialScores.get(id);
  const svData = allSeguridadVialData.get(id);
  const epScore = allEspacioPublicoScores.get(id);
  const epData = allEspacioPublicoData.get(id);
  const gaps = allDataGaps.get(id) ?? [];

  const documentos: DocumentDetail[] = audit.documentos.map((doc) => {
    let rezagoDias: number | null = null;
    if (doc.fechaPublicacion && doc.fechaCorte) {
      const diffMs = new Date(doc.fechaPublicacion).getTime() - new Date(doc.fechaCorte).getTime();
      rezagoDias = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }
    return {
      categoria: doc.categoria,
      categoriaLabel: DOCUMENT_CATEGORY_LABELS[doc.categoria as DocumentCategory] ?? doc.categoria,
      publicado: doc.publicado,
      formato: doc.formato,
      url: doc.url,
      rezagoDias,
      esParseable: doc.esParseable,
      notas: doc.notas,
    };
  });

  const scoreTransparencia = tScore.scoreTotal;
  const scoreFiscalVal = fScore?.scoreTotal ?? null;
  const scoreNormativaVal = nScore?.scoreTotal ?? null;
  const scoreServiciosVal = sbScore?.scoreTotal ?? null;
  const scoreParticipacionVal = pScore?.scoreTotal ?? null;
  const scoreEducacionSaludVal = esScore?.scoreTotal ?? null;
  const scoreConectividadVal = cScore?.scoreTotal ?? null;
  const scoreEconomiaLocalVal = elScore?.scoreTotal ?? null;
  const scoreGastoFuncionVal = gfScore?.scoreTotal ?? null;
  const scoreSeguridadVialVal = svScore?.scoreTotal ?? null;
  const scoreEspacioPublicoVal = epScore?.scoreTotal ?? null;
  const scorePresionImpositivaVal = getPresionImpositivaScores().get(id) ?? null;

  const fiscal: FiscalDetail | null =
    fScore && fData
      ? {
          scoreTotal: fScore.scoreTotal,
          criterios: fScore.criterios,
          gastoPcapita: fScore.gastoPcapita,
          deudaPcapita: fScore.deudaPcapita,
          pctPersonal: fScore.pctPersonal,
          pctCapital: fScore.pctCapital,
          resultadoPcapita: fScore.resultadoPcapita,
          autonomiaFiscal: fScore.autonomiaFiscal,
          presionTributaria: fScore.presionTributaria,
          eficienciaAdmin: fScore.eficienciaAdmin,
          notas: fData.notas,
          procedencia: buildProvenance(fData),
        }
      : null;

  const normativa: NormativaDetail | null =
    nScore && nData
      ? {
          scoreTotal: nScore.scoreTotal,
          criterios: nScore.criterios,
          normasEncontradas: nData.normasEncontradas,
          tieneBoletinSibom: nData.tieneBoletinSibom,
          boletinesPublicados: nData.boletinesPublicados,
          ordenanzaFiscal: nData.ordenanzaFiscalVigente
            ? `Ord. ${nData.ordenanzaFiscalVigente.numero} (${nData.ordenanzaFiscalVigente.anio})`
            : null,
          compras: {
            publicaLicitaciones: nData.compras.publicaLicitaciones,
            publicaAdjudicaciones: nData.compras.publicaAdjudicaciones,
            urlPortalCompras: nData.compras.urlPortalCompras,
            licitacionesDetectadas: nData.compras.licitacionesDetectadas,
            plataforma: nData.compras.plataforma,
          },
        }
      : null;

  const serviciosBasicos: ServiciosBasicosDetail | null =
    sbScore && sbData
      ? {
          scoreTotal: sbScore.scoreTotal,
          criterios: sbScore.criterios,
          pctAguaRed: sbScore.pctAguaRed,
          pctCloaca: sbScore.pctCloaca,
          pctGasRed: sbScore.pctGasRed,
          notas: sbData.notas,
        }
      : null;

  const participacion: ParticipacionDetail | null = pScore
    ? { scoreTotal: pScore.scoreTotal, criterios: pScore.criterios }
    : null;

  const educacionSalud: EducacionSaludDetail | null =
    esScore && esData
      ? {
          scoreTotal: esScore.scoreTotal,
          criterios: esScore.criterios,
          escuelasPer10k: esScore.escuelasPer10k,
          centrosSaludPer10k: esScore.centrosSaludPer10k,
          camasPer10k: esScore.camasPer10k,
          notas: esData.notas,
        }
      : null;

  const conectividad: ConectividadDetail | null =
    cScore && cData
      ? {
          scoreTotal: cScore.scoreTotal,
          criterios: cScore.criterios,
          pctInternet: cScore.pctInternet,
          bandaAnchaPer100: cScore.bandaAnchaPer100,
          pctComputadora: cScore.pctComputadora,
          notas: cData.notas,
        }
      : null;

  const economiaLocal: EconomiaLocalDetail | null =
    elScore && elData
      ? {
          scoreTotal: elScore.scoreTotal,
          criterios: elScore.criterios,
          empleoPcapita: elScore.empleoPcapita,
          variacionEmpleo: elScore.variacionEmpleo,
          empresasPer1000: elScore.empresasPer1000,
          notas: elData.notas,
        }
      : null;

  const gastoFuncion: GastoFuncionDetail | null =
    gfScore && gfData
      ? {
          scoreTotal: gfScore.scoreTotal,
          criterios: gfScore.criterios,
          pctServiciosSociales: gfScore.pctServiciosSociales,
          pctServiciosEconomicos: gfScore.pctServiciosEconomicos,
          pctAdminGubernamental: gfScore.pctAdminGubernamental,
          diversificacionHhi: gfScore.diversificacionHhi,
          notas: gfData.notas,
        }
      : null;

  const seguridadVial: SeguridadVialDetail | null =
    svScore && svData
      ? {
          scoreTotal: svScore.scoreTotal,
          criterios: svScore.criterios,
          siniestrosPer100k: svScore.siniestrosPer100k,
          kmPavimentadoPerKm2: svScore.kmPavimentadoPerKm2,
          kmCiclovias: svScore.kmCiclovias,
          notas: svData.notas,
        }
      : null;

  const espacioPublico: EspacioPublicoDetail | null =
    epScore && epData
      ? {
          scoreTotal: epScore.scoreTotal,
          criterios: epScore.criterios,
          espacioVerdePcapita: epScore.espacioVerdePcapita,
          coberturaArbolado: epScore.coberturaArbolado,
          separacionResiduos: epScore.separacionResiduos,
          notas: epData.notas,
        }
      : null;

  const detailWeighted = computeWeightedTotal(buildDimensionMap({
    transparencia: scoreTransparencia,
    fiscal: scoreFiscalVal,
    normativa: scoreNormativaVal,
    serviciosBasicos: scoreServiciosVal,
    participacion: scoreParticipacionVal,
    educacionSalud: scoreEducacionSaludVal,
    conectividad: scoreConectividadVal,
    economiaLocal: scoreEconomiaLocalVal,
    gastoFuncion: scoreGastoFuncionVal,
    seguridadVial: scoreSeguridadVialVal,
    espacioPublico: scoreEspacioPublicoVal,
    presionImpositiva: scorePresionImpositivaVal,
  }));

  return {
    municipio,
    audit,
    scoreTransparencia,
    scoreFiscal: scoreFiscalVal,
    scoreNormativa: scoreNormativaVal,
    scoreServiciosBasicos: scoreServiciosVal,
    scoreParticipacion: scoreParticipacionVal,
    scoreEducacionSalud: scoreEducacionSaludVal,
    scoreConectividad: scoreConectividadVal,
    scoreEconomiaLocal: scoreEconomiaLocalVal,
    scoreGastoFuncion: scoreGastoFuncionVal,
    scoreSeguridadVial: scoreSeguridadVialVal,
    scoreEspacioPublico: scoreEspacioPublicoVal,
    scorePresionImpositiva: scorePresionImpositivaVal,
    scoreTotal: detailWeighted.scoreTotal,
    categoryScores: detailWeighted.categoryScores,
    evidencia: tScore.evidencia,
    breakdown,
    documentos,
    accesibilidad: audit.accesibilidad,
    fiscal,
    normativa,
    serviciosBasicos,
    participacion,
    educacionSalud,
    conectividad,
    economiaLocal,
    gastoFuncion,
    seguridadVial,
    espacioPublico,
    fechaAuditoria: audit.fechaAuditoria,
    dataGaps: gaps,
    procedenciaSummary: fData ? buildProvenanceSummary(fData) : null,
  };
}
