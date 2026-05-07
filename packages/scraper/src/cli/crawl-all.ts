#!/usr/bin/env tsx
/**
 * CLI: Crawl completo de todos los municipios piloto.
 *
 * Ejecuta:
 * 1. Crawl de portales de transparencia
 * 2. Scraping de SIBOM
 * 3. Normalización y merge con datos existentes
 * 4. Cálculo de scores
 * 5. Genera pilot-audit.json actualizado
 *
 * Uso:
 *   pnpm --filter @radar-municipal/scraper crawl:all
 *   pnpm --filter @radar-municipal/scraper crawl:all -- --visible --output ./output
 *   pnpm --filter @radar-municipal/scraper crawl:all -- --merge-with ../../data/pilot-audit.json
 */

import {
  MUNICIPIOS_PILOTO,
  type PilotAuditEntry,
  type PilotAuditData,
} from "@radar-municipal/core";
import { crawlTransparencyPortal } from "../crawlers/transparency-crawler";
import { scrapeSibom } from "../crawlers/sibom-scraper";
import {
  normalizeToPilotAudit,
  mergeAudits,
} from "../normalizers/audit-normalizer";
import {
  calculateTransparencyScore,
} from "@radar-municipal/scoring";
import type { CrawlTarget, CrawlResult, SibomResult } from "../types";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

interface RunResult {
  municipioId: string;
  nombre: string;
  crawlResult: CrawlResult;
  sibomResult: SibomResult;
  audit: PilotAuditEntry;
  score: number;
}

async function main() {
  const args = process.argv.slice(2);
  const visibleMode = args.includes("--visible");
  const outputIndex = args.indexOf("--output");
  const outputDir = outputIndex !== -1 ? args[outputIndex + 1] : "./output";
  const mergeIndex = args.indexOf("--merge-with");
  const mergeFile = mergeIndex !== -1 ? args[mergeIndex + 1] : null;

  mkdirSync(resolve(outputDir), { recursive: true });

  // Cargar auditoría manual para merge si existe
  let manualAudits: Map<string, PilotAuditEntry> | null = null;
  if (mergeFile && existsSync(mergeFile)) {
    const data = JSON.parse(readFileSync(mergeFile, "utf-8")) as PilotAuditData;
    manualAudits = new Map(data.map((a) => [a.municipioId, a]));
    console.log(`📋 Cargada auditoría manual con ${manualAudits.size} municipios para merge`);
  }

  const pilotos = MUNICIPIOS_PILOTO.filter((m) => m.urlOficial);
  console.log(`\n🚀 Iniciando crawl completo de ${pilotos.length} municipios piloto`);
  console.log(`   Modo: ${visibleMode ? "visible" : "headless"}`);
  console.log(`   Output: ${resolve(outputDir)}\n`);

  const results: RunResult[] = [];
  const errors: { nombre: string; error: string }[] = [];

  for (let i = 0; i < pilotos.length; i++) {
    const m = pilotos[i];
    console.log(
      `\n[${ i + 1}/${pilotos.length}] 🔍 ${m.nombre} (${m.id})`
    );
    console.log(`   URL: ${m.urlOficial}`);

    const target: CrawlTarget = {
      municipioId: m.id,
      nombre: m.nombre,
      urlOficial: m.urlOficial!,
    };

    try {
      // 1. Crawl del portal de transparencia
      console.log(`   → Crawling portal...`);
      const crawlResult = await crawlTransparencyPortal(target, {
        headless: !visibleMode,
      });

      console.log(
        `     Sitio: ${crawlResult.sitioOnline ? "✅" : "❌"} | ` +
          `Docs: ${crawlResult.documentos.length} | ` +
          `Páginas: ${crawlResult.paginasVisitadas} | ` +
          `${crawlResult.duracionMs}ms`
      );

      if (crawlResult.accesibilidad.menuTransparenciaVisible) {
        console.log(`     ✅ Menú transparencia detectado`);
      }

      // 2. Scraping de SIBOM
      console.log(`   → Scrapeando SIBOM...`);
      const sibomResult = await scrapeSibom(m.id, m.nombre);
      console.log(
        `     Normas: ${sibomResult.normasEncontradas} | ` +
          `Ord. fiscal: ${sibomResult.ordenanzaFiscalVigente ? "✅" : "❌"}`
      );

      // 3. Normalizar
      let audit = normalizeToPilotAudit(crawlResult, sibomResult);

      // 4. Merge con manual si disponible
      const manualAudit = manualAudits?.get(m.id);
      if (manualAudit) {
        audit = mergeAudits(manualAudit, audit);
        console.log(`     📋 Mergeado con auditoría manual`);
      }

      // 5. Calcular score
      const score = calculateTransparencyScore(audit);
      console.log(`     🏆 Score: ${score.scoreTotal.toFixed(1)} / 100`);

      results.push({
        municipioId: m.id,
        nombre: m.nombre,
        crawlResult,
        sibomResult,
        audit,
        score: score.scoreTotal,
      });

      // Guardar resultado individual
      writeFileSync(
        resolve(outputDir, `crawl-${m.id}.json`),
        JSON.stringify(crawlResult, null, 2)
      );

      // Rate limiting entre municipios
      if (i < pilotos.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      const error = (err as Error).message;
      console.log(`     ❌ Error: ${error}`);
      errors.push({ nombre: m.nombre, error });
    }
  }

  // ─────────────────────────────────────────
  // Generar output final
  // ─────────────────────────────────────────

  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 RESUMEN DEL CRAWL`);
  console.log(`${"═".repeat(60)}`);

  // Ranking
  const sorted = [...results].sort((a, b) => b.score - a.score);
  console.log(`\n🏆 Ranking de transparencia:\n`);
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const badge =
      r.score >= 70 ? "🟢" : r.score >= 40 ? "🟡" : "🔴";
    console.log(
      `   ${String(i + 1).padStart(2)}. ${badge} ${r.nombre.padEnd(25)} ${r.score.toFixed(1)}`
    );
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errores (${errors.length}):`);
    for (const e of errors) {
      console.log(`   ${e.nombre}: ${e.error}`);
    }
  }

  // Guardar audit combinado
  const allAudits: PilotAuditData = results.map((r) => r.audit);
  const auditOutputFile = resolve(outputDir, "pilot-audit-scraped.json");
  writeFileSync(auditOutputFile, JSON.stringify(allAudits, null, 2));
  console.log(`\n💾 Audit combinado: ${auditOutputFile}`);

  // Guardar resultados crudos
  const rawResults = results.map(({ crawlResult, sibomResult, score, nombre }) => ({
    nombre,
    score,
    crawl: {
      sitioOnline: crawlResult.sitioOnline,
      documentos: crawlResult.documentos.length,
      paginasVisitadas: crawlResult.paginasVisitadas,
      menuTransparencia: crawlResult.accesibilidad.menuTransparenciaVisible,
      duracionMs: crawlResult.duracionMs,
    },
    sibom: {
      normas: sibomResult.normasEncontradas,
      ordenanzaFiscal: !!sibomResult.ordenanzaFiscalVigente,
    },
  }));
  const summaryFile = resolve(outputDir, "crawl-summary.json");
  writeFileSync(summaryFile, JSON.stringify(rawResults, null, 2));
  console.log(`💾 Resumen: ${summaryFile}`);

  console.log(`\n✅ Crawl completo finalizado.`);
  console.log(
    `   ${results.length} exitosos, ${errors.length} fallidos`
  );
}

main().catch((err) => {
  console.error("\n💥 Error fatal:", err);
  process.exit(1);
});
