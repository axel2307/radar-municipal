/**
 * CLI for loading national dataset files into the database.
 *
 * Usage:
 *   tsx src/cli/ingest-national.ts --source=indec --file=data/raw/indec/censo2022.csv [--anio=2022]
 *   tsx src/cli/ingest-national.ts --source=enacom --file=data/raw/enacom/banda-ancha.csv
 *   tsx src/cli/ingest-national.ts --source=ansv --file=data/raw/ansv/siniestros.csv
 *   tsx src/cli/ingest-national.ts --source=educacion-salud --file=data/raw/edu/datos.json
 *   tsx src/cli/ingest-national.ts --source=economia --file=data/raw/oede/empleo.csv
 */

import { createDb } from "@radar-municipal/core/db";
import { upsertDataPointsBatch } from "../writers/data-point-writer";
import { loadIndecCenso } from "../bulk-loaders/indec-loader";
import { loadEnacom } from "../bulk-loaders/enacom-loader";
import { loadAnsv } from "../bulk-loaders/ansv-loader";
import { loadEducacionSalud } from "../bulk-loaders/educacion-salud-loader";
import { loadEconomia } from "../bulk-loaders/economia-loader";
import type { DataPointInsert } from "../writers/data-point-writer";

function parseArgs(): { source: string; file: string; anio?: number } {
  const args = process.argv.slice(2);
  let source = "";
  let file = "";
  let anio: number | undefined;

  for (const arg of args) {
    if (arg.startsWith("--source=")) source = arg.split("=")[1];
    else if (arg.startsWith("--file=")) file = arg.split("=")[1];
    else if (arg.startsWith("--anio=")) anio = parseInt(arg.split("=")[1]);
  }

  if (!source || !file) {
    console.error("Usage: ingest-national --source=<indec|enacom|ansv|educacion-salud|economia> --file=<path> [--anio=YYYY]");
    process.exit(1);
  }

  return { source, file, anio };
}

const LOADERS: Record<string, (file: string, anio: number) => DataPointInsert[]> = {
  indec: (f, a) => loadIndecCenso(f, a),
  enacom: (f, a) => loadEnacom(f, a),
  ansv: (f, a) => loadAnsv(f, a),
  "educacion-salud": (f, a) => loadEducacionSalud(f, a),
  economia: (f, a) => loadEconomia(f, a),
};

async function main() {
  const { source, file, anio } = parseArgs();
  const loader = LOADERS[source];

  if (!loader) {
    console.error(`Source desconocido: ${source}. Opciones: ${Object.keys(LOADERS).join(", ")}`);
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL no configurada.");
    process.exit(1);
  }

  console.log(`Cargando datos de ${source} desde ${file}...`);
  const year = anio ?? new Date().getFullYear();
  const points = loader(file, year);

  console.log(`Generados ${points.length} dataPoints para ${new Set(points.map((p) => p.municipioId)).size} municipios`);

  if (points.length === 0) {
    console.log("Sin datos para cargar. Verificá el formato del archivo.");
    process.exit(0);
  }

  const db = createDb(databaseUrl);
  console.log("Escribiendo en la base de datos...");
  const result = await upsertDataPointsBatch(db, points);

  console.log(`Completado: ${result.total} dataPoints procesados`);
  if (result.errors.length > 0) {
    console.error("Errores:", result.errors);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
