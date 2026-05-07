#!/usr/bin/env tsx
/**
 * Convierte el output de `crawl:all-135` (`crawl-all-135.json`) en un
 * `auto-audit.json` con forma `PilotAuditEntry[]` — el mismo schema que
 * usan los 13 piloto manuales.
 *
 * Esto permite que `packages/web/src/lib/scoring-data/loaders.ts` mezcle
 * los datos crawled con los piloto y calcule cobertura real sobre los 135.
 *
 * Reglas de mapeo:
 *   - Solo se emiten entries para municipios con `outcome.kind === "OK"` y
 *     `crawl.sitioOnline === true`. Los offline/bloqueados quedan fuera
 *     (no suman ni a favor ni en contra; el seed ya los tiene null).
 *   - Por municipio se produce UN DocumentAudit por cada categoría fiscal
 *     (PRESUPUESTO, EJECUCION, SEF, DEUDA, FINALIDAD_FUNCION): si el crawler
 *     detectó doc → publicado:true con url/metadata; si no → publicado:false.
 *   - `--exclude-piloto` (default true) descarta los 13 piloto para no pisar
 *     el JSON curado a mano.
 *   - `auditor` queda marcado como "crawler-automatico" para diferenciar.
 *
 * Uso:
 *   pnpm ingest:crawl-audit -- --input ./output/crawl-all-135-full/crawl-all-135.json
 *   pnpm ingest:crawl-audit -- --input X --output ../web/src/data/auto-audit.json
 *   pnpm ingest:crawl-audit -- --input X --include-piloto  # incluir los 13
 *   pnpm ingest:crawl-audit -- --input X --dry-run         # no escribe
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  DocumentCategory,
  DocumentFormat,
  type PilotAuditEntry,
  type DocumentAudit,
  type AccessibilityAudit,
} from "@radar-municipal/core";

// ─────────────────────────────────────────
// Types: shape del crawl-all-135.json
// ─────────────────────────────────────────

/**
 * Shape mínima que consumimos del crawl JSON — NO importamos el tipo
 * completo del scraper CLI para que este módulo sea puramente I/O-agnostic.
 * El JSON es un snapshot en disco; si cambia el schema del crawler,
 * este mapper debe adaptarse acá.
 */
interface CrawlEntryJson {
  municipioId: string;
  nombre: string;
  partido: string;
  esPiloto: boolean;
  urlOficial: string | null;
  outcome:
    | {
        kind: "OK";
        crawl: {
          municipioId: string;
          fechaCrawl: string;
          sitioOnline: boolean;
          accesibilidad: {
            urlPortal: string | null;
            portalAccesible: boolean;
            clicksDesdeHome: number | null;
            menuTransparenciaVisible: boolean;
          };
          documentos: Array<{
            categoria: string;
            url: string;
            formato: string | null;
            textoContexto: string;
            esParseable: boolean | null;
            anioDetectado: number | null;
            trimestreDetectado: number | null;
          }>;
        };
      }
    | { kind: "SIN_URL"; razon: string }
    | { kind: "ERROR"; error: string };
}

// ─────────────────────────────────────────
// Mapper puro
// ─────────────────────────────────────────

/**
 * Categorías que incluimos en el audit. Paridad con pilot-audit.json
 * (6 categorías originales) + ORDENANZA_IMPOSITIVA derivada.
 * SEF no se consume directamente en scoring pero sí se visualiza en UI.
 *
 * ORDENANZA_IMPOSITIVA se deriva en el mapper: el crawler agrupa todo como
 * ORDENANZA_FISCAL, pero por el patrón del nombre del archivo (URL con
 * "impositiv" o "tarifari") distinguimos la subcategoría narrow que usa
 * el parser batch de tarifas.
 */
const AUDIT_CATEGORIES: DocumentCategory[] = [
  DocumentCategory.PRESUPUESTO,
  DocumentCategory.EJECUCION,
  DocumentCategory.SEF,
  DocumentCategory.DEUDA,
  DocumentCategory.FINALIDAD_FUNCION,
  DocumentCategory.ORDENANZA_FISCAL,
  DocumentCategory.ORDENANZA_IMPOSITIVA,
];

