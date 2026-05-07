import { Hono } from "hono";
import {
  getMunicipioScores,
  getMunicipioFiscalScore,
  getMunicipioNormativaScore,
  getMunicipioServiciosBasicosScore,
  getMunicipioParticipacionScore,
  getMunicipioEducacionSaludScore,
  getMunicipioConectividadScore,
  getMunicipioEconomiaLocalScore,
  getMunicipioGastoFuncionScore,
  getMunicipioSeguridadVialScore,
  getMunicipioEspacioPublicoScore,
  getMunicipioBreakdown,
  getMunicipioById,
  getMunicipioDataGaps,
  getMunicipioFiscalProvenance,
} from "../services/scoring-data";
import {
  ScoringDimension,
  computeWeightedTotal,
} from "@radar-municipal/core";

export const scoresRouter = new Hono();

scoresRouter.get("/municipios/:id/scores", (c) => {
  const id = c.req.param("id");
  const municipio = getMunicipioById(id);
  if (!municipio) {
    return c.json({ error: "Municipio no encontrado" }, 404);
  }

  const transparency = getMunicipioScores(id);
  const fiscal = getMunicipioFiscalScore(id);
  const normativa = getMunicipioNormativaScore(id);
  const serviciosBasicos = getMunicipioServiciosBasicosScore(id);
  const participacion = getMunicipioParticipacionScore(id);
  const educacionSalud = getMunicipioEducacionSaludScore(id);
  const conectividad = getMunicipioConectividadScore(id);
  const economiaLocal = getMunicipioEconomiaLocalScore(id);
  const gastoFuncion = getMunicipioGastoFuncionScore(id);
  const seguridadVial = getMunicipioSeguridadVialScore(id);
  const espacioPublico = getMunicipioEspacioPublicoScore(id);
  const breakdown = getMunicipioBreakdown(id);
  const provenance = getMunicipioFiscalProvenance(id);
  const dataGaps = getMunicipioDataGaps(id);

  const dims = new Map<ScoringDimension, number | null>([
    [ScoringDimension.TRANSPARENCIA, transparency?.scoreTotal ?? null],
    [ScoringDimension.FISCAL, fiscal?.scoreTotal ?? null],
    [ScoringDimension.NORMATIVA, normativa?.scoreTotal ?? null],
    [ScoringDimension.SERVICIOS_BASICOS, serviciosBasicos?.scoreTotal ?? null],
    [ScoringDimension.PARTICIPACION_CIUDADANA, participacion?.scoreTotal ?? null],
    [ScoringDimension.EDUCACION_SALUD, educacionSalud?.scoreTotal ?? null],
    [ScoringDimension.CONECTIVIDAD_DIGITAL, conectividad?.scoreTotal ?? null],
    [ScoringDimension.ECONOMIA_LOCAL, economiaLocal?.scoreTotal ?? null],
    [ScoringDimension.GASTO_POR_FUNCION, gastoFuncion?.scoreTotal ?? null],
    [ScoringDimension.SEGURIDAD_VIAL, seguridadVial?.scoreTotal ?? null],
    [ScoringDimension.ESPACIO_PUBLICO, espacioPublico?.scoreTotal ?? null],
  ]);
  const weighted = computeWeightedTotal(dims);

  return c.json({
    municipioId: id,
    nombre: municipio.nombre,
    scoreTotal: weighted.scoreTotal,
    categoryScores: weighted.categoryScores,
    transparencia: transparency
      ? {
          score: transparency.scoreTotal,
          breakdown,
          evidencia: transparency.evidencia,
        }
      : null,
    fiscal: fiscal
      ? {
          score: fiscal.scoreTotal,
          criterios: fiscal.criterios,
          gastoPcapita: fiscal.gastoPcapita,
          deudaPcapita: fiscal.deudaPcapita,
          pctPersonal: fiscal.pctPersonal,
          pctCapital: fiscal.pctCapital,
          resultadoPcapita: fiscal.resultadoPcapita,
          autonomiaFiscal: fiscal.autonomiaFiscal,
          presionTributaria: fiscal.presionTributaria,
          eficienciaAdmin: fiscal.eficienciaAdmin,
          procedencia: provenance ?? [],
        }
      : null,
    normativa: normativa
      ? { score: normativa.scoreTotal, criterios: normativa.criterios }
      : null,
    serviciosBasicos: serviciosBasicos
      ? { score: serviciosBasicos.scoreTotal, criterios: serviciosBasicos.criterios }
      : null,
    participacion: participacion
      ? { score: participacion.scoreTotal, criterios: participacion.criterios }
      : null,
    educacionSalud: educacionSalud
      ? { score: educacionSalud.scoreTotal, criterios: educacionSalud.criterios }
      : null,
    conectividad: conectividad
      ? { score: conectividad.scoreTotal, criterios: conectividad.criterios }
      : null,
    economiaLocal: economiaLocal
      ? { score: economiaLocal.scoreTotal, criterios: economiaLocal.criterios }
      : null,
    gastoFuncion: gastoFuncion
      ? { score: gastoFuncion.scoreTotal, criterios: gastoFuncion.criterios }
      : null,
    seguridadVial: seguridadVial
      ? { score: seguridadVial.scoreTotal, criterios: seguridadVial.criterios }
      : null,
    espacioPublico: espacioPublico
      ? { score: espacioPublico.scoreTotal, criterios: espacioPublico.criterios }
      : null,
    dataGaps: {
      total: dataGaps.length,
      items: dataGaps,
    },
  });
});
