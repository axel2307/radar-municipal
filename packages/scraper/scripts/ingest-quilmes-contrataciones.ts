/**
 * Sprint 15 — End-to-end ingest de contrataciones de Quilmes.
 *
 * Pipeline:
 *  1. Llamar al CKAN action API: `package_search?q=contrataciones`.
 *  2. Filtrar datasets cuyos recursos incluyan CSV.
 *  3. Para cada CSV: descargarlo, parsearlo con `parseQuilmesContratacionesCsv`,
 *     agregar a un array global de `Contratacion[]`.
 *  4. Calcular `ContratacionesAggregate` por (municipio, año).
 *  5. Escribir output a `output/auto-contrataciones-sprint15.json` y
 *     `output/sprint-15-aggregates.json`.
 *
 * Sprint 15 sólo cubre Quilmes (única CKAN reachable + parseable según el
 * probe). Sprint 16+ puede agregar más municipios extendiendo la lista de
 * endpoints o factorizando un adapter por schema.
 *
 * Uso:
 *   pnpm exec tsx scripts/ingest-quilmes-contrataciones.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseQuilmesContratacionesCsv,
  aggregateContrataciones,
} from "../src/parsers/ckan-contrataciones";
import type {
  Contratacion,
  ContratacionesAggregate,
} from "@radar-municipal/core";

const __dirname = dirname(fileURLToPath(import.meta.url));

const QUILMES_BASE = "http://datos.quilmes.gov.ar";
// INDEC PBA: Quilmes = 060638 (Sprint 17 fix: 060658 era Roque Pérez).
const QUILMES_MUNICIPIO_ID = "060638";

interface CkanResource {
  id: string;
  name: string | null;
  format: string | null;
  url: string | null;
}

interface CkanDataset {
  id: string;
  name: string;
  title: string;
  resources: CkanResource[];
  metadata_modified: string;
}

interface CkanResponse {
  success: boolean;
  result: { count: number; results: CkanDataset[] };
}

const FETCH_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url: string, accept = "application/json"): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "RadarMunicipal/0.1 (ingest)", Accept: accept },
    });
  } finally {
    clearTimeout(t);
  }
}

async function discoverDatasets(query: string): Promise<CkanDataset[]> {
  const url = `${QUILMES_BASE}/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=20`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Discovery failed: HTTP ${res.status}`);
  const j = (await res.json()) as CkanResponse;
  if (!j.success) throw new Error("CKAN action returned success=false");
  return j.result.results;
}

/**
 * Año derivado del título del dataset ("Contrataciones 2020" → 2020).
 * Si no hay match, devuelve el año actual como fallback (signal de "no
 * estamos seguros, asumimos current").
 */
function anioFromTitle(title: string): number {
  const m = title.match(/(20\d{2}|19\d{2})/);
  return m ? Number(m[1]) : new Date().getFullYear();
}

async function main() {
  console.log(`📡 Sprint 15 — Ingest Quilmes contrataciones (${QUILMES_BASE})`);

  const datasets = await discoverDatasets("contrataciones");
  console.log(`   Datasets matcheados: ${datasets.length}`);

  const allContrataciones: Contratacion[] = [];
  const aggregates: ContratacionesAggregate[] = [];
  const datasetSummary: { title: string; csvUrl: string; rows: number; warnings: string[] }[] = [];

  for (const d of datasets) {
    const csvResource = d.resources.find(
      (r) => (r.format ?? "").toUpperCase() === "CSV" && r.url,
    );
    if (!csvResource?.url) {
      console.log(`   - "${d.title}": sin recurso CSV (skip)`);
      continue;
    }
    const anioFallback = anioFromTitle(d.title);
    console.log(`   ↓ "${d.title}" (anioFallback=${anioFallback})`);
    console.log(`     ${csvResource.url}`);

    const res = await fetchWithTimeout(csvResource.url, "text/csv");
    if (!res.ok) {
      console.log(`     ✗ HTTP ${res.status} — skip`);
      continue;
    }
    const csv = await res.text();
    const parsed = parseQuilmesContratacionesCsv(csv, {
      municipioId: QUILMES_MUNICIPIO_ID,
      fuenteUrl: csvResource.url,
      anioFallback,
    });
    console.log(`     ✓ ${parsed.contrataciones.length} contrataciones | warnings=${parsed.warnings.length}`);
    if (parsed.warnings.length > 0) {
      for (const w of parsed.warnings) console.log(`       · ${w}`);
    }
    allContrataciones.push(...parsed.contrataciones);
    datasetSummary.push({
      title: d.title,
      csvUrl: csvResource.url,
      rows: parsed.contrataciones.length,
      warnings: parsed.warnings,
    });

    // Aggregate por dataset (asumimos 1 dataset = 1 año).
    const agg = aggregateContrataciones(parsed.contrataciones, csvResource.url);
    if (agg) aggregates.push(agg);
  }

  // ─────────────────────────────────────────
  // Output
  // ─────────────────────────────────────────

  const outDir = resolve(__dirname, "..", "output");
  mkdirSync(outDir, { recursive: true });
  const dataPath = resolve(outDir, "auto-contrataciones-sprint15.json");
  const aggPath = resolve(outDir, "sprint-15-aggregates.json");

  writeFileSync(dataPath, JSON.stringify(allContrataciones, null, 2), "utf-8");
  writeFileSync(aggPath, JSON.stringify(aggregates, null, 2), "utf-8");

  // ─────────────────────────────────────────
  // Resumen
  // ─────────────────────────────────────────

  console.log(`\n📊 Resumen:`);
  console.log(`   · Datasets parseados: ${datasetSummary.length}`);
  console.log(`   · Contrataciones totales: ${allContrataciones.length}`);
  for (const a of aggregates.sort((x, y) => x.anio - y.anio)) {
    const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");
    const med = a.medianaMonto != null ? fmt(a.medianaMonto) : "—";
    const estados = Object.entries(a.porEstado)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ");
    console.log(
      `   · ${a.anio}: ${a.totalContrataciones} contrataciones, total=${fmt(a.montoTotalPresupuesto)}, mediana=${med}, [${estados}]`,
    );
  }
  console.log(`\n💾 Datos: ${dataPath}`);
  console.log(`💾 Agregados: ${aggPath}`);
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exitCode = 1;
});
