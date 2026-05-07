#!/usr/bin/env tsx
/**
 * CLI: Crawl completo con escritura a DB.
 *
 * Ejecuta crawl de portales municipales y escribe resultados
 * directamente en PostgreSQL, combinando scraper + ingestion.
 *
 * Uso:
 *   pnpm --filter @radar-municipal/ingestion crawl:db
 *   pnpm --filter @radar-municipal/ingestion crawl:db -- --visible
 *   pnpm --filter @radar-municipal/ingestion crawl:db -- --all-municipios
 *   pnpm --filter @radar-municipal/ingestion crawl:db -- --ids 060056,060357
 */

import { DataField } from "@radar-municipal/core";
import { createDb } from "@radar-municipal/core/db";
import {
  runScheduledCrawlWithDb,
  type ScheduleDbProgress,
  type DbWriters,
} from "@radar-municipal/scraper";
import {
  upsertDataPointsBatch,
  upsertCrawlDocuments,
  rafamToDataPoints,
  crawlToTransparenciaDataPoints,
  sibomToNormativaDataPoints,
  detectAndStoreDataGaps,
} from "../index";

/** All known DataField values for gap detection */
const ALL_FIELDS = Object.values(DataField);

async function main() {
  const args = process.argv.slice(2);
  const visibleMode = args.includes("--visible");
  const allMunicipios = args.includes("--all-municipios");
  const idsIndex = args.indexOf("--ids");
  const municipioIds =
    idsIndex !== -1 ? args[idsIndex + 1]?.split(",") : undefined;

  console.log(`\n🚀 Crawl con escritura a DB`);
  console.log(`   Modo: ${visibleMode ? "visible" : "headless"}`);
  console.log(
    `   Scope: ${allMunicipios ? "TODOS (135)" : municipioIds ? `IDs: ${municipioIds.join(", ")}` : "Pilotos"}`
  );

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL no definida. Abortando.");
    process.exit(1);
  }

  const db = createDb();
  console.log(`   DB: conectada\n`);

  // Wire up the writers — adapt ingestion functions to the DbWriters interface
  const writers: DbWriters = {
    upsertCrawlDocuments: async (db, input) => {
      await upsertCrawlDocuments(db, {
        municipioId: input.municipioId,
        portalUrl: input.url,
        portalAccesible: true,
        documentos: input.documentos.map((d) => ({
          ...d,
          esParseable: d.esParseable ?? false,
        })),
      });
    },
    crawlToTransparenciaDataPoints: (crawl, anio) => {
      return crawlToTransparenciaDataPoints(crawl as never, anio);
    },
    sibomToNormativaDataPoints: (sibom, anio) => {
      return sibomToNormativaDataPoints(sibom as never, anio);
    },
    rafamToDataPoints: (result, municipioId, sourceUrl) => {
      return rafamToDataPoints(result as never, municipioId, sourceUrl);
    },
    upsertDataPointsBatch: async (db, points) => {
      const result = await upsertDataPointsBatch(db, points as never);
      return { inserted: result.total, updated: 0 };
    },
    detectAndStoreDataGaps: async (db, municipioId, anio) => {
      await detectAndStoreDataGaps(db, municipioId, anio, ALL_FIELDS);
    },
  };

  const successes: ScheduleDbProgress[] = [];
  const failures: ScheduleDbProgress[] = [];

  const result = await runScheduledCrawlWithDb({
    db,
    writers,
    headless: !visibleMode,
    allMunicipios,
    municipioIds,
    onProgress: (progress) => {
      const icon = progress.status === "success" ? "✅" : "❌";
      const dp = progress.dataPointsWritten;
      const docs = progress.documentsDetected;
      const rafam = progress.rafamParsed ? " | RAFAM ✓" : "";

      console.log(
        `[${progress.index + 1}/${progress.total}] ${icon} ${progress.nombre.padEnd(25)} ` +
          `${dp} pts | ${docs} docs${rafam} | ${progress.durationMs}ms`
      );

      if (progress.status === "success") {
        successes.push(progress);
      } else {
        failures.push(progress);
        if (progress.error) {
          console.log(`     Error: ${progress.error}`);
        }
      }
    },
  });

  // ─────────────────────────────────────────
  // Resumen
  // ─────────────────────────────────────────

  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 RESUMEN DEL CRAWL CON DB`);
  console.log(`${"═".repeat(60)}`);
  console.log(`   Duración total: ${(result.totalDurationMs / 1000).toFixed(1)}s`);
  console.log(`   Exitosos: ${successes.length}`);
  console.log(`   Fallidos: ${failures.length}`);
  console.log(`   DataPoints escritos: ${result.totalDataPointsWritten}`);
  console.log(`   Documentos detectados: ${result.totalDocumentsDetected}`);
  console.log(`   PDFs RAFAM parseados: ${result.totalRafamParsed}`);

  if (failures.length > 0) {
    console.log(`\n❌ Municipios con errores:`);
    for (const f of failures) {
      console.log(`   ${f.nombre}: ${f.error}`);
    }
  }

  console.log(`\n✅ Crawl con DB finalizado. Cache de scores invalidado.`);
}

main().catch((err) => {
  console.error("\n💥 Error fatal:", err);
  process.exit(1);
});
