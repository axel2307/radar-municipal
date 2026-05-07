#!/usr/bin/env tsx
/**
 * Resolver de URLs oficiales para los municipios con `urlOficial: null` en el seed.
 *
 * Para cada municipio sin URL:
 *   1. Genera slugs candidatos (packages/scraper/src/url-resolver/slug.ts)
 *   2. Arma URLs candidatas (hasta 6 por slug: https://www.{slug}.{gob|gov|com}.ar y sin www)
 *   3. Prueba cada una con GET + evaluación de contenido (url-resolver/validator.ts)
 *   4. Selecciona la de mejor score, o null si ninguna supera el umbral
 *
 * Output:
 *   - `<outputDir>/resolve-urls.json`          — resultados crudos por municipio
 *   - `<outputDir>/resolve-urls-report.md`     — reporte legible con tasas de éxito
 *   - `<outputDir>/resolve-urls-patch.ts`      — patch TypeScript listo para aplicar
 *
 * Uso:
 *   pnpm resolve:urls -- --dry-run         # sólo imprime plan y candidatas
 *   pnpm resolve:urls                      # descubrimiento real
 *   pnpm resolve:urls -- --limit 5         # sólo primeros 5 sin URL
 *   pnpm resolve:urls -- --ids 060007,060021
 *   pnpm resolve:urls -- --threshold 0.6   # más laxo (default 0.7)
 *   pnpm resolve:urls -- --concurrency 3   # N municipios en paralelo (default 2)
 *
 * Notas:
 *   - No modifica el seed automáticamente. El patch se aplica manualmente tras revisar.
 *   - Rate limit default 1.5s entre candidatas del mismo municipio.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { MUNICIPIOS, type Municipio } from "@radar-municipal/core";
import { generateCandidateUrls } from "../url-resolver/slug";
import { findBestUrl, type ValidationResult } from "../url-resolver/validator";

// ─────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────

export interface CliOptions {
  dryRun: boolean;
  limit: number | null;
  ids: Set<string> | null;
  threshold: number;
  outputDir: string;
  concurrency: number;
  timeoutMs: number;
}

export function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const opt: CliOptions = {
    dryRun: args.includes("--dry-run"),
    limit: null,
    ids: null,
    threshold: 0.7,
    outputDir: "./output/resolve-urls",
    concurrency: 2,
    timeoutMs: 10_000,
  };

  const num = (flag: string, min: number, max: number): number | null => {
    const i = args.indexOf(flag);
    if (i === -1 || !args[i + 1]) return null;
    const n = Number(args[i + 1]);
    if (!Number.isFinite(n) || n < min || n > max) {
      throw new Error(`${flag} must be in [${min}, ${max}]`);
    }
    return n;
  };

  const limit = num("--limit", 1, 200);
  if (limit != null) opt.limit = limit;

  const idsIdx = args.indexOf("--ids");
  if (idsIdx !== -1 && args[idsIdx + 1]) {
    opt.ids = new Set(
      args[idsIdx + 1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  const thr = num("--threshold", 0, 1);
  if (thr != null) opt.threshold = thr;

  const outIdx = args.indexOf("--output");
  if (outIdx !== -1 && args[outIdx + 1]) opt.outputDir = args[outIdx + 1];

  const conc = num("--concurrency", 1, 10);
  if (conc != null) opt.concurrency = conc;

  const timeout = num("--timeout-ms", 1000, 60_000);
  if (timeout != null) opt.timeoutMs = timeout;

  return opt;
}

// ─────────────────────────────────────────
// Planning (pure)
// ─────────────────────────────────────────

export interface PlannedMunicipio {
  municipio: Municipio;
  candidateUrls: string[];
}

export function buildPlan(
  municipios: readonly Municipio[],
  opt: Pick<CliOptions, "limit" | "ids">,
): PlannedMunicipio[] {
  // Solo los que NO tienen urlOficial
  let filtered = municipios.filter((m) => !m.urlOficial);

  if (opt.ids) {
    filtered = filtered.filter((m) => opt.ids!.has(m.id));
  }

  if (opt.limit != null) {
    filtered = filtered.slice(0, opt.limit);
  }

  return filtered.map((m) => ({
    municipio: m,
    candidateUrls: generateCandidateUrls(m.nombre),
  }));
}

// ─────────────────────────────────────────
// Execution
// ─────────────────────────────────────────

export interface ResolutionRecord {
  municipioId: string;
  nombre: string;
  partido: string;
  selectedUrl: string | null;
  confidence: number;
  attempted: number;
  durationMs: number;
  reason: string;
  details: ValidationResult[];
}

async function resolveOne(
  target: PlannedMunicipio,
  opt: Pick<CliOptions, "threshold" | "timeoutMs">,
): Promise<ResolutionRecord> {
  const { municipio, candidateUrls } = target;
  const start = Date.now();

  const { selected, attempted } = await findBestUrl(candidateUrls, {
    municipioNombre: municipio.nombre,
    threshold: opt.threshold,
    timeoutMs: opt.timeoutMs,
  });

  const durationMs = Date.now() - start;
  const confidence = selected?.confidence ?? 0;

  let reason: string;
  if (!selected) {
    reason = `ninguna de ${candidateUrls.length} candidatas respondió`;
  } else if (confidence >= opt.threshold) {
    reason = `aceptada (confidence ${confidence})`;
  } else {
    reason = `debajo de umbral ${opt.threshold} (confidence ${confidence}) — requiere revisión manual`;
  }

  return {
    municipioId: municipio.id,
    nombre: municipio.nombre,
    partido: municipio.partido,
    selectedUrl: confidence >= opt.threshold ? selected?.finalUrl ?? null : null,
    confidence,
    attempted: attempted.length,
    durationMs,
    reason,
    details: attempted,
  };
}

async function runPool(
  plan: PlannedMunicipio[],
  opt: CliOptions,
  onProgress: (rec: ResolutionRecord, i: number, total: number) => void,
): Promise<ResolutionRecord[]> {
  const records: ResolutionRecord[] = new Array(plan.length);
  let nextIdx = 0;
  let completed = 0;

  async function worker() {
    while (true) {
      const i = nextIdx++;
      if (i >= plan.length) return;
      const rec = await resolveOne(plan[i], opt);
      records[i] = rec;
      completed++;
      onProgress(rec, completed, plan.length);
    }
  }

  const workers = Array.from({ length: Math.min(opt.concurrency, plan.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return records;
}

// ─────────────────────────────────────────
// Reporting
// ─────────────────────────────────────────

export interface ReportSummary {
  total: number;
  accepted: number;
  uncertain: number;
  notFound: number;
  durationMs: number;
}

export function summarize(
  records: readonly ResolutionRecord[],
  durationTotalMs: number,
): ReportSummary {
  let accepted = 0,
    uncertain = 0,
    notFound = 0;
  for (const r of records) {
    if (r.selectedUrl) accepted++;
    else if (r.confidence > 0) uncertain++;
    else notFound++;
  }
  return {
    total: records.length,
    accepted,
    uncertain,
    notFound,
    durationMs: durationTotalMs,
  };
}

export function buildMarkdownReport(
  records: readonly ResolutionRecord[],
  summary: ReportSummary,
  cli: CliOptions,
): string {
  const lines: string[] = [];
  lines.push("# Resolve URLs — Reporte");
  lines.push("");
  lines.push(`- Total procesados: **${summary.total}**`);
  lines.push(`- Aceptados (≥ ${cli.threshold} confidence): **${summary.accepted}**`);
  lines.push(`- Dudosos (respondió pero debajo del umbral): **${summary.uncertain}**`);
  lines.push(`- No encontrados: **${summary.notFound}**`);
  lines.push(`- Duración total: **${(summary.durationMs / 1000).toFixed(1)}s**`);
  lines.push("");

  lines.push("## Aceptados");
  lines.push("");
  lines.push("| ID | Municipio | URL | Confianza |");
  lines.push("|---|---|---|---|");
  for (const r of records.filter((r) => r.selectedUrl)) {
    lines.push(`| ${r.municipioId} | ${r.nombre} | ${r.selectedUrl} | ${r.confidence} |`);
  }
  lines.push("");

  lines.push("## Dudosos (revisión manual recomendada)");
  lines.push("");
  lines.push("| ID | Municipio | Mejor candidata | Confianza | Razón |");
  lines.push("|---|---|---|---|---|");
  for (const r of records.filter((r) => !r.selectedUrl && r.confidence > 0)) {
    const best = r.details
      .filter((d) => d.ok)
      .sort((a, b) => b.confidence - a.confidence)[0];
    lines.push(
      `| ${r.municipioId} | ${r.nombre} | ${best?.finalUrl ?? best?.url ?? "-"} | ${r.confidence} | ${r.reason} |`,
    );
  }
  lines.push("");

  lines.push("## No encontrados");
  lines.push("");
  lines.push("| ID | Municipio | Candidatas probadas |");
  lines.push("|---|---|---|");
  for (const r of records.filter((r) => !r.selectedUrl && r.confidence === 0)) {
    lines.push(`| ${r.municipioId} | ${r.nombre} | ${r.attempted} |`);
  }

  return lines.join("\n");
}

/**
 * Genera un snippet TypeScript con diffs aplicables a `core/municipios.ts`.
 * El humano lo revisa antes de aplicar con search-replace.
 */
