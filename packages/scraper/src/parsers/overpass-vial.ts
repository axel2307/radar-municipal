/**
 * Sprint 30 — Cliente para Overpass API (OSM) que devuelve red vial
 * estimada por partido.
 *
 * Diseñado puro/testeable: la función `summarizeOverpassResponse` opera
 * sobre el JSON de respuesta sin dependencias externas. La parte de
 * I/O (fetch) queda en `fetchVialFromOverpass` y es la que se mockea
 * en tests con un fixture pequeño.
 *
 * Atribución requerida: OSM data © OpenStreetMap contributors, ODbL
 * compatible. La UI debe mostrar el credit cuando muestra estos km.
 */

import type { RedVialMunicipal } from "@radar-municipal/core";

/**
 * Tipos de OSM `highway=` que consideramos para la métrica vial.
 * `track + unclassified` = "vial rural" (proxy MVP); `tertiary/secondary/primary`
 * agregamos para contexto pero no entran al rural total.
 */
export const HIGHWAY_TYPES = [
  "track",
  "unclassified",
  "tertiary",
  "secondary",
  "primary",
] as const;

export type HighwayType = (typeof HIGHWAY_TYPES)[number];

/**
 * Default Overpass mirror. Si está rate-limited, los caller pueden pasar
 * un mirror alterno (kumi, osm.ch).
 */
export const DEFAULT_OVERPASS_URL =
  "https://overpass-api.de/api/interpreter";

/**
 * Mirrors para fallback. El cliente intenta el primero; si falla con
 * 429/406/503/timeout, prueba el siguiente.
 */
export const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
] as const;

// ─────────────────────────────────────────
// Shape del response Overpass
// ─────────────────────────────────────────

interface OverpassNode {
  lat: number;
  lon: number;
}

interface OverpassWay {
  type: "way";
  id: number;
  tags?: { highway?: string; [k: string]: string | undefined };
  geometry?: OverpassNode[];
}

export interface OverpassResponse {
  version?: number;
  generator?: string;
  elements: OverpassWay[];
}

// ─────────────────────────────────────────
// Geo helpers
// ─────────────────────────────────────────

/**
 * Distancia en km entre dos coordenadas vía Haversine. Suficiente para
 * el rango lat ±35-40° de PBA donde los errores son <1%.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Suma la longitud de un way OSM en km recorriendo sus geometry nodes.
 * 0 si el way no tiene geometry o tiene <2 nodes.
 */
export function wayLengthKm(way: OverpassWay): number {
  const g = way.geometry ?? [];
  if (g.length < 2) return 0;
  let km = 0;
  for (let i = 1; i < g.length; i++) {
    km += haversineKm(g[i - 1].lat, g[i - 1].lon, g[i].lat, g[i].lon);
  }
  return km;
}

// ─────────────────────────────────────────
// Pure summarizer (testeable)
// ─────────────────────────────────────────

export interface VialSummaryInput {
  municipioId: string;
  nombre: string;
  fuenteUrl: string;
  extractedAt?: string;
}

/**
 * Convierte un response Overpass en un `RedVialMunicipal`. Pure: no hace
 * I/O. Tests usan fixtures sin tocar Overpass real.
 */
export function summarizeOverpassResponse(
  response: OverpassResponse,
  opt: VialSummaryInput,
): RedVialMunicipal {
  const km: RedVialMunicipal["km"] = {
    track: 0,
    unclassified: 0,
    tertiary: 0,
    secondary: 0,
    primary: 0,
  };
  for (const way of response.elements ?? []) {
    if (way.type !== "way") continue;
    const tag = way.tags?.highway as HighwayType | undefined;
    if (!tag || !(tag in km)) continue;
    km[tag] += wayLengthKm(way);
  }
  // Round a 1 decimal — la precisión de OSM no justifica más.
  for (const k of HIGHWAY_TYPES) km[k] = Math.round(km[k] * 10) / 10;

  const kmRuralEstimado = Math.round((km.track + km.unclassified) * 10) / 10;
  const kmTotalEstimado =
    Math.round(
      (km.track + km.unclassified + km.tertiary + km.secondary + km.primary) *
        10,
    ) / 10;

  return {
    municipioId: opt.municipioId,
    nombre: opt.nombre,
    km,
    kmRuralEstimado,
    kmTotalEstimado,
    waysProcesados: (response.elements ?? []).length,
    extractedAt: opt.extractedAt ?? new Date().toISOString(),
    fuenteUrl: opt.fuenteUrl,
  };
}

