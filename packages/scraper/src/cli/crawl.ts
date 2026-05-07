#!/usr/bin/env tsx
/**
 * CLI: Crawl de portal de transparencia de un municipio específico.
 *
 * Uso:
 *   pnpm --filter @radar-municipal/scraper crawl -- --id 060056
 *   pnpm --filter @radar-municipal/scraper crawl -- --id 060056 --visible
 *   pnpm --filter @radar-municipal/scraper crawl -- --id 060056 --output ./output
 */

import { MUNICIPIOS_PILOTO, getMunicipioById } from "@radar-municipal/core";
import { crawlTransparencyPortal } from "../crawlers/transparency-crawler";
import { normalizeToPilotAudit } from "../normalizers/audit-normalizer";
import type { CrawlTarget } from "../types";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf("--id");
  const visibleMode = args.includes("--visible");
  const outputIndex = args.indexOf("--output");

  if (idIndex === -1 || !args[idIndex + 1]) {
    console.error("Uso: crawl -- --id <municipioId> [--visible] [--output <dir>]");
    console.error("\nMunicipios piloto disponibles:");
    for (const m of MUNICIPIOS_PILOTO) {
      console.error(`  ${m.id} - ${m.nombre}`);
    }
    process.exit(1);
  }

  const municipioId = args[idIndex + 1];
  const outputDir = outputIndex !== -1 ? args[outputIndex + 1] : "./output";

  const municipio = getMunicipioById(municipioId);
  if (!municipio) {
    console.error(`Municipio ${municipioId} no encontrado`);
    process.exit(1);
  }

  if (!municipio.urlOficial) {
    console.error(`Municipio ${municipio.nombre} no tiene URL oficial`);
    process.exit(1);
  }

  const target: CrawlTarget = {
    municipioId: municipio.id,
    nombre: municipio.nombre,
    urlOficial: municipio.urlOficial,
  };

  console.log(`\n🔍 Crawling portal de ${municipio.nombre}...`);
  console.log(`   URL: ${municipio.urlOficial}`);
  console.log(`   Modo: ${visibleMode ? "visible" : "headless"}\n`);

  const crawlResult = await crawlTransparencyPortal(target, {
    headless: !visibleMode,
  });

  // Mostrar resultado en consola
  console.log(`\n📊 Resultado del crawl:`);
  console.log(`   Sitio online: ${crawlResult.sitioOnline ? "✅" : "❌"}`);
  console.log(`   Páginas visitadas: ${crawlResult.paginasVisitadas}`);
  console.log(`   Duración: ${crawlResult.duracionMs}ms`);

  if (crawlResult.error) {
    console.log(`   ❌ Error: ${crawlResult.error}`);
  }

  console.log(`\n   📁 Accesibilidad:`);
  console.log(`     Portal: ${crawlResult.accesibilidad.urlPortal ?? "No encontrado"}`);
  console.log(`     Menú transparencia: ${crawlResult.accesibilidad.menuTransparenciaVisible ? "✅" : "❌"}`);
  console.log(`     Clicks desde home: ${crawlResult.accesibilidad.clicksDesdeHome ?? "N/A"}`);
  console.log(`     URLs encontradas: ${crawlResult.accesibilidad.urlsTransparencia.length}`);
  for (const url of crawlResult.accesibilidad.urlsTransparencia) {
    console.log(`       → ${url}`);
  }

  console.log(`\n   📄 Documentos detectados: ${crawlResult.documentos.length}`);
  for (const doc of crawlResult.documentos) {
    console.log(`     ${doc.categoria}: ${doc.formato ?? "?"} (confianza: ${(doc.confianza * 100).toFixed(0)}%)`);
    console.log(`       URL: ${doc.url}`);
    console.log(`       Contexto: "${doc.textoContexto.slice(0, 80)}"`);
    if (doc.anioDetectado) console.log(`       Año: ${doc.anioDetectado}`);
    if (doc.esParseable !== null) console.log(`       Parseable: ${doc.esParseable ? "✅" : "❌"}`);
  }

  if (crawlResult.warnings.length > 0) {
    console.log(`\n   ⚠️ Warnings:`);
    for (const w of crawlResult.warnings) {
      console.log(`     ${w}`);
    }
  }

  // Normalizar a formato audit
  const audit = normalizeToPilotAudit(crawlResult);

  // Guardar resultados
  mkdirSync(resolve(outputDir), { recursive: true });

  const crawlFile = resolve(outputDir, `crawl-${municipioId}.json`);
  writeFileSync(crawlFile, JSON.stringify(crawlResult, null, 2));
  console.log(`\n💾 Resultado crudo guardado en: ${crawlFile}`);

  const auditFile = resolve(outputDir, `audit-${municipioId}.json`);
  writeFileSync(auditFile, JSON.stringify(audit, null, 2));
  console.log(`💾 Audit normalizado guardado en: ${auditFile}`);

  // Calcular score rápido
  try {
    const { calculateTransparencyScore } = await import("@radar-municipal/scoring");
    const score = calculateTransparencyScore(audit);
    console.log(`\n🏆 Score de transparencia: ${score.scoreTotal.toFixed(1)} / 100`);
  } catch {
    console.log(`\n⚠️ No se pudo calcular score (scoring package no disponible)`);
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
