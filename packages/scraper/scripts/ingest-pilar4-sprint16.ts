/**
 * Sprint 16 — Ingest unificado de Pilar 4 (Compras públicas).
 *
 * Combina:
 *  - Quilmes (CKAN): re-corre ingest del Sprint 15 (3 datasets, 177 cont.)
 *  - Carlos Casares (gobabierto.ar): nuevo en Sprint 16 (2 datasets,
 *    ~10-30 cont. con adjudicación + proveedor → HHI calculable)
 *
 * Output:
 *  - `output/auto-contrataciones-sprint16.json`: array unificado
 *  - `output/sprint-16-aggregates.json`: agregados por (municipio, año)
 *
 * El output del Sprint 15 (Quilmes-only) se preserva sin tocar; este sprint
 * agrega un archivo nuevo. Sprint 17+ puede consolidar si conviene.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseQuilmesContratacionesCsv,
  aggregateContrataciones,
} from "../src/parsers/ckan-contrataciones";
import { parseCarlosCasaresLicitaciones } from "../src/parsers/gobabierto-contrataciones";
import type {
  Contratacion,
  ContratacionesAggregate,
} from "@radar-municipal/core";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FETCH_TIMEOUT_MS = 30_000;

async function fetchText(url: string): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "RadarMunicipal/0.1 (ingest)" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

// ─────────────────────────────────────────
// Quilmes (CKAN)
// ─────────────────────────────────────────

const QUILMES_BASE = "http://datos.quilmes.gov.ar";
// INDEC PBA: Quilmes = 060638 (no confundir con 060658 Roque Pérez,
// bug de Sprint 15 detectado y corregido en Sprint 17 vía verificación UI).
const QUILMES_MUNICIPIO_ID = "060638";

interface CkanResource {
  format: string | null;
  url: string | null;
}
interface CkanDataset {
  title: string;
  resources: CkanResource[];
}

async function ingestQuilmes(): Promise<{ contrataciones: Contratacion[]; aggregates: ContratacionesAggregate[] }> {
  const url = `${QUILMES_BASE}/api/3/action/package_search?q=contrataciones&rows=20`;
  const j = JSON.parse(await fetchText(url)) as {
    success: boolean;
    result: { results: CkanDataset[] };
  };
  if (!j.success) throw new Error("CKAN action failed");

  const all: Contratacion[] = [];
  const aggs: ContratacionesAggregate[] = [];
  console.log(`📡 Quilmes (CKAN) — ${j.result.results.length} datasets`);
  for (const d of j.result.results) {
    const csvRes = d.resources.find((r) => (r.format ?? "").toUpperCase() === "CSV" && r.url);
    if (!csvRes?.url) continue;
    const m = d.title.match(/(20\d{2})/);
    const anioFallback = m ? Number(m[1]) : new Date().getFullYear();
    console.log(`   ↓ "${d.title}" (anio=${anioFallback})`);
    const csv = await fetchText(csvRes.url);
    const r = parseQuilmesContratacionesCsv(csv, {
      municipioId: QUILMES_MUNICIPIO_ID,
      fuenteUrl: csvRes.url,
      anioFallback,
    });
    console.log(`     ✓ ${r.contrataciones.length} contrataciones`);
    all.push(...r.contrataciones);
    const agg = aggregateContrataciones(r.contrataciones, csvRes.url);
    if (agg) aggs.push(agg);
  }
  return { contrataciones: all, aggregates: aggs };
}

// ─────────────────────────────────────────
// Carlos Casares (gobabierto.ar)
// ─────────────────────────────────────────

const CARLOS_CASARES_MUNICIPIO_ID = "060140";

/** URLs detectadas vía crawl-all-135. Hardcoded: gobabierto no tiene CKAN. */
const CARLOS_CASARES_DATASETS = [
  {
    label: "Concursos 2026",
    url: "https://gobabierto.ar/carloscasares/wp-content/uploads/2026/03/CONCURSOS-Y-LICITACIONES-2026.xlsx-Concursos.csv",
    anioFallback: 2026,
  },
  {
    label: "Licitaciones privadas 2025",
    url: "https://gobabierto.ar/carloscasares/wp-content/uploads/2025/06/Licitaciones-privadas-2025-CC.csv",
    anioFallback: 2025,
  },
];