/** Un URL que menciona "impositiv" o "tarifari" se asume ordenanza impositiva. */
const IMPOSITIVA_URL_RE = /impositiv|tarifari/i;

function toDocumentFormat(raw: string | null): DocumentFormat | null {
  if (!raw) return null;
  const up = raw.toUpperCase();
  if (up in DocumentFormat) return DocumentFormat[up as keyof typeof DocumentFormat];
  return null;
}

/**
 * Convierte un CrawlEntryJson en PilotAuditEntry.
 * Devuelve null si no se debe emitir (offline/sin-url/error).
 */
export function crawlEntryToAudit(
  entry: CrawlEntryJson,
  opt: { excludePiloto: boolean },
): PilotAuditEntry | null {
  if (opt.excludePiloto && entry.esPiloto) return null;
  if (entry.outcome.kind !== "OK") return null;
  const { crawl } = entry.outcome;
  if (!crawl.sitioOnline) return null;

  const accesibilidad: AccessibilityAudit = {
    urlPortal: crawl.accesibilidad.urlPortal,
    portalAccesible: crawl.accesibilidad.portalAccesible,
    clicksDesdeHome: crawl.accesibilidad.clicksDesdeHome,
    menuTransparenciaVisible: crawl.accesibilidad.menuTransparenciaVisible,
  };

  /**
   * Para ORDENANZA_IMPOSITIVA: el crawler no la emite como categoría propia —
   * la derivamos buscando entre los docs ORDENANZA_FISCAL un URL que matchee
   * `IMPOSITIVA_URL_RE`. Preferimos el más reciente (anio detectado más alto).
   *
   * Para ORDENANZA_FISCAL (broad): primero intentamos un URL que NO sea
   * impositiva (el código fiscal propiamente dicho); si no existe, caemos al
   * primer match de la categoría. Esto mantiene el señalamiento de
   * transparencia (hay alguna ordenanza fiscal publicada) incluso cuando el
   * único doc es una impositiva.
   */
  type CrawlDoc = (typeof crawl.documentos)[number];

  const fiscalDocs = crawl.documentos.filter((d) => d.categoria === "ORDENANZA_FISCAL");
  const impositivaDocs = fiscalDocs.filter((d) => IMPOSITIVA_URL_RE.test(d.url));
  const pureFiscalDocs = fiscalDocs.filter((d) => !IMPOSITIVA_URL_RE.test(d.url));

  const pickMostRecent = (docs: CrawlDoc[]): CrawlDoc | undefined =>
    docs.length === 0
      ? undefined
      : [...docs].sort((a, b) => (b.anioDetectado ?? 0) - (a.anioDetectado ?? 0))[0];

  const pickForCategory = (cat: DocumentCategory): CrawlDoc | undefined => {
    if (cat === DocumentCategory.ORDENANZA_IMPOSITIVA) {
      return pickMostRecent(impositivaDocs);
    }
    if (cat === DocumentCategory.ORDENANZA_FISCAL) {
      return pickMostRecent(pureFiscalDocs) ?? pickMostRecent(fiscalDocs);
    }
    return crawl.documentos.find((d) => d.categoria === cat);
  };

  const documentos: DocumentAudit[] = AUDIT_CATEGORIES.map((categoria) => {
    const doc = pickForCategory(categoria);
    if (!doc) {
      return {
        categoria,
        publicado: false,
        url: null,
        formato: null,
        anio: null,
        trimestre: null,
        fechaPublicacion: null,
        fechaCorte: null,
        esParseable: false,
        notas: null,
      };
    }
    return {
      categoria,
      publicado: true,
      url: doc.url,
      formato: toDocumentFormat(doc.formato),
      anio: doc.anioDetectado,
      trimestre: doc.trimestreDetectado,
      // El crawler no infiere fechas de publicación/corte del HTML —
      // las marcamos null y quedarán para auditoría manual / parse RAFAM.
      fechaPublicacion: null,
      fechaCorte: null,
      esParseable: doc.esParseable ?? false,
      notas: doc.textoContexto || null,
    };
  });

  return {
    municipioId: entry.municipioId,
    // fechaCrawl viene como ISO datetime; auditamos como YYYY-MM-DD
    fechaAuditoria: crawl.fechaCrawl.slice(0, 10),
    auditor: "crawler-automatico",
    accesibilidad,
    documentos,
  };
}