// ─────────────────────────────────────────
// Fetch (I/O — la pieza que la cron invoca)
// ─────────────────────────────────────────

/**
 * Construye la query Overpass QL para un bbox dado.
 * Bbox formato: south,west,north,east.
 */
export function buildOverpassQuery(bbox: string, timeout = 60): string {
  const types = HIGHWAY_TYPES.join("|");
  return `[out:json][timeout:${timeout}];(way["highway"~"^(${types})$"](${bbox}););out geom;`;
}

export interface FetchVialOptions {
  municipioId: string;
  nombre: string;
  /** Bbox south,west,north,east. */
  bbox: string;
  /** Mirror específico; si no, itera por OVERPASS_MIRRORS hasta que uno responda. */
  mirror?: string;
  /** Timeout de Overpass query (segundos). */
  overpassTimeout?: number;
  /** Timeout HTTP global del fetch (ms). */
  fetchTimeoutMs?: number;
}

export interface FetchVialResult {
  vial: RedVialMunicipal | null;
  /** Mirror que respondió OK. Util para logs. */
  mirror?: string;
  /** Si todos los mirrors fallaron, los errores acumulados. */
  errors: string[];
}

/**
 * Pega a Overpass con fallback a mirrors. Si todos fallan, devuelve `vial: null`
 * + errors. El caller (cron) maneja el null como "fuente caída este mes".
 */
export async function fetchVialFromOverpass(
  opt: FetchVialOptions,
): Promise<FetchVialResult> {
  const query = buildOverpassQuery(opt.bbox, opt.overpassTimeout ?? 60);
  const mirrors = opt.mirror ? [opt.mirror] : OVERPASS_MIRRORS;
  const fetchTimeoutMs = opt.fetchTimeoutMs ?? 90_000;
  const errors: string[] = [];

  for (const url of mirrors) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), fetchTimeoutMs);
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          signal: ctl.signal,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "RadarMunicipal/0.1 (https://github.com/axel2307/radar-municipal)",
          },
          body: "data=" + encodeURIComponent(query),
        });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) {
        errors.push(`${url}: HTTP ${response.status}`);
        continue;
      }
      const json = (await response.json()) as OverpassResponse;
      const vial = summarizeOverpassResponse(json, {
        municipioId: opt.municipioId,
        nombre: opt.nombre,
        fuenteUrl: url,
      });
      return { vial, mirror: url, errors };
    } catch (e) {
      errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
  }

  return { vial: null, errors };
}

// ─────────────────────────────────────────
// Bbox helper (extrae bbox de feature GeoJSON multipolygon)
// ─────────────────────────────────────────

/**
 * Calcula bbox `south,west,north,east` de una geometría MultiPolygon o
 * Polygon. El partidos.json (Sprint 24) tiene MultiPolygon.
 */
export function bboxFromGeometry(
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): string {
  let south = Infinity,
    west = Infinity,
    north = -Infinity,
    east = -Infinity;
  const visit = (coord: GeoJSON.Position) => {
    const [lon, lat] = coord;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
    if (lon < west) west = lon;
    if (lon > east) east = lon;
  };
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) for (const c of ring) visit(c);
  } else {
    for (const polygon of geom.coordinates)
      for (const ring of polygon) for (const c of ring) visit(c);
  }
  return `${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)}`;
}
