#!/usr/bin/env tsx
/**
 * Crawl masivo de los 135 municipios de PBA.
 *
 * Itera sobre `MUNICIPIOS` (los 135), clasifica cada uno en:
 *   - OK: tiene `urlOficial` → se crawlea con `crawlTransparencyPortal()`.
 *   - SIN_URL: `urlOficial` es null → se skipea con razón clara.
 *   - ERROR: el crawl lanzó excepción → se registra sin cortar el batch.
 *
 * Output:
 *   - `<outputDir>/crawl-all-135.json` — resultados crudos por municipio
 *   - `<outputDir>/crawl-all-135-report.md` — reporte legible con tasas de éxito
 *   - `<outputDir>/crawl-<municipioId>.json` — un archivo por crawl exitoso
 *
 * Uso:
 *   pnpm crawl:all-135 -- --dry-run         # imprime plan sin crawlear
 *   pnpm crawl:all-135                      # crawl real de los 135
 *   pnpm crawl:all-135 -- --only-piloto     # solo los 13 piloto
 *   pnpm crawl:all-135 -- --limit 20        # solo los primeros 20 con URL
 *   pnpm crawl:all-135 -- --ids 060056,060441
 *   pnpm crawl:all-135 -- --output ./out
 *   pnpm crawl:all-135 -- --rate-ms 3000    # delay entre crawls (default 2000)
 *   pnpm crawl:all-135 -- --concurrency 3   # N en paralelo (default 1)
 *
 * Notas:
 *   - Rate limit default 2s entre sites para no martillar servidores.
 *   - Concurrency > 1 aplica los delays por slot, no globales.
 *   - Los 122 no-piloto hoy están con `urlOficial: null` y quedan bloqueados
 *     en categoría SIN_URL. El desbloqueo es un script aparte que resuelva URLs.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { MUNICIPIOS, type Municipio } from "@radar-municipal/core";
import { crawlTransparencyPortal } from "../crawlers/transparency-crawler";
import type { CrawlResult } from "../types";

// ─────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────

export interface CliOptions {
  dryRun: boolean;
  onlyPiloto: boolean;
  limit: number | null;
  ids: Set<string> | null;
  outputDir: string;
  rateLimitMs: number;
  concurrency: number;
}

export function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const opt: CliOptions = {
    dryRun: args.includes("--dry-run"),
    onlyPiloto: args.includes("--only-piloto"),
    limit: null,
    ids: null,
    outputDir: "./output/crawl-all-135",
    rateLimitMs: 2000,
    concurrency: 1,
  };

  const limitIdx = args.indexOf("--limit");
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    const n = Number(args[limitIdx + 1]);
    if (!Number.isFinite(n) || n <= 0) throw new Error("--limit requires positive integer");
    opt.limit = n;
  }

  const idsIdx = args.indexOf("--ids");
  if (idsIdx !== -1 && args[idsIdx + 1]) {
    opt.ids = new Set(
      args[idsIdx + 1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  const outIdx = args.indexOf("--output");
  if (outIdx !== -1 && args[outIdx + 1]) {
    opt.outputDir = args[outIdx + 1];
  }

  const rateIdx = args.indexOf("--rate-ms");
  if (rateIdx !== -1 && args[rateIdx + 1]) {
    const n = Number(args[rateIdx + 1]);
    if (!Number.isFinite(n) || n < 0) throw new Error("--rate-ms requires non-negative integer");
    opt.rateLimitMs = n;
  }

  const concIdx = args.indexOf("--concurrency");
  if (concIdx !== -1 && args[concIdx + 1]) {
    const n = Number(args[concIdx + 1]);
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      throw new Error("--concurrency must be 1..10");
    }
    opt.concurrency = n;
  }

  return opt;
}

// ─────────────────────────────────────────
// Planning (pure: no network)
// ─────────────────────────────────────────

export type TargetStatus = "OK" | "SIN_URL" | "SKIPPED_BY_FILTER";

export interface PlannedTarget {
  municipio: Municipio;
  status: TargetStatus;
  skipReason: string | null;
}

export function buildPlan(
  municipios: readonly Municipio[],
  opt: Pick<CliOptions, "onlyPiloto" | "limit" | "ids">,
): PlannedTarget[] {
  // Primer filtro: ids/onlyPiloto/urlOficial
  let pool: PlannedTarget[] = municipios.map((m) => {
    let status: TargetStatus = "OK";
    let skipReason: string | null = null;

    if (opt.ids && !opt.ids.has(m.id)) {
      status = "SKIPPED_BY_FILTER";
      skipReason = "no en --ids";
    } else if (opt.onlyPiloto && !m.esPiloto) {
      status = "SKIPPED_BY_FILTER";
      skipReason = "no es piloto (--only-piloto)";
    } else if (!m.urlOficial) {
      status = "SIN_URL";
      skipReason = "urlOficial es null en la constante MUNICIPIOS";
    }

    return { municipio: m, status, skipReason };
  });

  // Segundo filtro: limit solo aplica a los OK, en orden de la constante
  if (opt.limit != null) {
    let okCount = 0;
    pool = pool.map((p) => {
      if (p.status !== "OK") return p;
      okCount++;
      if (okCount > opt.limit!) {
        return {
          ...p,
          status: "SKIPPED_BY_FILTER",
          skipReason: `excede --limit ${opt.limit}`,
        };
      }
      return p;
    });
  }

  return pool;
}

// ─────────────────────────────────────────
// Execution
// ─────────────────────────────────────────

export type RunOutcome =
  | { kind: "OK"; crawl: CrawlResult }
  | { kind: "SIN_URL" }
  | { kind: "SKIPPED_BY_FILTER"; reason: string }
  | { kind: "ERROR"; message: string };

export interface RunRecord {
  municipioId: string;
  nombre: string;
  partido: string;
  esPiloto: boolean;
  urlOficial: string | null;
  outcome: RunOutcome;
  durationMs: number;
}

async function crawlOne(target: PlannedTarget): Promise<RunRecord> {
  const { municipio } = target;
  const base: Omit<RunRecord, "outcome" | "durationMs"> = {
    municipioId: municipio.id,
    nombre: municipio.nombre,
    partido: municipio.partido,
    esPiloto: municipio.esPiloto,
    urlOficial: municipio.urlOficial ?? null,
  };
  const start = Date.now();

  if (target.status === "SIN_URL") {
    return { ...base, outcome: { kind: "SIN_URL" }, durationMs: 0 };
  }
  if (target.status === "SKIPPED_BY_FILTER") {
    return {
      ...base,
      outcome: { kind: "SKIPPED_BY_FILTER", reason: target.skipReason ?? "filtered" },
      durationMs: 0,
    };
  }

  try {
    const crawl = await crawlTransparencyPortal({
      municipioId: municipio.id,
      nombre: municipio.nombre,
      urlOficial: municipio.urlOficial!,
    });
    return {
      ...base,
      outcome: { kind: "OK", crawl },
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      ...base,
      outcome: { kind: "ERROR", message: (err as Error).message },
      durationMs: Date.now() - start,
    };
  }
}

async function runWithConcurrency(
  toRun: PlannedTarget[],
  opts: { concurrency: number; rateLimitMs: number; onProgress: (done: number, total: number, last: RunRecord) => void },
): Promise<RunRecord[]> {
  const results: RunRecord[] = new Array(toRun.length);
  let nextIdx = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const i = nextIdx++;
      if (i >= toRun.length) return;
      const rec = await crawlOne(toRun[i]);
      results[i] = rec;
      done++;
      opts.onProgress(done, toRun.length, rec);
      // Rate limit per slot. Skip delay for records que no hicieron tráfico de red.
      if (
        i < toRun.length - 1 &&
        (rec.outcome.kind === "OK" || rec.outcome.kind === "ERROR") &&
        opts.rateLimitMs > 0
      ) {
        await new Promise((r) => setTimeout(r, opts.rateLimitMs));
      }
    }
  }

  const workers = Array.from({ length: Math.min(opts.concurrency, toRun.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ─────────────────────────────────────────
// Reporting
// ─────────────────────────────────────────

export interface ReportSummary {
  total: number;
  conUrl: number;
  sinUrl: number;
  skippedByFilter: number;
  crawledOk: number;
  crawledError: number;
  sitiosOnline: number;
  documentosDetectados: number;
  fechaEjecucion: string;
  duracionTotalMs: number;
}

export function summarize(records: RunRecord[], durationTotalMs: number): ReportSummary {
  const s: ReportSummary = {
    total: records.length,
    conUrl: 0,
    sinUrl: 0,
    skippedByFilter: 0,
    crawledOk: 0,
    crawledError: 0,
    sitiosOnline: 0,
    documentosDetectados: 0,
    fechaEjecucion: new Date().toISOString(),
    duracionTotalMs: durationTotalMs,
  };
  for (const r of records) {
    if (r.urlOficial) s.conUrl++;
    switch (r.outcome.kind) {
      case "SIN_URL":
        s.sinUrl++;
        break;
      case "SKIPPED_BY_FILTER":
        s.skippedByFilter++;
        break;
      case "OK":
        s.crawledOk++;
        if (r.outcome.crawl.sitioOnline) s.sitiosOnline++;
        s.documentosDetectados += r.outcome.crawl.documentos.length;
        break;
      case "ERROR":
        s.crawledError++;
        break;
    }
  }
  return s;
}

export function buildMarkdownReport(
  records: RunRecord[],
  summary: ReportSummary,
  cli: CliOptions,
): string {
  const lines: string[] = [];
  lines.push("# Crawl masivo — reporte");
  lines.push("");
  lines.push(`**Fecha:** ${summary.fechaEjecucion}`);
  lines.push(`**Duración total:** ${(summary.duracionTotalMs / 1000).toFixed(1)}s`);
  lines.push(`**Flags:** dry-run=${cli.dryRun} · only-piloto=${cli.onlyPiloto} · limit=${cli.limit ?? "∞"} · concurrency=${cli.concurrency} · rate-ms=${cli.rateLimitMs}`);
  lines.push("");
  lines.push("## Resumen");
  lines.push("");
  lines.push(`| Métrica | Valor |`);
  lines.push(`|---|---:|`);
  lines.push(`| Municipios evaluados | ${summary.total} |`);
  lines.push(`| Con \`urlOficial\` | ${summary.conUrl} |`);
  lines.push(`| Sin \`urlOficial\` (bloqueados) | ${summary.sinUrl} |`);
  lines.push(`| Skipped por filtros | ${summary.skippedByFilter} |`);
  lines.push(`| Crawl OK | ${summary.crawledOk} |`);
  lines.push(`| Crawl ERROR | ${summary.crawledError} |`);
  lines.push(`| Sitios online | ${summary.sitiosOnline} |`);
  lines.push(`| Documentos detectados (suma) | ${summary.documentosDetectados} |`);
  lines.push("");

  const intentados = summary.crawledOk + summary.crawledError;
  if (intentados > 0) {
    const pct = Math.round((summary.crawledOk / intentados) * 100);
    lines.push(`**Tasa de éxito sobre los intentados:** ${summary.crawledOk}/${intentados} = ${pct}%`);
    lines.push("");
  }

  const errores = records.filter((r) => r.outcome.kind === "ERROR");
  if (errores.length > 0) {
    lines.push("## URLs caídas / errores");
    lines.push("");
    lines.push("| Municipio | ID | URL | Error |");
    lines.push("|---|---|---|---|");
    for (const r of errores) {
      const msg = r.outcome.kind === "ERROR" ? r.outcome.message : "";
      lines.push(`| ${r.nombre} | ${r.municipioId} | ${r.urlOficial ?? "—"} | ${msg.replace(/\|/g, "\\|").slice(0, 120)} |`);
    }
    lines.push("");
  }

  const opacos = records.filter(
    (r) =>
      r.outcome.kind === "OK" &&
      r.outcome.crawl.sitioOnline &&
      r.outcome.crawl.documentos.length === 0,
  );
  if (opacos.length > 0) {
    lines.push("## Sitios online sin documentos detectados");
    lines.push("");
    lines.push("> Portal accesible pero sin docs de transparencia (presupuesto, ejecución, SEF, deuda, ordenanza fiscal). Candidatos a auditoría manual.");
    lines.push("");
    for (const r of opacos) {
      lines.push(`- **${r.nombre}** (${r.municipioId}) — ${r.urlOficial}`);
    }
    lines.push("");
  }

  const sinUrl = records.filter((r) => r.outcome.kind === "SIN_URL");
  if (sinUrl.length > 0) {
    lines.push("## Municipios bloqueados por falta de `urlOficial`");
    lines.push("");
    lines.push(`${sinUrl.length} municipios no tienen \`urlOficial\` poblada en \`packages/core/src/constants/municipios.ts\`. Necesitan un resolver de URLs antes de poder crawlearse.`);
    lines.push("");
    lines.push("<details><summary>Ver lista completa</summary>");
    lines.push("");
    for (const r of sinUrl) {
      lines.push(`- ${r.nombre} (${r.municipioId}) — partido: ${r.partido}`);
    }
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

async function main() {
  const cli = parseArgs(process.argv);
  const plan = buildPlan(MUNICIPIOS, cli);

  const okCount = plan.filter((p) => p.status === "OK").length;
  const sinUrlCount = plan.filter((p) => p.status === "SIN_URL").length;
  const skippedCount = plan.filter((p) => p.status === "SKIPPED_BY_FILTER").length;

  console.log(`\n🗺️  Plan de crawl: ${plan.length} municipios evaluados`);
  console.log(`   · OK (con URL, sin filtros): ${okCount}`);
  console.log(`   · Sin URL oficial: ${sinUrlCount}`);
  console.log(`   · Skipped por filtros: ${skippedCount}`);
  console.log(`   · Flags: dry-run=${cli.dryRun} only-piloto=${cli.onlyPiloto} limit=${cli.limit ?? "∞"} concurrency=${cli.concurrency}`);

  if (cli.dryRun) {
    console.log(`\n[DRY RUN] Se crawlearían ${okCount} municipios. Lista:\n`);
    for (const p of plan) {
      if (p.status === "OK") {
        console.log(`  · ${p.municipio.nombre.padEnd(28)} (${p.municipio.id}) → ${p.municipio.urlOficial}`);
      }
    }
    if (sinUrlCount > 0) {
      console.log(`\n[DRY RUN] ${sinUrlCount} municipios bloqueados sin urlOficial. Primeros 5:`);
      plan
        .filter((p) => p.status === "SIN_URL")
        .slice(0, 5)
        .forEach((p) => console.log(`  · ${p.municipio.nombre} (${p.municipio.id})`));
    }
    console.log(`\n✅ Dry run completo. No se realizó tráfico de red.\n`);
    return;
  }

  mkdirSync(resolve(cli.outputDir), { recursive: true });

  const globalStart = Date.now();
  const records = await runWithConcurrency(plan, {
    concurrency: cli.concurrency,
    rateLimitMs: cli.rateLimitMs,
    onProgress: (done, total, last) => {
      const icon =
        last.outcome.kind === "OK" ? "✅" :
        last.outcome.kind === "ERROR" ? "❌" :
        last.outcome.kind === "SIN_URL" ? "⊘" : "·";
      const detail =
        last.outcome.kind === "OK"
          ? `online=${last.outcome.crawl.sitioOnline} docs=${last.outcome.crawl.documentos.length} ${last.durationMs}ms`
          : last.outcome.kind === "ERROR"
            ? last.outcome.message.slice(0, 80)
            : last.outcome.kind === "SIN_URL"
              ? "sin urlOficial"
              : "skipped";
      console.log(`  [${String(done).padStart(3)}/${total}] ${icon} ${last.nombre.padEnd(28)} ${detail}`);
    },
  });
  const durationTotalMs = Date.now() - globalStart;

  for (const r of records) {
    if (r.outcome.kind === "OK") {
      writeFileSync(
        resolve(cli.outputDir, `crawl-${r.municipioId}.json`),
        JSON.stringify(r.outcome.crawl, null, 2),
      );
    }
  }

  const consolidated = records.map((r) => ({
    municipioId: r.municipioId,
    nombre: r.nombre,
    partido: r.partido,
    esPiloto: r.esPiloto,
    urlOficial: r.urlOficial,
    durationMs: r.durationMs,
    outcome: r.outcome,
  }));
  writeFileSync(
    resolve(cli.outputDir, "crawl-all-135.json"),
    JSON.stringify(consolidated, null, 2),
  );

  const summary = summarize(records, durationTotalMs);
  const md = buildMarkdownReport(records, summary, cli);
  const mdPath = resolve(cli.outputDir, "crawl-all-135-report.md");
  writeFileSync(mdPath, md);

  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 RESUMEN`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total evaluados:        ${summary.total}`);
  console.log(`  Con urlOficial:         ${summary.conUrl}`);
  console.log(`  Sin urlOficial:         ${summary.sinUrl}`);
  console.log(`  Crawl OK:               ${summary.crawledOk}`);
  console.log(`  Crawl ERROR:            ${summary.crawledError}`);
  console.log(`  Sitios online:          ${summary.sitiosOnline}`);
  console.log(`  Documentos detectados:  ${summary.documentosDetectados}`);
  console.log(`  Duración:               ${(summary.duracionTotalMs / 1000).toFixed(1)}s`);
  console.log(`\n💾 Reporte: ${mdPath}`);
  console.log(`💾 JSON:    ${resolve(cli.outputDir, "crawl-all-135.json")}\n`);
}

// Run only when invoked directly (not when imported by tests)
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("crawl-all-135.ts") ||
    process.argv[1].endsWith("crawl-all-135.js"));

if (isMain) {
  main().catch((err) => {
    console.error("\n💥 Error fatal:", err);
    process.exit(1);
  });
}
