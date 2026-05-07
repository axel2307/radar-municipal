import {
  ConfidenceLevel,
  MUNICIPIOS,
  type PresionImpositivaData,
  type PresionImpositivaRankingEntry,
  type PresionImpositivaStats,
} from "@radar-municipal/core";

import pilotPresionJson from "../../data/pilot-presion-impositiva.json";
import autoPresionJson from "../../data/auto-presion-impositiva.json";

// ─────────────────────────────────────────
// Carga eager (build time para SSG)
// ─────────────────────────────────────────

const pilotPresionRaw = pilotPresionJson as unknown as PresionImpositivaData[];
const autoPresionRaw = autoPresionJson as unknown as PresionImpositivaData[];
export const allPresionImpositivaData = new Map<string, PresionImpositivaData>();

// Orden importante: piloto primero (ALTA/MEDIA curada). Las entradas auto
// del parser batch se agregan solo para municipios que NO están en piloto;
// así los piloto conservan su ordenanza auditada manualmente.
for (const entry of pilotPresionRaw) {
  allPresionImpositivaData.set(entry.municipioId, entry);
}
for (const entry of autoPresionRaw) {
  if (!allPresionImpositivaData.has(entry.municipioId)) {
    allPresionImpositivaData.set(entry.municipioId, entry);
  }
}

// ─────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────

/**
 * Percentil 0..100 (higher = más caro) del valor en la lista.
 * Valores null se ignoran. Si solo hay un valor, devuelve 50.
 */
function percentile(value: number, pool: number[]): number {
  const sorted = [...pool].sort((a, b) => a - b);
  if (sorted.length === 0) return 50;
  if (sorted.length === 1) return 50;
  // Cuenta cuántos valores son menores que el nuestro
  let below = 0;
  for (const v of sorted) {
    if (v < value) below += 1;
  }
  return Math.round((below / (sorted.length - 1)) * 100);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

// ─────────────────────────────────────────
// API
// ─────────────────────────────────────────

/**
 * Devuelve una entrada por cada uno de los 135 municipios.
 * Los no-piloto quedan con data=null y indiceRelativo=null.
 */
export function getPresionImpositivaRanking(): PresionImpositivaRankingEntry[] {
  // Armar los pools por caso testigo (solo valores válidos de los pilotos)
  const poolVivienda: number[] = [];
  const poolComercio: number[] = [];
  const poolRural: number[] = [];
  const poolConstruccion: number[] = [];

  for (const data of allPresionImpositivaData.values()) {
    if (data.montoVivienda.valor != null) poolVivienda.push(data.montoVivienda.valor);
    if (data.montoComercio.valor != null) poolComercio.push(data.montoComercio.valor);
    if (data.montoRural.valor != null) poolRural.push(data.montoRural.valor);
    if (data.montoConstruccion.valor != null) poolConstruccion.push(data.montoConstruccion.valor);
  }

  return MUNICIPIOS.map((m) => {
    const data = allPresionImpositivaData.get(m.id) ?? null;

    let indiceRelativo: number | null = null;
    if (data) {
      const percentiles: number[] = [];
      if (data.montoVivienda.valor != null)
        percentiles.push(percentile(data.montoVivienda.valor, poolVivienda));
      if (data.montoComercio.valor != null)
        percentiles.push(percentile(data.montoComercio.valor, poolComercio));
      if (data.montoRural.valor != null)
        percentiles.push(percentile(data.montoRural.valor, poolRural));
      if (data.montoConstruccion.valor != null)
        percentiles.push(percentile(data.montoConstruccion.valor, poolConstruccion));
      if (percentiles.length > 0) {
        indiceRelativo = Math.round(
          percentiles.reduce((s, p) => s + p, 0) / percentiles.length,
        );
      }
    }

    return {
      municipioId: m.id,
      nombre: m.nombre,
      partido: m.partido,
      region: m.region,
      poblacion: m.poblacion ?? 0,
      esPiloto: m.esPiloto,
      data,
      indiceRelativo,
    };
  });
}

/** Stats agregados para las tarjetas KPI del panel. */
export function getPresionImpositivaStats(): PresionImpositivaStats {
  const rows = Array.from(allPresionImpositivaData.values());

  const viviendas = rows
    .map((r) => r.montoVivienda.valor)
    .filter((v): v is number => v != null);
  const comercios = rows
    .map((r) => r.montoComercio.valor)
    .filter((v): v is number => v != null);
  const rurales = rows
    .map((r) => r.montoRural.valor)
    .filter((v): v is number => v != null);
  const construcciones = rows
    .map((r) => r.montoConstruccion.valor)
    .filter((v): v is number => v != null);

  const conDatosCompletos = rows.filter(
    (r) =>
      r.montoVivienda.valor != null &&
      r.montoComercio.valor != null &&
      r.montoConstruccion.valor != null,
  ).length;
  const conOrdenanzaFiscalVigente = rows.filter((r) => r.publicaOrdenanzaFiscal).length;

  const anio = rows[0]?.anioFiscal ?? new Date().getFullYear();

  return {
    totalMunicipios: MUNICIPIOS.length,
    conDatosCompletos,
    conOrdenanzaFiscalVigente,
    medianaVivienda: median(viviendas),
    medianaComercio: median(comercios),
    medianaRural: median(rurales),
    medianaConstruccion: median(construcciones),
    anioFiscalReferencia: anio,
  };
}

/** Acceso puntual por municipio (para la ficha). */
export function getPresionImpositivaByMunicipio(
  municipioId: string,
): PresionImpositivaData | null {
  return allPresionImpositivaData.get(municipioId) ?? null;
}

/**
 * Score por municipio para integración al ranking global.
 *
 * Convención: el `indiceRelativo` es "higher = mayor presión" (peor para el
 * vecino). El score dimensional debe cumplir la convención opuesta
 * ("higher = mejor"), por eso devolvemos `100 - indiceRelativo`.
 *
 * Graceful degradation: si TODOS los montos del municipio tienen confianza
 * ESTIMACION (caso actual, hasta que corra el parser de ordenanzas), se
 * devuelve `null` y `computeWeightedTotal` redistribuye el peso entre las
 * otras dimensiones de la categoría. En cuanto un monto tenga confianza
 * MEDIA o superior, el score empieza a contar.
 */
export function getPresionImpositivaScores(): Map<string, number | null> {
  const ranking = getPresionImpositivaRanking();
  const out = new Map<string, number | null>();
  for (const entry of ranking) {
    if (!entry.data || entry.indiceRelativo == null) {
      out.set(entry.municipioId, null);
      continue;
    }
    const hasAuditedValue = [
      entry.data.montoVivienda,
      entry.data.montoComercio,
      entry.data.montoRural,
      entry.data.montoConstruccion,
    ].some(
      (sv) =>
        sv.valor != null &&
        sv.confianza?.nivel != null &&
        sv.confianza.nivel !== ConfidenceLevel.ESTIMACION,
    );
    out.set(
      entry.municipioId,
      hasAuditedValue ? 100 - entry.indiceRelativo : null,
    );
  }
  return out;
}
