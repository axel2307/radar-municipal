#!/usr/bin/env tsx
/**
 * Sprint 18 — Refresh orchestrator de Pilar 4 (Compras públicas).
 *
 * Supersede los scripts ad-hoc de Sprints 15+16 (`ingest-quilmes-...ts`,
 * `ingest-pilar4-sprint16.ts`) consolidando todas las fuentes en una sola
 * entrada idempotente, lista para ser invocada por un cron.
 *
 * Cambios respecto a Sprint 15/16:
 * - Output va directo a `packages/web/src/data/auto-contrataciones.json`
 *   y `auto-contrataciones-aggregates.json` (Sprint 17 hizo `cp` manual;
 *   Sprint 18 lo automatiza).
 * - Se escribe `auto-contrataciones-manifest.json` con timestamp + counts
 *   por fuente; la web lo lee para mostrar "última actualización" en
 *   `/compras`.
 * - Sin sufijo `-sprintN`: filenames estables. Los snapshots históricos
 *   los preservamos en `output/` con sus nombres originales.
 *
 * Cron sugerido (Railway / Fly):
 *   `0 3 1 * *`  — primer día de cada mes, 03:00 UTC.
 *   Comando:     `pnpm --filter @radar-municipal/scraper refresh:pilar4`
 *
 * Idempotencia: re-correr con los mismos datasets upstream produce los
 * mismos JSON (orden estable, ningún UUID local). Sólo el manifest
 * cambia de `refreshedAt`.
 *
 * Uso manual:
 *   pnpm --filter @radar-municipal/scraper refresh:pilar4
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseQuilmesContratacionesCsv,
  aggregateContrataciones,
} from "../parsers/ckan-contrataciones";
import { parseCarlosCasaresLicitaciones } from "../parsers/gobabierto-contrataciones";
import type {
  Contratacion,
  ContratacionesAggregate,
  RefreshManifest,
} from "@radar-municipal/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FETCH_TIMEOUT_MS = 30_000;

// ─────────────────────────────────────────
// Pure functions (testables)
// ─────────────────────────────────────────

export interface FuenteResult {
  /** Etiqueta UI-friendly (ej. "Quilmes (CKAN)"). */
  label: string;
  /** INDEC PBA id del municipio. */
  municipioId: string;
  /** Cuántos datasets logramos parsear (algunos pueden estar caídos). */
  datasetsParseados: number;
  /** Total de contrataciones de la fuente. */
  contrataciones: Contratacion[];
}

/**
 * Construye el manifest a partir de los resultados por fuente.
 * Pura: dada la misma entrada, devuelve el mismo manifest (excepto
 * `refreshedAt`, que se inyecta para poder testear el orden estable).
 */
export function buildManifest(
  fuentes: FuenteResult[],
  refreshedAt: string,
  aggregateCount: number,
): RefreshManifest {
  const totalContrataciones = fuentes.reduce(
    (s, f) => s + f.contrataciones.length,
    0,
  );
  const municipioIds = new Set(fuentes.map((f) => f.municipioId));
  return {
    refreshedAt,
    totalContrataciones,
    municipiosConDatos: municipioIds.size,
    aggregates: aggregateCount,
    fuentes: fuentes
      .map((f) => ({
        label: f.label,
        municipioId: f.municipioId,
        datasetsParseados: f.datasetsParseados,
        contrataciones: f.contrataciones.length,
      }))
      .sort((a, b) => a.municipioId.localeCompare(b.municipioId)),
  };
}

// ─────────────────────────────────────────
// HTTP helpers
// ─────────────────────────────────────────

async function fetchText(url: string): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "RadarMunicipal/0.1 (refresh)" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

// ─────────────────────────────────────────
// Adapters: una función por fuente (CKAN, gobabierto, ...)
// ─────────────────────────────────────────

interface CkanResource { format: string | null; url: string | null; }
interface CkanDataset { title: string; resources: CkanResource[]; }

