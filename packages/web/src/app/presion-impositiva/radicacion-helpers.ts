import type { PresionImpositivaRankingEntry } from "@radar-municipal/core";

/**
 * Sprint 49 — Helpers puros para el RadicacionFinder.
 *
 * Calculan totales anuales por perfil sumando las tasas relevantes de
 * cada municipio. Extraídos a módulo separado para testear sin levantar
 * React.
 *
 * IMPORTANTE: NO escalamos los montos. Asumimos los parámetros default
 * de CASOS_TESTIGO_DEFAULT (vivienda $40M, IIBB $50M, 100ha, 100m²) y
 * sumamos las tasas tal como vienen. Escalar linear sería engañoso por
 * alícuotas progresivas + mínimos fijos.
 */

export type PerfilKey =
  | "familia"
  | "comerciante"
  | "empresa-obra"
  | "rural";

export type TasaKey = "vivienda" | "comercio" | "rural" | "construccion";

export interface PerfilDef {
  key: PerfilKey;
  emoji: string;
  label: string;
  shortLabel: string;
  description: string;
  tasas: TasaKey[];
}

export const PERFILES: PerfilDef[] = [
  {
    key: "familia",
    emoji: "👤",
    label: "Familia con vivienda propia",
    shortLabel: "Familia",
    description:
      "Pagás solo Tasa de Servicios Generales / ABL sobre tu vivienda urbana.",
    tasas: ["vivienda"],
  },
  {
    key: "comerciante",
    emoji: "🏪",
    label: "Comerciante con local",
    shortLabel: "Comerciante",
    description:
      "Tu vivienda urbana (ABL/TSG) + tu local (Tasa de Seguridad e Higiene anual).",
    tasas: ["vivienda", "comercio"],
  },
  {
    key: "empresa-obra",
    emoji: "🏗️",
    label: "Empresa con obra nueva",
    shortLabel: "Empresa con obra",
    description:
      "TISH del local comercial + Derechos de Construcción de la obra (100 m²).",
    tasas: ["comercio", "construccion"],
  },
  {
    key: "rural",
    emoji: "🌾",
    label: "Productor rural",
    shortLabel: "Productor rural",
    description:
      "Vivienda urbana + Tasa Vial Rural por 100 hectáreas zona productiva media.",
    tasas: ["vivienda", "rural"],
  },
];

/**
 * Extrae el monto de la tasa correspondiente del row. Devuelve null si
 * falta data del municipio entero, o si la tasa específica es null
 * (ej: municipios sin rural como Vicente López).
 */
export function getTasaMonto(
  row: PresionImpositivaRankingEntry,
  tasa: TasaKey,
): number | null {
  if (!row.data) return null;
  switch (tasa) {
    case "vivienda":
      return row.data.montoVivienda.valor;
    case "comercio":
      return row.data.montoComercio.valor;
    case "rural":
      return row.data.montoRural.valor;
    case "construccion":
      return row.data.montoConstruccion.valor;
  }
}

/**
 * Total anual estimado del perfil para un municipio. Suma las tasas
 * aplicables. Devuelve null si ALGUNA de las tasas del perfil falta —
 * no podemos comparar honestamente totales incompletos.
 */
export function totalAnualPerfil(
  row: PresionImpositivaRankingEntry,
  perfil: PerfilDef,
): number | null {
  let total = 0;
  for (const tasa of perfil.tasas) {
    const monto = getTasaMonto(row, tasa);
    if (monto == null) return null;
    total += monto;
  }
  return total;
}

export interface RadicacionResult {
  municipioId: string;
  nombre: string;
  region: string;
  esPiloto: boolean;
  total: number;
}

/**
 * Ranking ordenado ascendente (más barato primero) de los municipios
 * con total computable para el perfil. Filtra el resto.
 */
export function rankingPorPerfil(
  rows: PresionImpositivaRankingEntry[],
  perfil: PerfilDef,
): RadicacionResult[] {
  const out: RadicacionResult[] = [];
  for (const row of rows) {
    const total = totalAnualPerfil(row, perfil);
    if (total == null) continue;
    out.push({
      municipioId: row.municipioId,
      nombre: row.nombre,
      region: row.region,
      esPiloto: row.esPiloto,
      total,
    });
  }
  out.sort((a, b) => a.total - b.total);
  return out;
}

/**
 * Calcula ahorro absoluto y porcentual entre el más barato y el más
 * caro del ranking. Útil para destacar la "decisión de radicación".
 */
export function ahorroPotencial(
  ranking: RadicacionResult[],
): { absoluto: number; porcentaje: number; barato: RadicacionResult; caro: RadicacionResult } | null {
  if (ranking.length < 2) return null;
  const barato = ranking[0];
  const caro = ranking[ranking.length - 1];
  const absoluto = caro.total - barato.total;
  const porcentaje = caro.total > 0 ? (absoluto / caro.total) * 100 : 0;
  return { absoluto, porcentaje, barato, caro };
}
