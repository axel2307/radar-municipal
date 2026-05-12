/**
 * Sprint 32 — Cruce gasto vial × red vial estimada.
 *
 * Métrica killer del Pilar 5: `pesosPorKmRural`. Aproxima cuánto gasta un
 * municipio por kilómetro de red rural mantenida.
 *
 * Cobertura limitada: requiere intersección de 3 datasets:
 *  - `pilot-fiscal.json` (13 piloto curado RAFAM)
 *  - `pilot-gasto-funcion.json` (13 piloto, % servicios económicos)
 *  - `auto-vial.json` (102 partidos rurales — Sprint 31)
 *
 * Resultado tras Sprint 36 (auto-vial extendido a 3 conurbano piloto):
 * 13 partidos en intersección. Para los conurbano donde `kmRural < 100` el
 * denominador es `kmTotal` (no rural), y la métrica se anota con
 * `denominador: "total"`. La Plata cae del lado rural porque el partido es
 * grande y tiene zona semi-rural (2336 km de track+unclassified).
 *
 * Disclaimer importante: usamos `gastoServiciosEconomicos` como proxy del
 * gasto vial. Servicios económicos incluye vialidad pero también obra
 * pública, agro, comercio, etc. Es OVER-estimate del gasto vial puro. La
 * métrica final debe leerse como "pesos en servicios económicos por km
 * rural", NO como "pesos en vialidad por km rural".
 */

import { getRedVialByMunicipio } from "./vial";
import { MUNICIPIOS, type RedVialMunicipal } from "@radar-municipal/core";

import pilotFiscalJson from "../../data/pilot-fiscal.json";
import pilotGastoFuncionJson from "../../data/pilot-gasto-funcion.json";

interface FiscalRow {
  municipioId: string;
  anio: number;
  gastoTotal?: { valor: number } | number;
}

interface GastoFuncionRow {
  municipioId: string;
  anio: number;
  pctServiciosEconomicos: number | null;
}

const fiscalRaw = pilotFiscalJson as unknown as FiscalRow[];
const gastoFuncionRaw = pilotGastoFuncionJson as unknown as GastoFuncionRow[];

const fiscalById = new Map<string, FiscalRow>();
for (const f of fiscalRaw) fiscalById.set(f.municipioId, f);
const gastoFuncionById = new Map<string, GastoFuncionRow>();
for (const g of gastoFuncionRaw) gastoFuncionById.set(g.municipioId, g);

/**
 * Threshold de "red rural significativa" — partidos con menos de este
 * valor en track+unclassified usan `kmTotalEstimado` como denominador.
 * Calibrado en Sprint 36 contra los 3 conurbano piloto:
 * VL (rural=2), SI (rural=23) → caen en total; La Plata (rural=2336) → rural.
 */
const RURAL_KM_THRESHOLD = 100;

export interface VialCrossMetrics {
  municipioId: string;
  /** Km estimados de red rural (track + unclassified). */
  kmRuralEstimado: number;
  /** Km estimados de red total (track..primary). */
  kmTotalEstimado: number;
  /** Gasto total ejecutado en el año fiscal (ARS nominales). */
  gastoTotal: number;
  /** % del gasto total destinado a "servicios económicos". */
  pctServiciosEconomicos: number;
  /** Gasto en servicios económicos = gastoTotal × pct/100. */
  gastoServiciosEconomicos: number;
  /**
   * Métrica principal: gastoServiciosEconomicos / kmDenominador.
   * Para partidos rurales el denominador es `kmRuralEstimado`; para
   * conurbano (kmRural < 100) es `kmTotalEstimado` — ver `denominador`.
   */
  pesosPorKm: number;
  /** Qué denominador se usó: "rural" o "total". Crítico para leer el valor. */
  denominador: "rural" | "total";
  /** Valor del denominador efectivamente usado (km). */
  kmDenominador: number;
  /** Año fiscal del dato de gasto. */
  anioFiscal: number;
  /** Disclaimers para mostrar en UI. */
  notas: string;
}

