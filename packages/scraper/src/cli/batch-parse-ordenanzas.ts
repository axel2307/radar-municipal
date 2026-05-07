#!/usr/bin/env tsx
/**
 * Parser batch de Ordenanzas Impositivas.
 *
 * Input: archivos de auditoría (`pilot-audit.json` + `auto-audit.json`).
 * Se filtran entries que tengan un DocumentAudit con
 * `categoria: ORDENANZA_FISCAL` y `publicado: true`. Para cada uno, se
 * invoca `parseOrdenanzaImpositivaFromUrl()` — el parser ya sabe distinguir
 * PDF nativo de HTML. Los resultados exitosos se agregan a un
 * `PresionImpositivaData[]` que se escribe como JSON, siguiendo el mismo
 * formato que `pilot-presion-impositiva.json` para que el loader web los
 * pueda mezclar.
 *
 * Esta es la pieza que cierra la ÚNICA dimensión `ESTIMACION` del proyecto:
 * cada ordenanza parseada convierte un municipio de presión ESTIMACION a MEDIA.
 *
 * Uso:
 *   pnpm batch:parse-ordenanzas -- --audit ../web/src/data/auto-audit.json
 *   pnpm batch:parse-ordenanzas -- --audit X --limit 5 --dry-run
 *   pnpm batch:parse-ordenanzas -- --audit X --output ../web/src/data/auto-presion-impositiva.json
 *   pnpm batch:parse-ordenanzas -- --audit X --concurrency 3 --timeout-ms 30000
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  ConfidenceLevel,
  DocumentCategory,
  MUNICIPIOS,
  SourceLayer,
  type PilotAuditData,
  type PresionImpositivaData,
  type SourcedValue,
} from "@radar-municipal/core";
import { parseOrdenanzaImpositivaFromUrl } from "../parsers/ordenanza-impositiva";
import type { OrdenanzaImpositivaParseResult } from "../parsers/ordenanza-impositiva";
import {
  classifyOrdenanzaContent,
  type ClassificationResult,
  type OrdenanzaKind,
} from "../parsers/classify-ordenanza";

// ─────────────────────────────────────────
// Planning (puro)
// ─────────────────────────────────────────

export interface OrdenanzaTarget {
  municipioId: string;
  nombre: string;
  url: string;
}

/**
 * Del auditData (pilot o auto) saca los targets parseables. Dedupe por
 * municipioId (si aparece en pilot y auto, pilot gana).
 *
 * **Preferencia de selección**:
 * 1. `ORDENANZA_IMPOSITIVA` publicada con URL (objetivo real del parser —
 *    define tarifas y alícuotas concretas).
 * 2. Fallback: `ORDENANZA_FISCAL` cuya URL contenga "impositiv" o "tarifari"
 *    (auditorías pre-Sprint-7 mezclaban ambas categorías; el keyword
 *    en la URL distingue).
 * 3. Último fallback: `ORDENANZA_FISCAL` sin keyword. El parser puede fallar
 *    sobre el código tributario procedimental, pero al menos intenta —
 *    eventualmente re-clasificamos vía ingest actualizado.
 */
export function extractOrdenanzaTargets(
  auditData: PilotAuditData,
  municipios: ReadonlyArray<{ id: string; nombre: string }>,
): OrdenanzaTarget[] {
  const seen = new Set<string>();
  const targets: OrdenanzaTarget[] = [];
  for (const entry of auditData) {
    if (seen.has(entry.municipioId)) continue;

    const impositivaDocs = entry.documentos.filter(
      (d) => d.categoria === DocumentCategory.ORDENANZA_IMPOSITIVA && d.publicado && d.url,
    );
    const fiscalDocs = entry.documentos.filter(
      (d) => d.categoria === DocumentCategory.ORDENANZA_FISCAL && d.publicado && d.url,
    );
    const fiscalWithKeyword = fiscalDocs.find((d) =>
      /impositiv|tarifari/i.test(d.url ?? ""),
    );

    const doc = impositivaDocs[0] ?? fiscalWithKeyword ?? fiscalDocs[0];
    if (!doc?.url) continue;

    const mun = municipios.find((m) => m.id === entry.municipioId);
    if (!mun) continue;
    seen.add(entry.municipioId);
    targets.push({ municipioId: entry.municipioId, nombre: mun.nombre, url: doc.url });
  }
  return targets;
}

// ─────────────────────────────────────────
// Ejecución (I/O)
// ─────────────────────────────────────────

