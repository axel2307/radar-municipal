#!/usr/bin/env tsx
/**
 * Script maestro de migración: ejecuta todo el procedimiento paso a paso.
 *
 * Pasos:
 * 1. Verificar conexión a DB
 * 2. Ejecutar migraciones (crear tablas)
 * 3. Seed de 135 municipios base
 * 4. Seed de datos piloto desde JSONs
 * 5. Verificar integridad (scores JSON vs DB)
 * 6. (Opcional) Cargar datos nacionales
 *
 * Uso:
 *   tsx scripts/run-migration.ts
 *   tsx scripts/run-migration.ts --skip-national
 *   tsx scripts/run-migration.ts --step=verify  (solo paso 5)
 */

import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const skipNational = args.includes("--skip-national");
const stepOnly = args.find((a) => a.startsWith("--step="))?.split("=")[1];

function run(cmd: string, label: string, cwd?: string) {
  console.log(`\n${"─".repeat(50)}`);
  console.log(`▶ ${label}`);
  console.log(`  $ ${cmd}`);
  console.log(`${"─".repeat(50)}\n`);

  try {
    execSync(cmd, {
      cwd: cwd ?? ROOT,
      stdio: "inherit",
      env: { ...process.env },
      timeout: 300_000, // 5 min
    });
    console.log(`\n  ✅ ${label} — completado`);
    return true;
  } catch (err) {
    console.error(`\n  ❌ ${label} — falló`);
    return false;
  }
}

async function main() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  MIGRACIÓN RADAR MUNICIPAL: JSON → PostgreSQL`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Root: ${ROOT}`);
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? "✅ configurada" : "❌ falta"}`);
  console.log(`  Skip national: ${skipNational}`);
  if (stepOnly) console.log(`  Solo paso: ${stepOnly}`);
  console.log();

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL no definida. Abortando.");
    console.error("   Ejemplo: export DATABASE_URL=postgres://user:pass@localhost:5432/radar");
    process.exit(1);
  }

  const steps = [
    {
      id: "migrate",
      label: "Paso 1: Ejecutar migraciones Drizzle (crear tablas)",
      cmd: "npx tsx packages/core/src/db/migrate.ts",
    },
    {
      id: "seed",
      label: "Paso 2: Seed de 135 municipios base",
      cmd: "npx tsx packages/core/src/db/seed.ts",
    },
    {
      id: "seed-pilots",
      label: "Paso 3: Seed de datos piloto (12 JSONs → dataPoints)",
      cmd: "npx tsx packages/ingestion/src/seed-from-json.ts",
    },
    {
      id: "verify",
      label: "Paso 4: Verificar integridad (JSON vs DB scores)",
      cmd: "npx tsx scripts/verify-migration.ts",
    },
  ];

  if (!skipNational) {
    steps.push({
      id: "national",
      label: "Paso 5: Nota sobre datos nacionales",
      cmd: "echo 'Los datos nacionales requieren CSVs en data/raw/. Ejecutar manualmente: npm run ingest:national -- --source=indec --file=...'",
    });
  }

  for (const step of steps) {
    if (stepOnly && step.id !== stepOnly) continue;

    const ok = run(step.cmd, step.label);
    if (!ok) {
      console.error(`\n💥 Migración detenida en: ${step.label}`);
      console.error(`   Corrija el error y re-ejecute con --step=${step.id}`);
      process.exit(1);
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ✅ MIGRACIÓN COMPLETADA`);
  console.log(`${"═".repeat(60)}`);
  console.log(`\n  Próximos pasos:`);
  console.log(`  1. Verificar en la webapp: npm run dev`);
  console.log(`  2. Cargar datos nacionales: npm run ingest:national -- --source=indec --file=...`);
  console.log(`  3. Ejecutar crawl con DB: npm run ingest:crawl`);
  console.log(`  4. Deploy API con DATABASE_URL`);
  console.log(`  5. Deploy Web con NEXT_PUBLIC_API_URL`);
  console.log();
}

main().catch((err) => {
  console.error("\n💥 Error fatal:", err);
  process.exit(1);
});