export interface MapSummary {
  inputTotal: number;
  emitted: number;
  skippedPiloto: number;
  skippedOffline: number;
  skippedSinUrl: number;
  skippedError: number;
}

export function mapCrawlJsonToAudit(
  entries: CrawlEntryJson[],
  opt: { excludePiloto: boolean },
): { audit: PilotAuditEntry[]; summary: MapSummary } {
  const audit: PilotAuditEntry[] = [];
  const s: MapSummary = {
    inputTotal: entries.length,
    emitted: 0,
    skippedPiloto: 0,
    skippedOffline: 0,
    skippedSinUrl: 0,
    skippedError: 0,
  };
  for (const e of entries) {
    if (opt.excludePiloto && e.esPiloto) {
      s.skippedPiloto++;
      continue;
    }
    if (e.outcome.kind === "SIN_URL") {
      s.skippedSinUrl++;
      continue;
    }
    if (e.outcome.kind === "ERROR") {
      s.skippedError++;
      continue;
    }
    if (!e.outcome.crawl.sitioOnline) {
      s.skippedOffline++;
      continue;
    }
    const mapped = crawlEntryToAudit(e, opt);
    if (mapped) {
      audit.push(mapped);
      s.emitted++;
    }
  }
  return { audit, summary: s };
}

// ─────────────────────────────────────────
// CLI
// ─────────────────────────────────────────

export interface CliOptions {
  inputPath: string;
  outputPath: string;
  excludePiloto: boolean;
  dryRun: boolean;
}

export function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const input = args[args.indexOf("--input") + 1];
  if (!input || input.startsWith("--")) {
    throw new Error("--input <path-to-crawl-all-135.json> es requerido");
  }
  const outIdx = args.indexOf("--output");
  const output = outIdx !== -1 ? args[outIdx + 1] : "../web/src/data/auto-audit.json";
  return {
    inputPath: input,
    outputPath: output,
    excludePiloto: !args.includes("--include-piloto"),
    dryRun: args.includes("--dry-run"),
  };
}

function main() {
  const opt = parseArgs(process.argv);
  const inputAbs = resolve(opt.inputPath);
  const outputAbs = resolve(opt.outputPath);

  const raw = JSON.parse(readFileSync(inputAbs, "utf-8")) as CrawlEntryJson[];
  const { audit, summary } = mapCrawlJsonToAudit(raw, {
    excludePiloto: opt.excludePiloto,
  });

  console.log(`📥 Input: ${inputAbs}`);
  console.log(`   · Records leídos: ${summary.inputTotal}`);
  console.log(`   · Emitidos: ${summary.emitted}`);
  console.log(`   · Skip piloto: ${summary.skippedPiloto}`);
  console.log(`   · Skip offline: ${summary.skippedOffline}`);
  console.log(`   · Skip sin-url: ${summary.skippedSinUrl}`);
  console.log(`   · Skip error: ${summary.skippedError}`);

  // Conteo de docs publicados por categoría (sanity check)
  const byCat = new Map<string, number>();
  for (const a of audit) {
    for (const d of a.documentos) {
      if (d.publicado) byCat.set(d.categoria, (byCat.get(d.categoria) ?? 0) + 1);
    }
  }
  console.log(`\n📊 Documentos publicados por categoría:`);
  for (const [cat, n] of byCat) console.log(`   · ${cat}: ${n}`);

  if (opt.dryRun) {
    console.log(`\n[DRY RUN] No se escribió ${outputAbs}`);
    return;
  }

  mkdirSync(dirname(outputAbs), { recursive: true });
  writeFileSync(outputAbs, JSON.stringify(audit, null, 2), "utf-8");
  console.log(`\n✅ Escrito: ${outputAbs}`);
}

// Ejecuta main() solo si este archivo es el entrypoint (no en tests).
// Usamos process.argv[1] (ruta del script invocado) en vez de import.meta.url,
// porque import.meta.url siempre matchea el nombre del módulo — incluso en tests.
const invokedAs = process.argv[1] ?? "";
const isMain = invokedAs.endsWith("ingest-crawl-to-audit.ts");
if (isMain) {
  main();
}