export interface BatchOptions {
  concurrency: number;
  timeoutMs: number;
  fechaAccesoOverride?: string;
}

export interface ParseAttempt {
  target: OrdenanzaTarget;
  success: boolean;
  anioFiscal: number | null;
  tarifasEncontradas: {
    tsg: boolean;
    tish: boolean;
    rural: boolean;
    construccion: boolean;
  };
  warnings: string[];
  durationMs: number;
  error: string | null;
  result: OrdenanzaImpositivaParseResult | null;
  /**
   * Sprint 9: clasificación por contenido del texto extraído. Null cuando el
   * fetch falló y no hubo texto para clasificar. Usamos esto para distinguir
   * fallos "el doc es Código Fiscal procedural" (data quality del crawler)
   * de fallos "el doc es Impositiva pero con tariff model raro".
   */
  classification: ClassificationResult | null;
}

/**
 * Parsea una URL con timeout. No lanza: todos los errores quedan en el
 * campo `error` del ParseAttempt, así el batch nunca se corta por uno.
 */
async function parseOne(
  target: OrdenanzaTarget,
  opt: BatchOptions,
): Promise<ParseAttempt> {
  const start = Date.now();
  try {
    const timeoutP = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`timeout ${opt.timeoutMs}ms`)), opt.timeoutMs),
    );
    const result = await Promise.race([
      parseOrdenanzaImpositivaFromUrl(target.url, {
        fechaAcceso: opt.fechaAccesoOverride ?? new Date().toISOString().slice(0, 10),
      }),
      timeoutP,
    ]);
    // Sprint 9: clasificar por contenido para distinguir Impositiva vs Código Fiscal.
    // Si rawText está vacío (PDF escaneado sin OCR), classification queda con
    // kind=UNKNOWN y score=0, lo cual es el comportamiento correcto.
    const classification = result.rawText
      ? classifyOrdenanzaContent(result.rawText)
      : null;
    return {
      target,
      success: result.success,
      anioFiscal: result.anioFiscal,
      tarifasEncontradas: {
        tsg: result.tarifas.tsgPorMil !== null,
        tish: result.tarifas.tishPorciento !== null,
        rural: result.tarifas.tasaVialRuralPorHa !== null,
        // Sprint 13: el modelo de Construcción puede ser $/m² directo o
        // alícuota sobre valor de obra (Belgrano 1%). Ambos producen monto
        // computado ≠ null; reportamos cualquiera como "construcción detectada".
        construccion:
          result.tarifas.derechoConstruccionPorM2 !== null ||
          result.tarifas.derechoConstruccionAlicuota !== null,
      },
      warnings: result.warnings,
      durationMs: Date.now() - start,
      error: null,
      result,
      classification,
    };
  } catch (e) {
    return {
      target,
      success: false,
      anioFiscal: null,
      tarifasEncontradas: { tsg: false, tish: false, rural: false, construccion: false },
      warnings: [],
      durationMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
      result: null,
      classification: null,
    };
  }
}

/**
 * Pool simple con concurrencia: corre hasta N tareas en paralelo,
 * reportando progreso vía callback. Orden de results = orden de inputs.
 */