/**
 * Calcula la métrica para un municipio si tiene datos en los 3 datasets.
 * Devuelve null si falta cualquier pieza (fiscal, gasto-funcion, vial).
 */
export function getVialCrossMetrics(
  municipioId: string,
): VialCrossMetrics | null {
  const fiscal = fiscalById.get(municipioId);
  const gasto = gastoFuncionById.get(municipioId);
  const vial = getRedVialByMunicipio(municipioId);
  if (!fiscal || !gasto || !vial) return null;
  if (vial.kmTotalEstimado <= 0) return null;

  const gastoTotal = extractGastoTotal(fiscal);
  const pctEco = gasto.pctServiciosEconomicos;
  if (gastoTotal == null || pctEco == null) return null;

  const isRural = vial.kmRuralEstimado >= RURAL_KM_THRESHOLD;
  const denominador: "rural" | "total" = isRural ? "rural" : "total";
  const kmDenominador = isRural
    ? vial.kmRuralEstimado
    : vial.kmTotalEstimado;
  if (kmDenominador <= 0) return null;

  const gastoEco = (gastoTotal * pctEco) / 100;
  return {
    municipioId,
    kmRuralEstimado: vial.kmRuralEstimado,
    kmTotalEstimado: vial.kmTotalEstimado,
    gastoTotal,
    pctServiciosEconomicos: pctEco,
    gastoServiciosEconomicos: Math.round(gastoEco),
    pesosPorKm: Math.round(gastoEco / kmDenominador),
    denominador,
    kmDenominador,
    anioFiscal: gasto.anio ?? fiscal.anio ?? 0,
    notas:
      "Proxy: 'pesos en servicios económicos por km de red OSM'. Servicios económicos " +
      "incluye vialidad + obra pública + agro + otros. Sobre-estima el gasto vial puro. " +
      "Para partidos rurales el denominador es la red rural (track+unclassified); para " +
      "conurbano con red rural <100 km, el denominador es la red total (incluye " +
      "tertiary/secondary/primary). Cobertura: 13 piloto (Sprint 36 extendió a conurbano).",
  };
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

/**
 * `pilot-fiscal.json` puede tener `gastoTotal` como number directo o como
 * `{ valor }` (legacy SourcedValue shape). Lookup defensivo.
 */
function extractGastoTotal(fiscal: FiscalRow): number | null {
  const v = fiscal.gastoTotal;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && typeof v.valor === "number") {
    return v.valor;
  }
  return null;
}

/**
 * Cobertura del cross: cuántos partidos tienen los 3 datasets a la vez.
 * Útil para mostrar en UI / banners el estado real de cobertura.
 */
export function getVialCrossCoverage(): {
  total: number;
  withCross: number;
  ids: string[];
} {
  // Iteramos sobre los partidos con vial (102) y checkeamos cuáles tienen
  // también fiscal + gastoFuncion. Importamos vial directamente acá para
  // evitar circular deps.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vialJson = require("../../data/auto-vial.json") as RedVialMunicipal[];
  const ids: string[] = [];
  for (const v of vialJson) {
    const m = getVialCrossMetrics(v.municipioId);
    if (m) ids.push(v.municipioId);
  }
  return { total: vialJson.length, withCross: ids.length, ids };
}

/**
 * Sprint 35/36 — feed para el heatmap `/mapa` con métrica `pesosPorKm`.
 *
 * Mismo shape que `getAllMunicipiosForVialDensity` para reusar `ProvinceMap`
 * sin branching. Devuelve los 135 partidos; los 13 con cross completo
 * tienen `score: number` (mix de denominadores rural/total — la tooltip
 * lo aclara via `denominador` cuando el usuario hovea la ficha).
 */
export function getAllMunicipiosForPesosPorKm(): {
  id: string;
  nombre: string;
  score: number | null;
  region: string;
  esPiloto: boolean;
}[] {
  return MUNICIPIOS.map((m) => {
    const cross = getVialCrossMetrics(m.id);
    return {
      id: m.id,
      nombre: m.nombre,
      score: cross?.pesosPorKm ?? null,
      region: m.region,
      esPiloto: m.esPiloto,
    };
  });
}