/**
 * Sprint 53 — Refresher genérico para municipios con portal CKAN.
 *
 * Patrón inferido del Sprint 15 (Quilmes): API CKAN expone
 * `package_search?q=...` con datasets, cada uno con resources CSV. El
 * parser Quilmes-style sirve para portales que usan el mismo schema
 * semicolon-delimited de contrataciones públicas (común en PBA porque
 * varios usan la misma plantilla CKAN).
 *
 * Para agregar una nueva fuente CKAN, basta agregar una entry a
 * `CKAN_SOURCES` con `baseUrl + municipioId + label`. Si el schema CSV
 * difiere, escribir un parser nuevo siguiendo el patrón gobabierto.
 *
 * `fetcher` se inyecta para que los tests puedan mockearlo sin red real.
 */
export interface CkanSource {
  /** Etiqueta UI-friendly (ej. "Quilmes (CKAN)"). */
  label: string;
  /** INDEC PBA id del municipio. */
  municipioId: string;
  /** Base URL del portal (sin trailing slash). Ej. "http://datos.quilmes.gov.ar". */
  baseUrl: string;
  /** Query string del CKAN search. */
  searchQuery?: string;
  /** Máximo de datasets a pedir. */
  maxDatasets?: number;
}

export async function refreshCkanLicitaciones(
  src: CkanSource,
  fetcher: (url: string) => Promise<string> = fetchText,
): Promise<FuenteResult> {
  const q = src.searchQuery ?? "contrataciones";
  const rows = src.maxDatasets ?? 20;
  const url = `${src.baseUrl}/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=${rows}`;
  const j = JSON.parse(await fetcher(url)) as {
    success: boolean;
    result: { results: CkanDataset[] };
  };
  if (!j.success) throw new Error("CKAN action failed");

  const all: Contratacion[] = [];
  let datasetsParseados = 0;
  console.log(`📡 ${src.label} — ${j.result.results.length} datasets`);
  for (const d of j.result.results) {
    const csvRes = d.resources.find(
      (r) => (r.format ?? "").toUpperCase() === "CSV" && r.url,
    );
    if (!csvRes?.url) continue;
    const m = d.title.match(/(20\d{2})/);
    const anioFallback = m ? Number(m[1]) : new Date().getFullYear();
    console.log(`   ↓ "${d.title}" (anio=${anioFallback})`);
    let csv: string;
    try {
      csv = await fetcher(csvRes.url);
    } catch (e) {
      console.log(`     ✗ ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const r = parseQuilmesContratacionesCsv(csv, {
      municipioId: src.municipioId,
      fuenteUrl: csvRes.url,
      anioFallback,
    });
    console.log(`     ✓ ${r.contrataciones.length} contrataciones`);
    all.push(...r.contrataciones);
    datasetsParseados++;
  }
  return {
    label: src.label,
    municipioId: src.municipioId,
    datasetsParseados,
    contrataciones: all,
  };
}

// ─────────────────────────────────────────
// Catálogo de fuentes CKAN
// ─────────────────────────────────────────

export const CKAN_SOURCES: CkanSource[] = [
  {
    label: "Quilmes (CKAN)",
    municipioId: "060638", // INDEC PBA. Confirmado Sprint 17.
    baseUrl: "http://datos.quilmes.gov.ar",
  },
  {
    // Sprint 53 — Especulativo. `pilot-normativa.json:69` documenta
    // "datos.tandil.gov.ar" como portal CKAN; si la URL responde como
    // CKAN estandar el parser Quilmes-style debería funcionar. Si la
    // primera corrida del cron falla, ajustar baseUrl o escribir parser
    // específico.
    label: "Tandil (CKAN)",
    municipioId: "060791",
    baseUrl: "http://datos.tandil.gov.ar",
  },
];

const CARLOS_CASARES_MUNICIPIO_ID = "060140";
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

async function refreshCarlosCasares(): Promise<FuenteResult> {
  const all: Contratacion[] = [];
  let datasetsParseados = 0;
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
    console.log(`     ✓ ${r.contrataciones.length} contrataciones`);
    if (r.warnings.length > 0) for (const w of r.warnings) console.log(`       · ${w}`);
    all.push(...r.contrataciones);
    datasetsParseados++;
  }
  return {
    label: "Carlos Casares (gobabierto.ar)",
    municipioId: CARLOS_CASARES_MUNICIPIO_ID,
    datasetsParseados,
    contrataciones: all,
  };
}

// ─────────────────────────────────────────
// Pipeline (escribe a packages/web/src/data/)
// ─────────────────────────────────────────

/**
 * Path absoluto a `packages/web/src/data/`. Resuelto al runtime para que
 * el script sirva tanto cuando se invoca desde `packages/scraper/` como
 * desde la raíz del monorepo.
 */
function webDataDir(): string {
  return resolve(__dirname, "..", "..", "..", "web", "src", "data");
}

async function main() {
  console.log(`📊 Sprint 18 — Refresh Pilar 4 (Compras públicas)\n`);

  // Las fuentes corren independientes; un fallo en una NO mata las otras.
  // Sprint 53 — el catálogo CKAN se expande declarando entries en
  // `CKAN_SOURCES`. El resto (gobabierto, portales custom) sigue siendo
  // función por función.
  const fuentes: FuenteResult[] = [];
  const tareas: { label: string; fn: () => Promise<FuenteResult> }[] = [
    ...CKAN_SOURCES.map((src) => ({
      label: src.label,
      fn: () => refreshCkanLicitaciones(src),
    })),
    { label: "Carlos Casares", fn: refreshCarlosCasares },
  ];
  for (const t of tareas) {
    try {
      fuentes.push(await t.fn());
    } catch (e) {
      console.error(`❌ Fuente "${t.label}" falló: ${e instanceof Error ? e.message : String(e)}`);
      // Sin entry en `fuentes` — el manifest así lo refleja (el agente
      // que lea el output detecta la regresión: faltó la fuente esperada).
    }
  }

  // Combinar todas las contrataciones + agregados por (municipio, año).
  const contrataciones: Contratacion[] = [];
  const aggregates: ContratacionesAggregate[] = [];
  for (const f of fuentes) {
    contrataciones.push(...f.contrataciones);
    // Agregar por año dentro de la fuente.
    const byAnio = new Map<number, Contratacion[]>();
    for (const c of f.contrataciones) {
      const list = byAnio.get(c.anio) ?? [];
      list.push(c);
      byAnio.set(c.anio, list);
    }
    for (const [, list] of byAnio) {
      const agg = aggregateContrataciones(list, list[0]?.fuenteUrl ?? "");
      if (agg) aggregates.push(agg);
    }
  }

  // Orden estable: por municipio asc, año asc.
  aggregates.sort(
    (a, b) => a.municipioId.localeCompare(b.municipioId) || a.anio - b.anio,
  );

  // Manifest. `refreshedAt` corre acá para que el resto del pipeline sea
  // determinista a igualdad de datos upstream.
  const refreshedAt = new Date().toISOString();
  const manifest = buildManifest(fuentes, refreshedAt, aggregates.length);

  // Escribir directo a la web data dir (Sprint 17 lo hacía con cp manual).
  const dir = webDataDir();
  mkdirSync(dir, { recursive: true });
  const dataPath = resolve(dir, "auto-contrataciones.json");
  const aggPath = resolve(dir, "auto-contrataciones-aggregates.json");
  const manifestPath = resolve(dir, "auto-contrataciones-manifest.json");
  writeFileSync(dataPath, JSON.stringify(contrataciones, null, 2), "utf-8");
  writeFileSync(aggPath, JSON.stringify(aggregates, null, 2), "utf-8");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  // ─────────────────────────────────────────
  // Resumen
  // ─────────────────────────────────────────

  console.log(`\n📊 Resumen:`);
  console.log(`   · Total contrataciones: ${manifest.totalContrataciones}`);
  console.log(`   · Municipios con datos: ${manifest.municipiosConDatos} / 135`);
  console.log(`   · Aggregates (cells): ${manifest.aggregates}`);
  console.log(`   · Fuentes activas: ${manifest.fuentes.length}`);
  for (const f of manifest.fuentes) {
    console.log(`     · ${f.label} → ${f.contrataciones} cont. (${f.datasetsParseados} datasets)`);
  }
  console.log(`\n💾 ${dataPath}`);
  console.log(`💾 ${aggPath}`);
  console.log(`💾 ${manifestPath}`);
}

// Ejecutar sólo si es el entrypoint (no en tests).
const invokedAs = process.argv[1] ?? "";
if (invokedAs.endsWith("refresh-pilar4.ts")) {
  main().catch((e) => {
    console.error("Error fatal:", e);
    process.exitCode = 1;
  });
}