export async function runBatch(
  targets: OrdenanzaTarget[],
  opt: BatchOptions,
  onProgress?: (a: ParseAttempt, idx: number, total: number) => void,
): Promise<ParseAttempt[]> {
  const results: ParseAttempt[] = new Array(targets.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= targets.length) return;
      const att = await parseOne(targets[i], opt);
      results[i] = att;
      onProgress?.(att, i + 1, targets.length);
    }
  }
  const n = Math.min(opt.concurrency, targets.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

// ─────────────────────────────────────────
// Map ParseAttempt → PresionImpositivaData (con provenance)
// ─────────────────────────────────────────

/**
 * Convierte un ParseAttempt exitoso en un PresionImpositivaData apto para
 * el loader web. Si success=false, se emite un data con los montos del
 * parser (que vendrán null → 0 ya con confianza BAJA y warnings), pero
 * se marca `publicaOrdenanzaImpositiva: true` porque el doc existe.
 *
 * El caller decide si incluir los failures o descartarlos.
 */
export function attemptToPresionImpositivaData(att: ParseAttempt): PresionImpositivaData | null {
  if (!att.result) return null;
  const r = att.result;
  const anio = r.anioFiscal ?? new Date().getFullYear();
  return {
    municipioId: att.target.municipioId,
    nombre: att.target.nombre,
    anioFiscal: anio,
    montoVivienda: r.montoVivienda,
    montoComercio: r.montoComercio,
    montoRural: r.montoRural,
    montoConstruccion: r.montoConstruccion,
    publicaOrdenanzaFiscal: true,
    publicaOrdenanzaImpositiva: true,
    urlOrdenanzaImpositiva: att.target.url,
    notaMetodologica: r.warnings.length
      ? `Parser automático. Advertencias: ${r.warnings.slice(0, 2).join("; ")}.`
      : "Valores extraídos por parser automático de la Ordenanza Impositiva publicada.",
  };
}

// ─────────────────────────────────────────
// Summary + report
// ─────────────────────────────────────────

export interface BatchSummary {
  total: number;
  success: number;
  partial: number; // tiene al menos 1 tarifa encontrada
  failed: number;
  durationMs: number;
  byTarifa: { tsg: number; tish: number; rural: number; construccion: number };
  /**
   * Sprint 9: breakdown por clasificación de contenido del documento.
   * `failedMisclassified`: fallos cuyo documento es en realidad Código Fiscal
   * procedural (no una Impositiva). Son la señal accionable — el parser no
   * debe arreglarse, el crawler debería encontrar otra URL.
   */
  byKind: Record<OrdenanzaKind, number>;
  failedMisclassified: number;
}

export function summarize(attempts: ParseAttempt[], durationMs: number): BatchSummary {
  const byTarifa = { tsg: 0, tish: 0, rural: 0, construccion: 0 };
  const byKind: Record<OrdenanzaKind, number> = { IMPOSITIVA: 0, FISCAL: 0, UNKNOWN: 0 };
  let success = 0;
  let partial = 0;
  let failed = 0;
  let failedMisclassified = 0;
  for (const a of attempts) {
    if (a.success) success++;
    else failed++;
    const t = a.tarifasEncontradas;
    if (t.tsg) byTarifa.tsg++;
    if (t.tish) byTarifa.tish++;
    if (t.rural) byTarifa.rural++;
    if (t.construccion) byTarifa.construccion++;
    const any = t.tsg || t.tish || t.rural || t.construccion;
    if (any && !a.success) partial++;
    if (a.classification) {
      byKind[a.classification.kind]++;
      if (!a.success && a.classification.kind === "FISCAL") failedMisclassified++;
    }
  }
  return {
    total: attempts.length,
    success,
    partial,
    failed,
    durationMs,
    byTarifa,
    byKind,
    failedMisclassified,
  };
}

export function buildReport(attempts: ParseAttempt[], summary: BatchSummary): string {
  const lines: string[] = [];
  lines.push("# Batch parser de Ordenanzas Impositivas — reporte");
  lines.push("");
  lines.push(`**Fecha:** ${new Date().toISOString()}`);
  lines.push(`**Duración total:** ${(summary.durationMs / 1000).toFixed(1)}s`);
  lines.push("");
  lines.push("## Resumen");
  lines.push("");
  lines.push("| Métrica | Valor |");
  lines.push("|---|---:|");
  lines.push(`| Targets | ${summary.total} |`);
  lines.push(`| Parseados OK | ${summary.success} |`);
  lines.push(`| Parciales (alguna tarifa) | ${summary.partial} |`);
  lines.push(`| Fallidos | ${summary.failed} |`);
  lines.push(`| Fallidos + doc es Código Fiscal (crawler gap) | ${summary.failedMisclassified} |`);
  lines.push("");
  lines.push("### Tarifas encontradas por tipo");
  lines.push("");
  lines.push("| Tarifa | Cantidad |");
  lines.push("|---|---:|");
  lines.push(`| TSG / ABL | ${summary.byTarifa.tsg} |`);
  lines.push(`| TISH | ${summary.byTarifa.tish} |`);
  lines.push(`| Tasa Vial Rural | ${summary.byTarifa.rural} |`);
  lines.push(`| Derecho Construcción | ${summary.byTarifa.construccion} |`);
  lines.push("");
  lines.push("### Clasificación por contenido (Sprint 9)");
  lines.push("");
  lines.push(
    "Cada doc descargado se clasifica por heurística de contenido. `FISCAL` = Código procedural (no tiene tarifas); `IMPOSITIVA` = Ordenanza tarifaria real; `UNKNOWN` = señales débiles o extracción rota.",
  );
  lines.push("");
  lines.push("| Kind | Cantidad |");
  lines.push("|---|---:|");
  lines.push(`| IMPOSITIVA | ${summary.byKind.IMPOSITIVA} |`);
  lines.push(`| FISCAL | ${summary.byKind.FISCAL} |`);
  lines.push(`| UNKNOWN | ${summary.byKind.UNKNOWN} |`);
  lines.push("");
  lines.push("## Detalle por municipio");
  lines.push("");
  lines.push("| Municipio | OK | Kind | Score | TSG | TISH | Rural | Construcción | Año | Error / warning |");
  lines.push("|---|---|---|---:|---|---|---|---|---|---|");
  for (const a of attempts) {
    const t = a.tarifasEncontradas;
    const mk = (b: boolean) => (b ? "✓" : "—");
    const err = a.error ?? a.warnings[0] ?? "";
    const kind = a.classification?.kind ?? "—";
    const score = a.classification ? a.classification.score.toFixed(2) : "—";
    lines.push(
      `| ${a.target.nombre} (${a.target.municipioId}) | ${a.success ? "✓" : "✗"} | ${kind} | ${score} | ${mk(t.tsg)} | ${mk(t.tish)} | ${mk(t.rural)} | ${mk(t.construccion)} | ${a.anioFiscal ?? "?"} | ${err.slice(0, 120)} |`,
    );
  }

  // Sección accionable: fallos cuyo documento es Código Fiscal procedural.
  // Estos NO son bugs del parser — son bugs del crawler/auditor: la URL
  // apunta al doc equivocado. La mitigación vive en ingest, no acá.
  const misclassified = attempts.filter(
    (a) => !a.success && a.classification?.kind === "FISCAL",
  );
  if (misclassified.length > 0) {
    lines.push("");
    lines.push("## Documentos mal clasificados por el crawler (no es bug del parser)");
    lines.push("");
    lines.push(
      "Estos municipios tienen una URL publicada como ORDENANZA_FISCAL/IMPOSITIVA, pero el contenido real es Código Fiscal procedural (define infracciones, prescripción, domicilio fiscal) — no una Ordenanza Impositiva tarifaria. El fix está aguas arriba: el crawler/auditor debería buscar la Ordenanza Impositiva/Tarifaria separada.",
    );
    lines.push("");
    lines.push("| Municipio | Score | Señales pro-FISCAL dominantes | URL |");
    lines.push("|---|---:|---|---|");
    for (const a of misclassified) {
      const top = Object.entries(a.classification!.signals.negativeHits)
        .sort(([, x], [, y]) => y - x)
        .slice(0, 3)
        .map(([k, n]) => `${k}×${n}`)
        .join(", ");
      lines.push(
        `| ${a.target.nombre} (${a.target.municipioId}) | ${a.classification!.score.toFixed(2)} | ${top || "—"} | ${a.target.url} |`,
      );
    }
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────
// CLI
// ─────────────────────────────────────────

export interface CliOptions {
  auditPaths: string[];
  outputPath: string;
  reportPath: string;
  limit: number | null;
  concurrency: number;
  timeoutMs: number;
  dryRun: boolean;
}

export function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const audit = args[args.indexOf("--audit") + 1];
  if (!audit || audit.startsWith("--")) {
    throw new Error(
      "--audit <path-to-auto-audit.json> es requerido (repetible: --audit X --audit Y)",
    );
  }
  const auditPaths: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--audit" && args[i + 1] && !args[i + 1].startsWith("--")) {
      auditPaths.push(args[i + 1]);
      i++;
    }
  }
  const outIdx = args.indexOf("--output");
  const outputPath = outIdx !== -1
    ? args[outIdx + 1]
    : "../web/src/data/auto-presion-impositiva.json";
  const reportIdx = args.indexOf("--report");
  const reportPath = reportIdx !== -1
    ? args[reportIdx + 1]
    : "./output/batch-ordenanzas-report.md";
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) : null;
  if (limit !== null && (!Number.isFinite(limit) || limit <= 0)) {
    throw new Error("--limit debe ser entero positivo");
  }
  const cIdx = args.indexOf("--concurrency");
  const concurrency = cIdx !== -1 ? Number(args[cIdx + 1]) : 2;
  if (!Number.isFinite(concurrency) || concurrency < 1 || concurrency > 10) {
    throw new Error("--concurrency debe estar en [1, 10]");
  }
  const toIdx = args.indexOf("--timeout-ms");
  // Sprint 8: el parser ahora reintenta con backoff (1 + 2 = 3 intentos, 60s c/u).
  // El timeout del batch es un techo *global* por URL; lo subimos a 120s para
  // dejar espacio a al menos 1 retry (60s + 1s backoff + 60s).
  const timeoutMs = toIdx !== -1 ? Number(args[toIdx + 1]) : 120_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
    throw new Error("--timeout-ms >= 1000");
  }
  return {
    auditPaths,
    outputPath,
    reportPath,
    limit,
    concurrency,
    timeoutMs,
    dryRun: args.includes("--dry-run"),
  };
}

