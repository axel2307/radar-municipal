/**
 * Sprint 50 — Camino B · Bundle size budget.
 *
 * Mide el peso total de los chunks JS post-`next build` y falla si supera
 * un budget. La idea NO es validar performance fine-grained (eso lo hace
 * Lighthouse contra una build viva) sino capturar regresiones groseras:
 * si alguien importa accidentalmente `lodash` entero o se duplican deps,
 * lo cazamos antes del merge.
 *
 * Cómo lo usa CI: se corre después de `next build` en el job `ci`. Exit 0
 * = OK, Exit 1 = fail con tabla de los chunks más pesados.
 *
 * Calibración inicial: el bundle actual ronda los ~3 MB total de chunks
 * estáticos (Next 16 + Recharts + TopoJSON). El budget arranca en 4 MB
 * para dejar margen de Sprint 51+ features razonables; si subimos eso,
 * lo más probable es que sea una regresión.
 */
import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Path relativo a este script, no a cwd, para sobrevivir a `pnpm --filter`
// (que cambia cwd al package filtrado) y a invocaciones desde subdirs.
const __dirname = dirname(fileURLToPath(import.meta.url));
const CHUNKS_DIR = join(
  __dirname,
  "..",
  "packages",
  "web",
  ".next",
  "static",
  "chunks",
);
const BUDGET_TOTAL_KB = 4000; // ~4 MB de chunks JS estáticos.
const TOP_N = 10;

function walk(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function main(): void {
  let files: string[];
  try {
    files = walk(CHUNKS_DIR);
  } catch (err) {
    console.error(`✗ No se encontró ${CHUNKS_DIR}.`);
    console.error("  Corré `pnpm --filter @radar-municipal/web build` primero.");
    console.error(`  Detalle: ${(err as Error).message}`);
    process.exit(2);
  }

  if (files.length === 0) {
    console.error("✗ El directorio existe pero no contiene .js.");
    process.exit(2);
  }

  const withSize = files.map((f) => ({ path: f, size: statSync(f).size }));
  const total = withSize.reduce((acc, f) => acc + f.size, 0);
  const totalKb = total / 1024;

  // Top N por tamaño individual — útil para detectar el culpable de una
  // regresión.
  const sorted = [...withSize].sort((a, b) => b.size - a.size);
  const top = sorted.slice(0, TOP_N);

  console.log(`Bundle JS estático — ${files.length} chunks`);
  console.log(`Total: ${formatKb(total)} / budget ${BUDGET_TOTAL_KB} KB`);
  console.log("");
  console.log(`Top ${TOP_N} chunks por tamaño:`);
  for (const { path, size } of top) {
    const rel = path.replace(CHUNKS_DIR, ".../chunks");
    console.log(`  ${formatKb(size).padStart(10)}  ${rel}`);
  }
  console.log("");

  if (totalKb > BUDGET_TOTAL_KB) {
    console.error(
      `✗ Bundle excede el budget: ${formatKb(total)} > ${BUDGET_TOTAL_KB} KB.`,
    );
    console.error(
      "  Si el incremento es legítimo (ej. nueva feature grande)," +
        " ajustá BUDGET_TOTAL_KB en este script con la justificación en el commit.",
    );
    process.exit(1);
  }

  console.log(`✓ Bundle dentro del budget.`);
}

main();
