/**
 * Sprint 24/25 — Build de `partidos.json` (GeoJSON FeatureCollection) para `/mapa`.
 *
 * Pipeline:
 *  1. Descargar `limites-partidos.zip` de Datos Abiertos PBA (CC-BY 4.0,
 *     fuente ARBA). Cacheado en `data/geometry/_tmp/`.
 *  2. Extraer `partidos.geojson` (3.6 MB).
 *  3. Filtrar features para quedarnos sólo con los 135 partidos PBA
 *     del archivo `MUNICIPIOS` de core. Drop 8 islas sub-features.
 *  4. Re-emit como GeoJSON FeatureCollection con properties limpias
 *     (`{id, nombre}` solamente). Sin topojson — Sprint 24 detectó que
 *     el pipeline topology()→feature() rompe geometrías cuando hay
 *     MultiPolygon partidos PBA.
 *
 * Idempotente: re-correr produce el mismo output si el ZIP upstream no
 * cambió. Pensado como build step pre-deploy, no runtime.
 *
 * Uso:
 *   pnpm exec tsx packages/scraper/scripts/build-partidos-geojson.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { MUNICIPIOS } from "@radar-municipal/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..", "..");
const TMP_DIR = resolve(ROOT, "data", "geometry", "_tmp");
const ZIP_URL =
  "https://catalogo.datos.gba.gob.ar/dataset/627f65de-2510-4bf4-976b-16035828b5ae/resource/2cc73f96-98f7-42fa-a180-e56c755cf59a/download/limites-partidos.zip";
// GeoJSON FeatureCollection emitido directo (no topojson) para que el
// cliente lo consuma sin descompresión de arcs.
const OUT_PATH = resolve(
  ROOT,
  "packages",
  "web",
  "src",
  "data",
  "partidos.json",
);

// ─────────────────────────────────────────
// Tipos del schema upstream (ARBA)
// ─────────────────────────────────────────

interface ArbaProps {
  cca: string; // catastral ARBA, 3 dígitos
  cde: string; // INDEC, 5 dígitos (sin el "0" leading que usa MUNICIPIOS)
  fna: string; // "Partido de La Plata"
  gna: string; // "Partido"
  nam: string; // "La Plata"
  sag?: string;
  ara3?: number;
  arl?: number;
}

interface PartidoFeature {
  type: "Feature";
  properties: {
    /** INDEC ID 6 dígitos (consistente con `MUNICIPIOS.id`). */
    id: string;
    /** Nombre corto, normalizado. */
    nombre: string;
  };
  geometry: GeoJSON.Geometry;
}

// ─────────────────────────────────────────
// Pipeline
// ─────────────────────────────────────────