async function ingestCarlosCasares(): Promise<{ contrataciones: Contratacion[]; aggregates: ContratacionesAggregate[] }> {
  const all: Contratacion[] = [];
  const aggs: ContratacionesAggregate[] = [];
  console.log(`\n📡 Carlos Casares (gobabierto.ar) — ${CARLOS_CASARES_DATASETS.length} datasets`);
  for (const ds of CARLOS_CASARES_DATASETS) {
    console.log(`   ↓ "${ds.label}"`);
    let csv: string;
    try {
      csv = await fetchText(ds.url);
    } catch (e) {
      console.log(`     ✗ ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const r = parseCarlosCasaresLicitaciones(csv, {
      municipioId: CARLOS_CASARES_MUNICIPIO_ID,
      fuenteUrl: ds.url,
      anioFallback: ds.anioFallback,
    });
    console.log(`     ✓ ${r.contrataciones.length} contrataciones | warnings=${r.warnings.length}`);
    for (const w of r.warnings) console.log(`       · ${w}`);
    all.push(...r.contrataciones);
    // Agregar por año (Carlos Casares puede tener cont. de varios años en un dataset
    // si el expediente lo indica; aggregamos por año real, no por fallback).
    const byAnio = new Map<number, Contratacion[]>();
    for (const c of r.contrataciones) {
      const list = byAnio.get(c.anio) ?? [];
      list.push(c);
      byAnio.set(c.anio, list);
    }
    for (const [, list] of byAnio) {
      const agg = aggregateContrataciones(list, ds.url);
      if (agg) aggs.push(agg);
    }
  }
  return { contrataciones: all, aggregates: aggs };
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

async function main() {
  console.log(`📊 Sprint 16 — Ingest Pilar 4 (Quilmes + Carlos Casares)\n`);

  const quilmes = await ingestQuilmes();
  const carlos = await ingestCarlosCasares();

  const contrataciones = [...quilmes.contrataciones, ...carlos.contrataciones];
  const aggregates = [...quilmes.aggregates, ...carlos.aggregates];

  const outDir = resolve(__dirname, "..", "output");
  mkdirSync(outDir, { recursive: true });
  const dataPath = resolve(outDir, "auto-contrataciones-sprint16.json");
  const aggPath = resolve(outDir, "sprint-16-aggregates.json");
  writeFileSync(dataPath, JSON.stringify(contrataciones, null, 2), "utf-8");
  writeFileSync(aggPath, JSON.stringify(aggregates, null, 2), "utf-8");

  // ─────────────────────────────────────────
  // Resumen
  // ─────────────────────────────────────────

  console.log(`\n📊 Resumen Sprint 16:`);
  console.log(`   · Total contrataciones: ${contrataciones.length}`);
  console.log(`   · Municipios con datos: ${new Set(aggregates.map((a) => a.municipioId)).size} / 135`);
  console.log("");
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");
  console.log("| Municipio          | Año  | N°  | Total          | Mediana       | HHI   | Únicos |");
  console.log("|--------------------|------|-----|----------------|---------------|-------|--------|");
  for (const a of aggregates.sort((x, y) => x.municipioId.localeCompare(y.municipioId) || x.anio - y.anio)) {
    const hhi = a.hhiProveedores != null ? String(a.hhiProveedores) : "—";
    const u = a.proveedoresUnicos != null ? String(a.proveedoresUnicos) : "—";
    const med = a.medianaMonto != null ? fmt(a.medianaMonto) : "—";
    console.log(
      `| ${a.municipioId.padEnd(18)} | ${a.anio} | ${String(a.totalContrataciones).padStart(3)} | ${fmt(a.montoTotalPresupuesto).padStart(14)} | ${med.padStart(13)} | ${hhi.padStart(5)} | ${u.padStart(6)} |`,
    );
  }
  console.log(`\n💾 Datos: ${dataPath}`);
  console.log(`💾 Agregados: ${aggPath}`);
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exitCode = 1;
});
