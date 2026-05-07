import {
  MUNICIPIOS,
  MUNICIPIOS_PILOTO,
  computeWeightedTotal,
} from "@radar-municipal/core";

import type { RankingEntry, DataGapDetail, FiscalFieldProvenance } from "./types";
import { buildDimensionMap, buildProvenance } from "./helpers";
import {
  auditData,
  allTransparencyScores,
  allFiscalScores,
  allNormativaScores,
  allServiciosBasicosScores,
  allParticipacionScores,
  allEducacionSaludScores,
  allConectividadScores,
  allEconomiaLocalScores,
  allGastoFuncionScores,
  allSeguridadVialScores,
  allEspacioPublicoScores,
  allDataGaps,
  allFiscalSourced,
} from "./loaders";
import { getPresionImpositivaScores } from "./presion-impositiva";

export function getRanking(): RankingEntry[] {
  const presionScores = getPresionImpositivaScores();
  return MUNICIPIOS_PILOTO.map((municipio) => {
    const tScore = allTransparencyScores.get(municipio.id);
    const fScore = allFiscalScores.get(municipio.id);
    const nScore = allNormativaScores.get(municipio.id);
    const sbScore = allServiciosBasicosScores.get(municipio.id);
    const pScore = allParticipacionScores.get(municipio.id);
    const esScore = allEducacionSaludScores.get(municipio.id);
    const cScore = allConectividadScores.get(municipio.id);
    const elScore = allEconomiaLocalScores.get(municipio.id);
    const gfScore = allGastoFuncionScores.get(municipio.id);
    const svScore = allSeguridadVialScores.get(municipio.id);
    const epScore = allEspacioPublicoScores.get(municipio.id);
    const scoreTransparencia = tScore?.scoreTotal ?? 0;
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
    const scorePresionImpositivaVal = presionScores.get(municipio.id) ?? null;
    const gaps = allDataGaps.get(municipio.id) ?? [];

    const weighted = computeWeightedTotal(buildDimensionMap({
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
      posicion: 0,
      municipio,
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
      scoreTotal: weighted.scoreTotal,
      categoryScores: weighted.categoryScores,
      cantidadBrechas: gaps.length,
    };
  })
    .sort((a, b) => b.scoreTotal - a.scoreTotal)
    .map((entry, i) => ({ ...entry, posicion: i + 1 }));
}

export function getAuditDate(): string {
  return auditData[0]?.fechaAuditoria ?? "desconocida";
}

/** Get score distribution in buckets of 20 points */
export function getScoreDistribution(field: keyof RankingEntry = "scoreTotal"): { bucket: string; count: number; municipios: string[] }[] {
  const ranking = getRanking();
  const buckets = [
    { min: 0, max: 20, label: "0-20" },
    { min: 20, max: 40, label: "20-40" },
    { min: 40, max: 60, label: "40-60" },
    { min: 60, max: 80, label: "60-80" },
    { min: 80, max: 100, label: "80-100" },
  ];
  return buckets.map(b => {
    const matches = ranking.filter(r => {
      const val = r[field] as number | null;
      if (val == null) return false;
      return val >= b.min && val < b.max;
    });
    return { bucket: b.label, count: matches.length, municipios: matches.map(m => m.municipio.nombre) };
  });
}

/** Get average scores by region */
export function getRegionalAverages(): { region: string; avgTotal: number; count: number }[] {
  const ranking = getRanking();
  const byRegion = new Map<string, { sum: number; count: number }>();
  for (const r of ranking) {
    const region = r.municipio.region;
    const entry = byRegion.get(region) ?? { sum: 0, count: 0 };
    entry.sum += r.scoreTotal;
    entry.count++;
    byRegion.set(region, entry);
  }
  return Array.from(byRegion.entries())
    .map(([region, { sum, count }]) => ({ region, avgTotal: sum / count, count }))
    .sort((a, b) => b.avgTotal - a.avgTotal);
}

/** Get all municipios with a score for the map view */
export function getAllMunicipiosForMap(field: keyof RankingEntry = "scoreTotal"): {
  id: string;
  nombre: string;
  score: number | null;
  region: string;
  esPiloto: boolean;
}[] {
  const ranking = getRanking();
  // Pilotos with scores
  const pilotos = ranking.map((r) => ({
    id: r.municipio.id,
    nombre: r.municipio.nombre,
    score: r[field] as number | null,
    region: r.municipio.region,
    esPiloto: r.municipio.esPiloto,
  }));
  // Non-pilotos without scores
  const pilotoIds = new Set(pilotos.map((p) => p.id));
  const others = MUNICIPIOS_PILOTO.length > 0
    ? MUNICIPIOS.filter((m) => !pilotoIds.has(m.id)).map((m) => ({
        id: m.id,
        nombre: m.nombre,
        score: null as number | null,
        region: m.region,
        esPiloto: m.esPiloto,
      }))
    : [];
  return [...pilotos, ...others];
}

export function getDataCoverage(): { municipioId: string; nombre: string; dimensions: Record<string, boolean> }[] {
  const ranking = getRanking();
  const dimFields: { key: string; field: keyof RankingEntry }[] = [
    { key: "Transp.", field: "scoreTransparencia" },
    { key: "Fiscal", field: "scoreFiscal" },
    { key: "Norm.", field: "scoreNormativa" },
    { key: "Partic.", field: "scoreParticipacion" },
    { key: "Gasto", field: "scoreGastoFuncion" },
    { key: "Econ.", field: "scoreEconomiaLocal" },
    { key: "Pres.Imp.", field: "scorePresionImpositiva" },
    { key: "Serv.", field: "scoreServiciosBasicos" },
    { key: "Educ.", field: "scoreEducacionSalud" },
    { key: "Conect.", field: "scoreConectividad" },
    { key: "Esp.Pub.", field: "scoreEspacioPublico" },
    { key: "Seg.Vial", field: "scoreSeguridadVial" },
  ];
  return ranking.map(r => ({
    municipioId: r.municipio.id,
    nombre: r.municipio.nombre,
    dimensions: Object.fromEntries(dimFields.map(d => [d.key, r[d.field] != null])),
  }));
}

/** Obtener gaps de un municipio específico */
export function getMunicipioDataGaps(id: string): DataGapDetail[] {
  return allDataGaps.get(id) ?? [];
}

/** Obtener procedencia fiscal de un municipio */
export function getMunicipioFiscalProvenance(id: string): FiscalFieldProvenance[] | null {
  const fData = allFiscalSourced.get(id);
  return fData ? buildProvenance(fData) : null;
}