async function ensureZip(): Promise<string> {
  mkdirSync(TMP_DIR, { recursive: true });
  const zipPath = resolve(TMP_DIR, "limites-partidos.zip");
  if (!existsSync(zipPath)) {
    console.log(`📥 Descargando ${ZIP_URL}`);
    const res = await fetch(ZIP_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(zipPath, buf);
    console.log(`   ✓ ${buf.byteLength} bytes`);
  } else {
    console.log(`💾 ZIP cacheado en ${zipPath}`);
  }
  return zipPath;
}

function ensureGeojson(zipPath: string): string {
  const geojsonPath = resolve(TMP_DIR, "partidos.geojson");
  if (!existsSync(geojsonPath)) {
    console.log(`📦 Extrayendo partidos.geojson`);
    execSync(`unzip -o "${zipPath}" partidos.geojson`, { cwd: TMP_DIR });
  }
  return geojsonPath;
}

/**
 * Match por NOMBRE normalizado. ARBA `cde` no es el INDEC ID de MUNICIPIOS
 * (algunos coinciden, otros no — ARBA mantuvo numeración catastral histórica
 * mientras INDEC re-numeró). Sólo el nombre es estable.
 *
 * Aliases manuales para los 4 partidos donde ARBA y MUNICIPIOS difieren
 * en el "modo" de escribir el nombre.
 */
const NAME_ALIASES: Record<string, string> = {
  "nueve de julio": "9 de julio",
  "veinticinco de mayo": "25 de mayo",
  "general madariaga": "general juan madariaga",
  "coronel rosales": "coronel de marina leonardo rosales",
};

function normName(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function arbaNameToMunicipioId(
  arbaName: string,
  byName: Map<string, string>,
): string | null {
  const k = normName(arbaName);
  // Filtrar islas (sub-features ARBA, no son partidos): "Islas Tigre", etc.
  if (/^islas\s/.test(k)) return null;
  const aliasedKey = NAME_ALIASES[k] ?? k;
  return byName.get(aliasedKey) ?? null;
}

// ─────────────────────────────────────────
// Winding order fix (GeoJSON RFC 7946)
// ─────────────────────────────────────────

/**
 * Sprint 25 — algunos polígonos del GeoJSON original de ARBA tienen
 * outer rings en clockwise. Eso viola GeoJSON RFC 7946 (outer = CCW,
 * holes = CW) y hace que d3-geo los interprete como "hole en el globo",
 * produciendo paths que cubren todo el SVG (caso José C. Paz: path d
 * llegaba a x=11396).
 *
 * Aplicamos shoelace formula. Si el signed area de un outer ring sale
 * negativa, lo invertimos. Para inner rings (holes) el winding correcto
 * es opuesto al outer — pero los GeoJSON de ARBA no tienen holes, así
 * que solo arreglamos outers.
 */
function ringSignedArea(ring: GeoJSON.Position[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return sum / 2;
}

function fixWinding(geom: GeoJSON.Geometry): GeoJSON.Geometry {
  // d3-geo interpreta winding según convención SPHERICAL (right-hand rule
  // sobre la esfera). En lat-lng planar shoelace, CCW=positive area pero
  // d3-geo trata polígonos con shoelace positivo como agujeros que cubren
  // todo excepto el área del polígono (caso JCP cubriendo todo el SVG).
  // La convención correcta para d3-geo: outer rings = NEGATIVE shoelace
  // area (clockwise en planar lat-lng coords con y=lat hacia el norte).
  const fixRing = (ring: GeoJSON.Position[], isOuter: boolean): GeoJSON.Position[] => {
    const area = ringSignedArea(ring);
    const wantNegative = isOuter; // d3-geo: outer = CW en planar = negative area
    const isNegative = area < 0;
    return wantNegative === isNegative ? ring : [...ring].reverse();
  };
  if (geom.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geom.coordinates.map((ring, i) => fixRing(ring, i === 0)),
    };
  }
  if (geom.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geom.coordinates.map((polygon) =>
        polygon.map((ring, i) => fixRing(ring, i === 0)),
      ),
    };
  }
  return geom;
}

function loadAndFilter(geojsonPath: string): GeoJSON.FeatureCollection<GeoJSON.Geometry, PartidoFeature["properties"]> {
  const raw = JSON.parse(readFileSync(geojsonPath, "utf-8")) as GeoJSON.FeatureCollection<
    GeoJSON.Geometry,
    ArbaProps
  >;
  console.log(`📊 GeoJSON crudo: ${raw.features.length} features`);

  // Reverse index: nombre normalizado → INDEC id de MUNICIPIOS.
  const byName = new Map<string, string>();
  for (const m of MUNICIPIOS) byName.set(normName(m.nombre), m.id);

  const out: PartidoFeature[] = [];
  const skipped: string[] = [];
  const seenIds = new Set<string>();

  for (const f of raw.features) {
    const arbaName = f.properties?.nam ?? "";
    if (!arbaName) {
      skipped.push("(sin nam) feature");
      continue;
    }
    const id = arbaNameToMunicipioId(arbaName, byName);
    if (!id) {
      skipped.push(`isla/sin-match: "${arbaName}"`);
      continue;
    }
    if (seenIds.has(id)) {
      skipped.push(`${id} duplicado: "${arbaName}" (mantengo primero)`);
      continue;
    }
    seenIds.add(id);
    const munRef = MUNICIPIOS.find((m) => m.id === id)!;
    out.push({
      type: "Feature",
      properties: { id, nombre: munRef.nombre },
      geometry: fixWinding(f.geometry),
    });
  }

  console.log(`✅ ${out.length} partidos retenidos`);
  console.log(`   ${skipped.length} features descartadas`);
  if (skipped.length > 0) {
    for (const s of skipped.slice(0, 5)) console.log(`     · ${s}`);
    if (skipped.length > 5) console.log(`     · ... +${skipped.length - 5} más`);
  }

  // Sanity: ¿faltan partidos esperados?
  const missing: string[] = [];
  for (const m of MUNICIPIOS) {
    if (!seenIds.has(m.id)) missing.push(`${m.id} ${m.nombre}`);
  }
  if (missing.length > 0) {
    console.log(`⚠️  ${missing.length} partidos de MUNICIPIOS NO matchearon:`);
    for (const m of missing.slice(0, 10)) console.log(`     · ${m}`);
  }

  return { type: "FeatureCollection", features: out };
}

async function main() {
  console.log(`🗺️  Build partidos.json (GeoJSON FeatureCollection)\n`);

  const zipPath = await ensureZip();
  const geojsonPath = ensureGeojson(zipPath);
  const fc = loadAndFilter(geojsonPath);

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  const json = JSON.stringify(fc);
  writeFileSync(OUT_PATH, json, "utf-8");

  const kb = (json.length / 1024).toFixed(1);
  console.log(`\n💾 ${OUT_PATH}`);
  console.log(`   tamaño: ${kb} KB (${json.length} bytes)`);
  console.log(`   formato: GeoJSON FeatureCollection`);
  console.log(`   features: ${fc.features.length} partidos`);
  console.log(`\n📜 Atribución requerida (CC-BY 4.0):`);
  console.log(`   Datos Abiertos Provincia de Buenos Aires — ARBA`);
  console.log(`   ${ZIP_URL.split("/").slice(0, -1).join("/").replace(/\/[^/]+$/, "")}`);
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exitCode = 1;
});