async function main() {
  const opt = parseArgs(process.argv);

  // Cargar + mergear auditorías (pilot primero, auto segundo)
  const merged: PilotAuditData = [];
  for (const p of opt.auditPaths) {
    const abs = resolve(p);
    const entries = JSON.parse(readFileSync(abs, "utf-8")) as PilotAuditData;
    merged.push(...entries);
    console.log(`📥 Cargado ${entries.length} entries desde ${abs}`);
  }

  let targets = extractOrdenanzaTargets(merged, MUNICIPIOS);
  if (opt.limit !== null) targets = targets.slice(0, opt.limit);

  console.log(`🎯 Targets con ordenanza impositiva/fiscal + url: ${targets.length}`);

  if (opt.dryRun) {
    console.log(`\n[DRY RUN] Primeros targets:\n`);
    for (const t of targets.slice(0, 10)) {
      console.log(`  · ${t.nombre.padEnd(30)} (${t.municipioId})`);
      console.log(`    ${t.url}`);
    }
    console.log(`\n(Total: ${targets.length}. Omitida la descarga.)`);
    return;
  }

  const start = Date.now();
  const attempts = await runBatch(targets, {
    concurrency: opt.concurrency,
    timeoutMs: opt.timeoutMs,
  }, (a, i, total) => {
    const mk = (b: boolean) => (b ? "✓" : "—");
    const t = a.tarifasEncontradas;
    const err = a.error ? ` [${a.error.slice(0, 50)}]` : "";
    console.log(
      `  [${String(i).padStart(3)}/${total}] ${a.success ? "✓" : "✗"} ${a.target.nombre.padEnd(28)} TSG:${mk(t.tsg)} TISH:${mk(t.tish)} RUR:${mk(t.rural)} CONS:${mk(t.construccion)} (${a.durationMs}ms)${err}`,
    );
  });
  const durationMs = Date.now() - start;
  const summary = summarize(attempts, durationMs);

  // Materializar como PresionImpositivaData[] — solo los que el parser marcó success
  // Sprint 14: además, filtrar docs clasificados como FISCAL (Código procedural).
  // Aunque el parser haya devuelto success=true (alguna tarifa matcheó), el
  // contenido es procedural y casi seguro un falso positivo. Cañuelas fue el
  // canario en Sprint 13 (matcheó "(2%)" de un recargo); la regex se tightening
  // resolvió ese caso, pero la defensa en profundidad evita que futuros
  // matches en Códigos Fiscales contaminen el output. UNKNOWN y null pasan.
  const data: PresionImpositivaData[] = [];
  for (const a of attempts) {
    if (!a.success) continue;
    if (a.classification?.kind === "FISCAL") continue;
    const d = attemptToPresionImpositivaData(a);
    if (d) data.push(d);
  }

  const outAbs = resolve(opt.outputPath);
  mkdirSync(dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, JSON.stringify(data, null, 2), "utf-8");

  const reportAbs = resolve(opt.reportPath);
  mkdirSync(dirname(reportAbs), { recursive: true });
  writeFileSync(reportAbs, buildReport(attempts, summary), "utf-8");

  console.log(`\n📊 Resumen:`);
  console.log(`   · Targets:       ${summary.total}`);
  console.log(`   · Success:       ${summary.success}`);
  console.log(`   · Parciales:     ${summary.partial}`);
  console.log(`   · Fallidos:      ${summary.failed}`);
  console.log(`   · Tarifas TSG:   ${summary.byTarifa.tsg}`);
  console.log(`   · Tarifas TISH:  ${summary.byTarifa.tish}`);
  console.log(`   · Tarifas Rural: ${summary.byTarifa.rural}`);
  console.log(`   · Tarifas Cons.: ${summary.byTarifa.construccion}`);
  console.log(`   · Duración:      ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`\n💾 Data: ${outAbs}`);
  console.log(`💾 Reporte: ${reportAbs}`);
}

// Ejecuta main() solo si este archivo es el entrypoint (no en tests).
const invokedAs = process.argv[1] ?? "";
const isMain = invokedAs.endsWith("batch-parse-ordenanzas.ts");
if (isMain) {
  main().catch((e) => {
    console.error("Error fatal:", e);
    process.exitCode = 1;
  });
}
