#!/usr/bin/env tsx
/**
 * Sprint 30 — Refresh Pilar 5 Inteligencia territorial / Red vial.
 *
 * Pipeline:
 *  1. Lee `partidos.json` (Sprint 24) para obtener bboxes de cada partido.
 *  2. Para una muestra inicial de partidos rurales, query Overpass
 *     `way["highway"~"^(track|unclassified|tertiary|secondary|primary)$"]`
 *     dentro del bbox.
 *  3. Suma km via Haversine.
 *  4. Escribe `auto-vial.json` + `auto-vial-manifest.json` a
 *     `packages/web/src/data/`.
 *
 * Sprint 30 = MVP con 10 partidos. Sprint 31+ extiende a los ~80 partidos
 * rurales (no-conurbano) con concurrencia controlada para no saturar
 * Overpass mirrors.
 *
 * Atribución: OSM data © OpenStreetMap contributors, ODbL.
 *
 * Uso:
 *   pnpm --filter @radar-municipal/scraper refresh:vial
 */

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchVialFromOverpass,
  bboxFromGeometry,
} from "../parsers/overpass-vial";
import {
  MUNICIPIOS,
  Region,
  type RedVialMunicipal,
  type RefreshManifest,
} from "@radar-municipal/core";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────
// Sprint 31 — Cobertura completa de rurales
//
// Sprint 30 corrió 10 sample. Sprint 31 extiende a TODOS los partidos
// no-conurbano: regiones INTERIOR + COSTA_ATLANTICA. Total esperado
// ~70-80 partidos.
//
// Override via env var `VIAL_MUNICIPIO_IDS` (CSV) si querés correr
// sólo unos específicos (e.g. en dev local para no esperar 5 minutos).
// ─────────────────────────────────────────

function getTargetMunicipios(): string[] {
  const override = process.env.VIAL_MUNICIPIO_IDS;
  if (override) {
    return override.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return MUNICIPIOS.filter(
    (m) => m.region === Region.INTERIOR || m.region === Region.COSTA_ATLANTICA,
  ).map((m) => m.id);
}

interface PartidoFeature {
  type: "Feature";
  properties: { id: string; nombre: string };
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

interface PartidoFC {
  type: "FeatureCollection";
  features: PartidoFeature[];
}

// ─────────────────────────────────────────
// Pipeline
// ─────────────────────────────────────────

function loadPartidos(): PartidoFC {
  const path = resolve(
    __dirname,
    "..",
    "..",
    "..",
    "web",
    "src",
    "data",
    "partidos.json",
  );
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as PartidoFC;
}

function webDataDir(): string {
  return resolve(__dirname, "..", "..", "..", "web", "src", "data");
}

/** Pequeño helper para sleep entre queries (cortesía con Overpass). */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`📊 Sprint 31 — Refresh Pilar 5 Vial (Overpass / OSM)\n`);

  const partidos = loadPartidos();
  const byId = new Map<string, PartidoFeature>();
  for (const f of partidos.features) byId.set(f.properties.id, f);

  const targets = getTargetMunicipios();
  console.log(`🎯 Targets: ${targets.length} partidos (Interior + Costa Atlántica)\n`);

  const results: RedVialMunicipal[] = [];
  const errores: { municipioId: string; nombre: string; errors: string[] }[] = [];
  const startAll = Date.now();

  for (let i = 0; i < targets.length; i++) {
    const id = targets[i];
    const feat = byId.get(id);
    if (!feat) {
      console.log(`   ✗ ${id}: no encontrado en partidos.json`);
      continue;
    }
    const bbox = bboxFromGeometry(feat.geometry);
    process.stdout.write(
      `  [${String(i + 1).padStart(3)}/${targets.length}] ${feat.properties.nombre.padEnd(32)} ... `,
    );
    const t0 = Date.now();
    // Sprint 31: retry con backoff si falla. fetchVialFromOverpass ya
    // itera sobre mirrors; agregamos retry de toda la operación con
    // un delay creciente cuando todos fallan (probable rate-limit de
    // las 3 mirrors a la vez).
    let r = await fetchVialFromOverpass({
      municipioId: id,
      nombre: feat.properties.nombre,
      bbox,
    });
    if (!r.vial) {
      // Wait + retry una vez (backoff 10s)
      await sleep(10_000);
      r = await fetchVialFromOverpass({
        municipioId: id,
        nombre: feat.properties.nombre,
        bbox,
      });
    }
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    if (r.vial) {
      console.log(
        `✓ ${elapsed}s | rural=${Math.round(r.vial.kmRuralEstimado)} km, total=${Math.round(r.vial.kmTotalEstimado)} km, ways=${r.vial.waysProcesados}`,
      );
      results.push(r.vial);
    } else {
      console.log(`✗ ${elapsed}s | ${r.errors.join(" | ").slice(0, 80)}`);
      errores.push({
        municipioId: id,
        nombre: feat.properties.nombre,
        errors: r.errors,
      });
    }
    // Pausa entre queries para no saturar Overpass.
    if (i < targets.length - 1) await sleep(2000);
  }

  // ─────────────────────────────────────────
  // Output
  // ─────────────────────────────────────────

  const dir = webDataDir();
  mkdirSync(dir, { recursive: true });

  // Sort estable por municipioId.
  results.sort((a, b) => a.municipioId.localeCompare(b.municipioId));

  const dataPath = resolve(dir, "auto-vial.json");
  writeFileSync(dataPath, JSON.stringify(results, null, 2), "utf-8");

  const manifest: RefreshManifest = {
    refreshedAt: new Date().toISOString(),
    totalContrataciones: results.length, // re-uso del campo: total snapshots
    municipiosConDatos: results.length,
    aggregates: results.length,
    fuentes: results.map((r) => ({
      label: r.nombre,
      municipioId: r.municipioId,
      datasetsParseados: 1,
      contrataciones: r.kmRuralEstimado, // re-uso semántico: km rurales
    })),
  };
  const manifestPath = resolve(dir, "auto-vial-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  // ─────────────────────────────────────────
  // Resumen
  // ─────────────────────────────────────────

  const elapsedAll = ((Date.now() - startAll) / 1000).toFixed(1);
  const totalKmRural = results.reduce((s, r) => s + r.kmRuralEstimado, 0);
  const totalKmAll = results.reduce((s, r) => s + r.kmTotalEstimado, 0);
  console.log(`\n📊 Resumen:`);
  console.log(`   · Tiempo total: ${elapsedAll}s`);
  console.log(`   · Municipios OK: ${results.length}/${targets.length}`);
  console.log(`   · Errores: ${errores.length}`);
  console.log(`   · Km rural total (track+unclassified): ${totalKmRural.toFixed(1)} km`);
  console.log(`   · Km total (track..primary): ${totalKmAll.toFixed(1)} km`);
  if (errores.length > 0) {
    console.log(`   Errores:`);
    for (const e of errores) console.log(`     · ${e.municipioId} ${e.nombre}: ${e.errors[0]?.slice(0, 80)}`);
  }
  console.log(`\n💾 ${dataPath}`);
  console.log(`💾 ${manifestPath}`);
  console.log(`\n📜 Atribución requerida: OSM © OpenStreetMap contributors, ODbL.`);
}

const invokedAs = process.argv[1] ?? "";
if (invokedAs.endsWith("refresh-pilar5-vial.ts")) {
  main().catch((e) => {
    console.error("Error fatal:", e);
    process.exitCode = 1;
  });
}
