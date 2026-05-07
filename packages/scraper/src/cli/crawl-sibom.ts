#!/usr/bin/env tsx
/**
 * CLI: Scrape de SIBOM para un municipio específico.
 *
 * Uso:
 *   pnpm --filter @radar-municipal/scraper crawl:sibom -- --id 060567
 *   pnpm --filter @radar-municipal/scraper crawl:sibom -- --all
 */

import { MUNICIPIOS_PILOTO, getMunicipioById } from "@radar-municipal/core";
import { scrapeSibom } from "../crawlers/sibom-scraper";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf("--id");
  const allMode = args.includes("--all");
  const outputIndex = args.indexOf("--output");
  const outputDir = outputIndex !== -1 ? args[outputIndex + 1] : "./output";

  mkdirSync(resolve(outputDir), { recursive: true });

  if (allMode) {
    console.log(`\n🔍 Scrapeando SIBOM para ${MUNICIPIOS_PILOTO.length} municipios piloto...\n`);

    const results = [];
    for (const m of MUNICIPIOS_PILOTO) {
      console.log(`  → ${m.nombre}...`);
      const result = await scrapeSibom(m.id, m.nombre);
      results.push(result);
      console.log(`    Normas encontradas: ${result.normasEncontradas}`);
      if (result.ordenanzaFiscalVigente) {
        console.log(`    ✅ Ordenanza fiscal: ${result.ordenanzaFiscalVigente.titulo}`);
      }
      if (result.error) {
        console.log(`    ❌ Error: ${result.error}`);
      }
      // Respetar rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    }

    const outputFile = resolve(outputDir, "sibom-all.json");
    writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Resultados guardados en: ${outputFile}`);

    const total = results.reduce((s, r) => s + r.normasEncontradas, 0);
    const withFiscal = results.filter((r) => r.ordenanzaFiscalVigente).length;
    console.log(`\n📊 Resumen: ${total} normas, ${withFiscal}/${results.length} con ordenanza fiscal`);
    return;
  }

  if (idIndex === -1 || !args[idIndex + 1]) {
    console.error("Uso: crawl:sibom -- --id <municipioId> | --all");
    console.error("\nMunicipios piloto disponibles:");
    for (const m of MUNICIPIOS_PILOTO) {
      console.error(`  ${m.id} - ${m.nombre}`);
    }
    process.exit(1);
  }

  const municipioId = args[idIndex + 1];
  const municipio = getMunicipioById(municipioId);
  if (!municipio) {
    console.error(`Municipio ${municipioId} no encontrado`);
    process.exit(1);
  }

  console.log(`\n🔍 Scrapeando SIBOM para ${municipio.nombre}...`);

  const result = await scrapeSibom(municipio.id, municipio.nombre);

  console.log(`\n📊 Resultado:`);
  console.log(`   Normas encontradas: ${result.normasEncontradas}`);

  if (result.error) {
    console.log(`   ❌ Error: ${result.error}`);
  }

  if (result.ordenanzaFiscalVigente) {
    console.log(`\n   ✅ Ordenanza fiscal vigente:`);
    console.log(`     ${result.ordenanzaFiscalVigente.tipo} N° ${result.ordenanzaFiscalVigente.numero}`);
    console.log(`     Año: ${result.ordenanzaFiscalVigente.anio}`);
    console.log(`     Título: ${result.ordenanzaFiscalVigente.titulo}`);
    if (result.ordenanzaFiscalVigente.urlPdf) {
      console.log(`     PDF: ${result.ordenanzaFiscalVigente.urlPdf}`);
    }
  }

  if (result.normas.length > 0) {
    console.log(`\n   📜 Últimas normas:`);
    for (const norma of result.normas.slice(0, 10)) {
      console.log(`     ${norma.tipo} N° ${norma.numero} (${norma.anio}) - ${norma.titulo.slice(0, 60)}`);
    }
    if (result.normas.length > 10) {
      console.log(`     ... y ${result.normas.length - 10} más`);
    }
  }

  const outputFile = resolve(outputDir, `sibom-${municipioId}.json`);
  writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`\n💾 Resultado guardado en: ${outputFile}`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
