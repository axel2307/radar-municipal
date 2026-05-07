#!/usr/bin/env tsx
/**
 * Aplica un patch de URLs resueltas al seed `packages/core/src/constants/municipios.ts`.
 *
 * Lee `resolve-urls.json` (output de resolve-urls.ts) y reemplaza, para cada
 * municipio que tenga `selectedUrl` + confidence ≥ umbral, la línea
 * `urlOficial: null` por `urlOficial: "<url>"`.
 *
 * La búsqueda es por `id: "<municipioId>"` en la misma línea — ese id es
 * único por diseño. Si alguna línea ya tiene urlOficial no-null, se skippea
 * con un warning (no pisa decisiones humanas previas).
 *
 * Uso:
 *   pnpm apply-url-patch -- --input ./output/resolve-urls-full/resolve-urls.json
 *   pnpm apply-url-patch -- --input X --threshold 0.8
 *   pnpm apply-url-patch -- --input X --dry-run  # muestra los diffs sin escribir
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface ResolutionRecord {
  municipioId: string;
  nombre: string;
  selectedUrl: string | null;
  confidence: number;
}

interface CliOptions {
  inputPath: string;
  seedPath: string;
  threshold: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const input = args[args.indexOf("--input") + 1];
  if (!input || input.startsWith("--")) {
    throw new Error("--input <path-to-resolve-urls.json> es requerido");
  }
  const thrIdx = args.indexOf("--threshold");
  const threshold = thrIdx !== -1 ? Number(args[thrIdx + 1]) : 0.7;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error("--threshold debe estar en [0, 1]");
  }
  const seedIdx = args.indexOf("--seed");
  const seedPath = seedIdx !== -1
    ? args[seedIdx + 1]
    : "../core/src/constants/municipios.ts";
  return {
    inputPath: input,
    seedPath,
    threshold,
    dryRun: args.includes("--dry-run"),
  };
}

function main() {
  const opt = parseArgs(process.argv);
  const records: ResolutionRecord[] = JSON.parse(readFileSync(opt.inputPath, "utf-8"));
  const seedAbs = resolve(opt.seedPath);
  let seed = readFileSync(seedAbs, "utf-8");

  const toApply = records.filter(
    (r) => r.selectedUrl && r.confidence >= opt.threshold,
  );

  let applied = 0;
  let skipped = 0;
  const failures: { id: string; nombre: string; reason: string }[] = [];

  for (const r of toApply) {
    // Buscar la línea que contiene `id: "${r.municipioId}"` + `urlOficial: null`.
    // Reemplazar solo si tiene null para no pisar decisiones previas.
    const lineRe = new RegExp(
      `(\\{\\s*id:\\s*"${r.municipioId}"[^}]*?)urlOficial:\\s*null`,
      "s",
    );
    const m = seed.match(lineRe);
    if (!m) {
      // Posiblemente ya tiene URL (p.ej. piloto) — verificar
      const hasEntry = new RegExp(`id:\\s*"${r.municipioId}"`).test(seed);
      if (!hasEntry) {
        failures.push({ id: r.municipioId, nombre: r.nombre, reason: "municipio no encontrado en seed" });
      } else {
        skipped++;
      }
      continue;
    }
    const replacement = `${m[1]}urlOficial: "${r.selectedUrl}"`;
    seed = seed.replace(lineRe, replacement);
    applied++;
  }

  console.log(`📝 Patch summary:`);
  console.log(`   · Records en input: ${records.length}`);
  console.log(`   · Cumplen threshold ≥ ${opt.threshold}: ${toApply.length}`);
  console.log(`   · Aplicados: ${applied}`);
  console.log(`   · Skippeados (ya tienen URL): ${skipped}`);
  console.log(`   · Fallos: ${failures.length}`);
  if (failures.length > 0) {
    console.log(`\n❌ Fallos:`);
    for (const f of failures) console.log(`   · ${f.id} ${f.nombre}: ${f.reason}`);
  }

  if (opt.dryRun) {
    console.log(`\n[DRY RUN] No se escribió ${seedAbs}. Aplicados simulados: ${applied}`);
    return;
  }
  writeFileSync(seedAbs, seed, "utf-8");
  console.log(`\n✅ Seed actualizado: ${seedAbs}`);
}

main();
