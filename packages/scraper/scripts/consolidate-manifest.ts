#!/usr/bin/env tsx
/**
 * Sprint 27 — Consolidate manifest del cron mensual.
 *
 * Lee los manifests individuales de cada refresh script
 * (`auto-contrataciones-manifest.json`, `auto-deuda-manifest.json`, etc.)
 * y emite un manifest unificado a
 * `packages/web/src/data/auto-refresh-manifest.json`.
 *
 * Diseñado para correrse desde el job final del workflow
 * `monthly-refresh.yml`. Acepta arguments via env var para que el
 * workflow pase información que sólo conoce él (status por target,
 * duraciones, errores).
 *
 * Karpathy "Surgical": el manifest unificado no recalcula nada que ya
 * esté en los individuales — sólo agrega entries y suma counts.
 *
 * Uso:
 *   pnpm --filter @radar-municipal/scraper consolidate:manifest
 *
 * Env vars opcionales (las setea el workflow):
 *   REFRESH_RUNS_JSON='[{"target":"compras","script":"refresh:pilar4",
 *                        "status":"success","durationMs":182431}, ...]'
 *
 * Si la env var no está, el script genera entries con status="success" y
 * duración 0 para cada manifest individual encontrado (modo standalone
 * para dev / smoke local).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  GlobalRefreshManifest,
  MonthlyRefreshRun,
  RefreshManifest,
} from "@radar-municipal/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "..", "..", "web", "src", "data");

// ─────────────────────────────────────────
// Mapping target → manifest path + script name
// ─────────────────────────────────────────

interface TargetSpec {
  target: string;
  script: string;
  manifestPath: string; // relativo a DATA_DIR
  /**
   * Path relativo del JSON principal. Lo usamos para extraer la lista de
   * `municipioId` únicos cubiertos por la corrida (input al
   * `totalMunicipiosCubiertos` global).
   */
  dataPath: string;
}

const TARGETS: TargetSpec[] = [
  {
    target: "compras",
    script: "refresh:pilar4",
    manifestPath: "auto-contrataciones-manifest.json",
    dataPath: "auto-contrataciones.json",
  },
  {
    target: "deuda",
    script: "refresh:deuda",
    manifestPath: "auto-deuda-manifest.json",
    dataPath: "auto-deuda.json",
  },
];

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function readJsonOrNull(path: string): unknown {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Extrae municipioIds únicos del data JSON principal de un target. Cada
 * shape es distinto (contrataciones es array de Contratacion con
 * `municipioId`, deuda es array de StockDeudaSnapshot también con
 * `municipioId`). Bastante uniforme — si el día de mañana hay un shape
 * raro, agregamos un mapper en TargetSpec.
 */
function extractMunicipioIds(dataPath: string): string[] {
  const data = readJsonOrNull(resolve(DATA_DIR, dataPath));
  if (!Array.isArray(data)) return [];
  const ids = new Set<string>();
  for (const entry of data) {
    if (
      entry &&
      typeof entry === "object" &&
      "municipioId" in entry &&
      typeof (entry as { municipioId: unknown }).municipioId === "string"
    ) {
      ids.add((entry as { municipioId: string }).municipioId);
    }
  }
  return [...ids];
}

interface RunOverride {
  target: string;
  script?: string;
  status?: MonthlyRefreshRun["status"];
  durationMs?: number;
  error?: string;
}

/**
 * Parsea REFRESH_RUNS_JSON env var. Si no está o es inválida, devuelve [].
 * El workflow setea esto con info que sólo el orquestador conoce
 * (status real del job, duración, error message).
 */
function parseEnvOverrides(): RunOverride[] {
  const raw = process.env.REFRESH_RUNS_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is RunOverride =>
        x !== null && typeof x === "object" && typeof x.target === "string",
    );
  } catch {
    console.warn("REFRESH_RUNS_JSON no parsea como JSON válido — ignorado");
    return [];
  }
}

// ─────────────────────────────────────────
// Builder (puro, testeable)
// ─────────────────────────────────────────

export interface ConsolidateInput {
  /** Manifests individuales que se encontraron en disco. */
  manifestsByTarget: Map<string, RefreshManifest>;
  /** municipioIds únicos por target (extraídos del data JSON). */
  municipioIdsByTarget: Map<string, string[]>;
  /** Overrides del workflow (status real, duraciones). */
  overrides: RunOverride[];
  /** Targets esperados (de TargetSpec[]). */
  targets: TargetSpec[];
  /** ISO timestamp de cuándo se construye el manifest. */
  refreshedAt: string;
}

export function buildGlobalManifest(input: ConsolidateInput): GlobalRefreshManifest {
  const { targets, manifestsByTarget, municipioIdsByTarget, overrides, refreshedAt } =
    input;

  const overrideByTarget = new Map<string, RunOverride>();
  for (const o of overrides) overrideByTarget.set(o.target, o);

  const runs: MonthlyRefreshRun[] = targets.map((spec) => {
    const ind = manifestsByTarget.get(spec.target);
    const ovr = overrideByTarget.get(spec.target);
    const hasManifest = ind != null;
    const status: MonthlyRefreshRun["status"] =
      ovr?.status ?? (hasManifest ? "success" : "skipped");
    return {
      target: spec.target,
      script: ovr?.script ?? spec.script,
      status,
      durationMs: ovr?.durationMs ?? 0,
      municipiosConDatos: ind?.municipiosConDatos ?? 0,
      error: ovr?.error,
      sourceManifestPath: hasManifest ? spec.manifestPath : undefined,
    };
  });

  // Union de municipioIds en runs con success.
  const allIds = new Set<string>();
  for (const run of runs) {
    if (run.status !== "success") continue;
    const ids = municipioIdsByTarget.get(run.target) ?? [];
    for (const id of ids) allIds.add(id);
  }

  return {
    refreshedAt,
    runs,
    totalMunicipiosCubiertos: allIds.size,
  };
}

// ─────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────

function main(): void {
  const manifestsByTarget = new Map<string, RefreshManifest>();
  const municipioIdsByTarget = new Map<string, string[]>();

  for (const spec of TARGETS) {
    const m = readJsonOrNull(resolve(DATA_DIR, spec.manifestPath));
    if (m) manifestsByTarget.set(spec.target, m as RefreshManifest);
    municipioIdsByTarget.set(spec.target, extractMunicipioIds(spec.dataPath));
  }

  const global = buildGlobalManifest({
    targets: TARGETS,
    manifestsByTarget,
    municipioIdsByTarget,
    overrides: parseEnvOverrides(),
    refreshedAt: new Date().toISOString(),
  });

  const outPath = resolve(DATA_DIR, "auto-refresh-manifest.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(global, null, 2), "utf-8");

  console.log(`📊 Sprint 27 — consolidate-manifest`);
  console.log(`   refreshedAt: ${global.refreshedAt}`);
  console.log(`   total municipios cubiertos: ${global.totalMunicipiosCubiertos}`);
  console.log(`   runs:`);
  for (const r of global.runs) {
    const mark =
      r.status === "success" ? "✓" : r.status === "failed" ? "✗" : "○";
    console.log(
      `     ${mark} ${r.target.padEnd(10)} ${r.script.padEnd(20)} ${r.status} (${r.durationMs}ms, ${r.municipiosConDatos} mun.)`,
    );
  }
  console.log(`\n💾 ${outPath}`);
}

const invokedAs = process.argv[1] ?? "";
if (invokedAs.endsWith("consolidate-manifest.ts")) {
  main();
}
