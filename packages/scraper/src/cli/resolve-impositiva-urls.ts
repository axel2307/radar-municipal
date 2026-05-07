#!/usr/bin/env tsx
/**
 * Sprint 10: re-resolución targeted de URLs de Ordenanza Impositiva.
 *
 * Input: `auto-audit.json` + lista de municipioIds cuya URL actual fue
 * marcada como FISCAL por el classifier de Sprint 9. Para cada uno:
 *
 *   1. Resuelve la URL oficial del municipio desde el seed de `core/MUNICIPIOS`.
 *   2. Hace `fetch()` de esa home page.
 *   3. Extrae candidatos a Ordenanza Impositiva con `extractOrdenanzaCandidates`
 *      (ranking heurístico por filename + anchor).
 *   4. Para los top-N candidatos, descarga + parsea con
 *      `parseOrdenanzaImpositivaFromUrl` (reusa el pipeline de parser).
 *   5. Clasifica el texto extraído con `classifyOrdenanzaContent`.
 *   6. Selecciona el candidato mejor-clasificado como IMPOSITIVA, si alguno.
 *
 * Output: `resolve-impositiva-patch.json` con:
 *   [
 *     {
 *       "municipioId": "060126",
 *       "currentUrl": "https://.../OrdenanzaFiscal2025.pdf",
 *       "currentKind": "FISCAL",
 *       "newUrl": "https://.../ordenanza-impositiva-2025.pdf" | null,
 *       "newKind": "IMPOSITIVA" | "UNKNOWN" | null,
 *       "score": 0.77,
 *       "reasoning": "Candidato top tras clasificación de 3 evaluados"
 *     }
 *   ]
 *
 * Un segundo script (`apply-impositiva-patch.ts`) consume este JSON y
 * modifica `auto-audit.json` in-place.
 *
 * Uso:
 *   pnpm resolve:impositiva -- --audit ../web/src/data/auto-audit.json \
 *     --ids 060126,060134,060294,060378
 *   pnpm resolve:impositiva -- --audit X --ids Y --dry-run
 *   pnpm resolve:impositiva -- --audit X --ids Y --output ./output/patch.json
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  DocumentCategory,
  MUNICIPIOS,
  type PilotAuditData,
  type Municipio,
} from "@radar-municipal/core";
import { extractOrdenanzaCandidates } from "../url-resolver/ordenanza-finder";
import type { OrdenanzaCandidate } from "../url-resolver/ordenanza-finder";
import { parseOrdenanzaImpositivaFromUrl } from "../parsers/ordenanza-impositiva";
import {
  classifyOrdenanzaContent,
  type ClassificationResult,
  type OrdenanzaKind,
} from "../parsers/classify-ordenanza";

// ─────────────────────────────────────────
// Planning (puro)
// ─────────────────────────────────────────

export interface ResolveTarget {
  municipioId: string;
  nombre: string;
  portalUrl: string;
  currentUrl: string;
}

/**
 * Construye los targets a resolver. Para cada `municipioId` pasado:
 *   - Busca la entry en el audit; si no está, skip (reporta como warning).
 *   - Toma la primera URL de ORDENANZA_IMPOSITIVA o ORDENANZA_FISCAL publicada.
 *   - Resuelve portalUrl desde el seed de MUNICIPIOS.
 */
export function buildTargets(
  audit: PilotAuditData,
  ids: ReadonlyArray<string>,
  municipios: ReadonlyArray<Municipio>,
): { targets: ResolveTarget[]; warnings: string[] } {
  const warnings: string[] = [];
  const targets: ResolveTarget[] = [];

  for (const id of ids) {
    const entry = audit.find((e) => e.municipioId === id);
    if (!entry) {
      warnings.push(`${id}: no hay entry en audit`);
      continue;
    }
    const municipio = municipios.find((m) => m.id === id);
    if (!municipio?.urlOficial) {
      warnings.push(`${id}: sin urlOficial en seed de MUNICIPIOS`);
      continue;
    }
    const doc = entry.documentos.find(
      (d) =>
        (d.categoria === DocumentCategory.ORDENANZA_IMPOSITIVA ||
          d.categoria === DocumentCategory.ORDENANZA_FISCAL) &&
        d.publicado &&
        d.url,
    );
    if (!doc?.url) {
      warnings.push(`${id}: no hay URL de ordenanza en audit`);
      continue;
    }
    targets.push({
      municipioId: id,
      nombre: municipio.nombre,
      portalUrl: municipio.urlOficial,
      currentUrl: doc.url,
    });
  }

  return { targets, warnings };
}