export function buildSeedPatch(records: readonly ResolutionRecord[]): string {
  const lines: string[] = [];
  lines.push("// Seed patch generado por resolve-urls.");
  lines.push("// Aplicar manualmente en packages/core/src/constants/municipios.ts");
  lines.push("// reemplazando `urlOficial: null` por la URL correspondiente.");
  lines.push("");
  lines.push("export const RESOLVED_URLS: Record<string, string> = {");
  for (const r of records.filter((r) => r.selectedUrl)) {
    lines.push(`  "${r.municipioId}": "${r.selectedUrl}", // ${r.nombre} (confidence ${r.confidence})`);
  }
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

export async function main(argv: string[] = process.argv): Promise<void> {
  const cli = parseArgs(argv);
  const plan = buildPlan(MUNICIPIOS, cli);

  console.log(`🔎 Resolve URLs: ${plan.length} municipios sin urlOficial evaluados`);
  console.log(
    `   · Flags: dry-run=${cli.dryRun} limit=${cli.limit ?? "∞"} threshold=${cli.threshold} concurrency=${cli.concurrency}`,
  );

  if (cli.dryRun) {
    console.log(`\n[DRY RUN] Se evaluarían ${plan.length} municipios. Sample:\n`);
    for (const p of plan.slice(0, 5)) {
      console.log(`  · ${p.municipio.nombre.padEnd(30)} (${p.municipio.id})`);
      console.log(`    candidatas: ${p.candidateUrls.slice(0, 3).join(", ")}${p.candidateUrls.length > 3 ? ` … +${p.candidateUrls.length - 3} más` : ""}`);
    }
    console.log("\n✅ Dry run completo. No se realizó tráfico de red.");
    return;
  }

  const start = Date.now();
  const records = await runPool(plan, cli, (rec, i, total) => {
    const mark = rec.selectedUrl ? "✓" : rec.confidence > 0 ? "?" : "✗";
    console.log(
      `  [${String(i).padStart(3)}/${total}] ${mark} ${rec.nombre.padEnd(30)} → ${rec.selectedUrl ?? "(ninguna)"} [conf ${rec.confidence}]`,
    );
  });
  const durationMs = Date.now() - start;
  const summary = summarize(records, durationMs);

  // Persistir
  const outDir = resolve(cli.outputDir);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "resolve-urls.json"), JSON.stringify(records, null, 2));
  writeFileSync(
    resolve(outDir, "resolve-urls-report.md"),
    buildMarkdownReport(records, summary, cli),
  );
  writeFileSync(resolve(outDir, "resolve-urls-patch.ts"), buildSeedPatch(records));

  console.log(`\n📊 Resumen:`);
  console.log(`   · Aceptados:    ${summary.accepted}`);
  console.log(`   · Dudosos:      ${summary.uncertain}`);
  console.log(`   · No encontrados: ${summary.notFound}`);
  console.log(`   · Duración total: ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`\n📁 Output en: ${outDir}`);
}

// Ejecutar sólo si se invoca como CLI (no en tests)
const isMain =
  typeof import.meta !== "undefined" &&
  import.meta.url.endsWith("resolve-urls.ts");
if (isMain) {
  main().catch((e) => {
    console.error("Error fatal:", e);
    process.exitCode = 1;
  });
}
