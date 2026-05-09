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
 * Resultado actual: 3 partidos en intersección (Bahía Blanca, Bragado, Zárate).
 * Sprint 33+ podría extender la cobertura agregando parser RAFAM más fino o
 * llevando gasto-funcion a más municipios.
 *
 * Disclaimer importante: usamos `gastoServiciosEconomicos` como proxy del
 * gasto vial. Servicios económicos incluye vialidad pero también obra
 * pública, agro, comercio, etc. Es OVER-estimate del gasto vial puro. La
 * métrica final debe leerse como "pesos en servicios económicos por km
 * rural", NO como "pesos en vialidad por km rural".
 */

import { getRedVialByMunicipio } from "./vial";
import type { RedVialMunicipal } from "@radar-municipal/core";

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

export interface VialCrossMetrics {
  municipioId: string;
  /** Km estimados de red rural (track + unclassified). */
  kmRuralEstimado: number;
  /** Gasto total ejecutado en el año fiscal (ARS nominales). */
  gastoTotal: number;
  /** % del gasto total destinado a "servicios económicos". */
  pctServiciosEconomicos: number;
  /** Gasto en servicios económicos = gastoTotal × pct/100. */
  gastoServiciosEconomicos: number;
  /** Métrica principal: gastoServiciosEconomicos / kmRuralEstimado. */
  pesosPorKmRural: number;
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
  if (vial.kmRuralEstimado <= 0) return null;

  const gastoTotal = extractGastoTotal(fiscal);
  const pctEco = gasto.pctServiciosEconomicos;
  if (gastoTotal == null || pctEco == null) return null;

  const gastoEco = (gastoTotal * pctEco) / 100;
  return {
    municipioId,
    kmRuralEstimado: vial.kmRuralEstimado,
    gastoTotal,
    pctServiciosEconomicos: pctEco,
    gastoServiciosEconomicos: Math.round(gastoEco),
    pesosPorKmRural: Math.round(gastoEco / vial.kmRuralEstimado),
    anioFiscal: gasto.anio ?? fiscal.anio ?? 0,
    notas:
      "Proxy: 'pesos en servicios económicos por km rural OSM'. Servicios económicos " +
      "incluye vialidad + obra pública + agro + otros. Sobre-estima el gasto vial puro. " +
      "Cobertura limitada a la intersección de 13 piloto fiscal × 102 vial rural = ~3 partidos.",
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