// ─────────────────────────────────────────
// Execution (I/O)
// ─────────────────────────────────────────

export interface ResolveOptions {
  /** Top-N candidatos a verificar con clasificación de contenido. */
  topN: number;
  /** Timeout por fetch en ms. */
  timeoutMs: number;
  /** Inyección para tests. */
  fetchImpl?: typeof fetch;
}

export interface EvaluatedCandidate extends OrdenanzaCandidate {
  classification: ClassificationResult | null;
  /** Error del fetch/parse (null si ok). */
  error: string | null;
}

export interface ResolveResult {
  target: ResolveTarget;
  /** Candidatos descubiertos por el finder (ordenados por heurística). */
  candidates: OrdenanzaCandidate[];
  /** Candidatos evaluados con classifier (solo top-N). */
  evaluated: EvaluatedCandidate[];
  /** Mejor candidato según classifier, o null si ninguno clasifica IMPOSITIVA. */
  best: EvaluatedCandidate | null;
  /** Breve explicación para el reporte. */
  reasoning: string;
  durationMs: number;
}

/**
 * Fetch con timeout. Devuelve body como string. Maneja errores devolviendo
 * null — el caller decide qué hacer.
 *
 * Sprint 12: muchos portales municipales (Bahía Blanca, MdP, Azul, San Isidro)
 * tienen Cloudflare/WAF que bloquea User-Agents identificados como crawler/bot.
 * El run de Sprint 12 con UA "RadarMunicipal/1.0 (...crawler)" mostró 0/13
 * pilotos resueltos — 4 con "no se pudo obtener HTML". Volver a una UA de
 * navegador real desbloqueó al menos San Isidro en pruebas manuales.
 *
 * Mantenemos el "Accept: text/html" para señalar intención clara y evitar
 * que el server devuelva PDF u otro tipo cuando hay alternativa HTML.
 */
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchHtml(
  url: string,
  opt: ResolveOptions,
): Promise<string | null> {
  const fetchFn = opt.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), opt.timeoutMs);
  try {
    const resp = await fetchFn(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent": BROWSER_USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "es-AR,es;q=0.9,en;q=0.8",
      },
    });
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      // Probablemente PDF directo — no hay HTML para parsear.
      return null;
    }
    return await resp.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Resuelve un target: fetcha portal, extrae candidatos, descarga + clasifica
 * top-N, elige el mejor. No lanza: errores quedan en `reasoning`.
 */
export async function resolveOne(
  target: ResolveTarget,
  opt: ResolveOptions,
): Promise<ResolveResult> {
  const start = Date.now();
  const html = await fetchHtml(target.portalUrl, opt);
  if (!html) {
    return {
      target,
      candidates: [],
      evaluated: [],
      best: null,
      reasoning: `no se pudo obtener HTML de ${target.portalUrl}`,
      durationMs: Date.now() - start,
    };
  }

  const candidates = extractOrdenanzaCandidates(html, target.portalUrl);
  if (candidates.length === 0) {
    return {
      target,
      candidates: [],
      evaluated: [],
      best: null,
      reasoning: "portal no expone candidatos con keywords 'ordenanza'/'impositiva'",
      durationMs: Date.now() - start,
    };
  }

  // Excluir la currentUrl conocida como FISCAL — no nos interesa re-validar.
  const freshCandidates = candidates.filter((c) => c.url !== target.currentUrl);
  const toEvaluate = freshCandidates.slice(0, opt.topN);

  const evaluated: EvaluatedCandidate[] = [];
  for (const cand of toEvaluate) {
    try {
      const parseResult = await parseOrdenanzaImpositivaFromUrl(cand.url, {
        fechaAcceso: new Date().toISOString().slice(0, 10),
        retries: 1,
        timeoutMs: opt.timeoutMs,
      });
      const classification = parseResult.rawText
        ? classifyOrdenanzaContent(parseResult.rawText)
        : null;
      evaluated.push({ ...cand, classification, error: null });
    } catch (e) {
      evaluated.push({
        ...cand,
        classification: null,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const impositivas = evaluated.filter(
    (c) => c.classification?.kind === "IMPOSITIVA",
  );
  impositivas.sort(
    (a, b) => (b.classification?.score ?? 0) - (a.classification?.score ?? 0),
  );
  const best = impositivas[0] ?? null;

  const reasoning = best
    ? `mejor candidato: ${best.classification?.kind} score ${best.classification?.score} (evaluados ${evaluated.length})`
    : `ninguno de ${evaluated.length} candidatos evaluados clasificó como IMPOSITIVA`;

  return {
    target,
    candidates,
    evaluated,
    best,
    reasoning,
    durationMs: Date.now() - start,
  };
}

// ─────────────────────────────────────────
// Patch generation
// ─────────────────────────────────────────

export interface ImpositivaPatchEntry {
  municipioId: string;
  nombre: string;
  currentUrl: string;
  currentKind: OrdenanzaKind | null;
  newUrl: string | null;
  newKind: OrdenanzaKind | null;
  newScore: number | null;
  reasoning: string;
}

export function buildPatch(
  results: ReadonlyArray<ResolveResult>,
): ImpositivaPatchEntry[] {
  return results.map((r) => ({
    municipioId: r.target.municipioId,
    nombre: r.target.nombre,
    currentUrl: r.target.currentUrl,
    currentKind: "FISCAL", // por construcción: este CLI se llama contra FISCAL misclassified
    newUrl: r.best?.url ?? null,
    newKind: r.best?.classification?.kind ?? null,
    newScore: r.best?.classification?.score ?? null,
    reasoning: r.reasoning,
  }));
}

export function buildReport(results: ReadonlyArray<ResolveResult>): string {
  const lines: string[] = [];
  lines.push("# Resolve Impositiva URLs — reporte (Sprint 10)");
  lines.push("");
  lines.push(`**Fecha:** ${new Date().toISOString()}`);
  lines.push(`**Targets:** ${results.length}`);
  const withBest = results.filter((r) => r.best).length;
  lines.push(`**Con nuevo candidato IMPOSITIVA:** ${withBest}`);
  lines.push("");
  lines.push("## Por municipio");
  lines.push("");
  for (const r of results) {
    lines.push(`### ${r.target.nombre} (${r.target.municipioId})`);
    lines.push("");
    lines.push(`- Portal: ${r.target.portalUrl}`);
    lines.push(`- URL actual (FISCAL): ${r.target.currentUrl}`);
    lines.push(`- Candidatos descubiertos: ${r.candidates.length}`);
    lines.push(`- Evaluados con classifier: ${r.evaluated.length}`);
    if (r.best) {
      lines.push(`- ✓ **Nuevo candidato**: ${r.best.url}`);
      lines.push(`  - Kind: ${r.best.classification?.kind} score ${r.best.classification?.score}`);
      lines.push(`  - Heurística finder: ${r.best.score} (${r.best.reasons.join(", ")})`);
    } else {
      lines.push(`- ✗ Sin candidato IMPOSITIVA: ${r.reasoning}`);
    }
    if (r.evaluated.length > 0) {
      lines.push("");
      lines.push("  Candidatos evaluados:");
      for (const e of r.evaluated) {
        const k = e.classification
          ? `${e.classification.kind} (${e.classification.score})`
          : e.error ?? "sin clasificar";
        lines.push(`  - [${e.score}] ${e.url} → ${k}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ─────────────────────────────────────────
// CLI
// ─────────────────────────────────────────

export interface CliOptions {
  auditPath: string;
  ids: string[];
  outputPatch: string;
  outputReport: string;
  topN: number;
  timeoutMs: number;
  dryRun: boolean;
}

export function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const auditIdx = args.indexOf("--audit");
  if (auditIdx === -1 || !args[auditIdx + 1]) {
    throw new Error("--audit <path-to-auto-audit.json> es requerido");
  }
  const idsIdx = args.indexOf("--ids");
  if (idsIdx === -1 || !args[idsIdx + 1]) {
    throw new Error("--ids <csv-de-municipioIds> es requerido (ej. 060126,060134)");
  }
  const ids = args[idsIdx + 1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) throw new Error("--ids debe tener al menos 1 valor");

  const outIdx = args.indexOf("--output");
  const outputPatch =
    outIdx !== -1 ? args[outIdx + 1] : "./output/resolve-impositiva-patch.json";

  const repIdx = args.indexOf("--report");
  const outputReport =
    repIdx !== -1 ? args[repIdx + 1] : "./output/resolve-impositiva-report.md";

  const topNIdx = args.indexOf("--top-n");
  const topN = topNIdx !== -1 ? Number(args[topNIdx + 1]) : 5;
  if (!Number.isFinite(topN) || topN < 1 || topN > 20) {
    throw new Error("--top-n debe estar en [1, 20]");
  }

  const toIdx = args.indexOf("--timeout-ms");
  const timeoutMs = toIdx !== -1 ? Number(args[toIdx + 1]) : 30_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
    throw new Error("--timeout-ms >= 1000");
  }

  return {
    auditPath: args[auditIdx + 1],
    ids,
    outputPatch,
    outputReport,
    topN,
    timeoutMs,
    dryRun: args.includes("--dry-run"),
  };
}

async function main() {
  const opt = parseArgs(process.argv);
  const auditAbs = resolve(opt.auditPath);
  const audit = JSON.parse(readFileSync(auditAbs, "utf-8")) as PilotAuditData;

  const { targets, warnings } = buildTargets(audit, opt.ids, MUNICIPIOS);
  console.log(`🎯 Targets a resolver: ${targets.length}`);
  for (const w of warnings) console.warn(`  ⚠ ${w}`);

  if (opt.dryRun) {
    console.log("\n[DRY RUN] Targets planeados:");
    for (const t of targets) {
      console.log(`  · ${t.nombre} (${t.municipioId})`);
      console.log(`    portal:  ${t.portalUrl}`);
      console.log(`    actual:  ${t.currentUrl}`);
    }
    return;
  }

  const results: ResolveResult[] = [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    console.log(
      `\n[${i + 1}/${targets.length}] Resolviendo ${t.nombre} (${t.municipioId})…`,
    );
    const r = await resolveOne(t, { topN: opt.topN, timeoutMs: opt.timeoutMs });
    results.push(r);
    if (r.best) {
      console.log(
        `  ✓ Nuevo: ${r.best.url} [${r.best.classification?.kind} ${r.best.classification?.score}]`,
      );
    } else {
      console.log(`  ✗ ${r.reasoning}`);
    }
    console.log(`  · ${r.candidates.length} candidatos, ${r.evaluated.length} evaluados, ${r.durationMs}ms`);
  }

  const patch = buildPatch(results);
  const patchAbs = resolve(opt.outputPatch);
  mkdirSync(dirname(patchAbs), { recursive: true });
  writeFileSync(patchAbs, JSON.stringify(patch, null, 2));

  const reportAbs = resolve(opt.outputReport);
  mkdirSync(dirname(reportAbs), { recursive: true });
  writeFileSync(reportAbs, buildReport(results));

  const withBest = patch.filter((p) => p.newUrl).length;
  console.log(`\n📊 Resumen:`);
  console.log(`   · Resueltos con nuevo URL: ${withBest}/${patch.length}`);
  console.log(`\n💾 Patch: ${patchAbs}`);
  console.log(`💾 Reporte: ${reportAbs}`);
}

const invokedAs = process.argv[1] ?? "";
const isMain = invokedAs.endsWith("resolve-impositiva-urls.ts");
if (isMain) {
  main().catch((e) => {
    console.error("Error fatal:", e);
    process.exitCode = 1;
  });
}
