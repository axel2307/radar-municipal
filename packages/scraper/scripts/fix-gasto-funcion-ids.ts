#!/usr/bin/env tsx
/**
 * Sprint 33 — fix one-shot: alinear `municipioId` en TODOS los pilot-*.json
 * a los IDs canónicos de MUNICIPIOS (lookup por `nombre`).
 *
 * El bug histórico (Sprint 11-12 era): 7 pilot files tenían IDs computados
 * de forma legacy (varias fuentes, no la canónica), lo que dropeaba
 * silenciosamente esas dimensiones para los 10 piloto desalineados en
 * `/municipios/[id]`, `/ranking`, vial-cross y la API.
 *
 * Idempotente: re-ejecutar no cambia nada si todo ya está canónico.
 *
 * Una vez corrido, commiteado, y test de regresión `pilot-canonical-ids`
 * en verde, este script puede borrarse.
 */
import { MUNICIPIOS } from "@radar-municipal/core";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATA_DIR = resolve(__dirname, "..", "..", "web", "src", "data");
const PILOT_FILES = readdirSync(DATA_DIR)
  .filter((f) => f.startsWith("pilot-") && f.endsWith(".json"))
  .sort();

const byName = new Map(MUNICIPIOS.map((m) => [m.nombre, m.id]));

let totalChanged = 0;
for (const filename of PILOT_FILES) {
  const path = resolve(DATA_DIR, filename);
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  if (!Array.isArray(raw)) continue;

  let fileChanged = 0;
  for (const e of raw) {
    if (
      !e ||
      typeof e !== "object" ||
      typeof e.municipioId !== "string" ||
      typeof e.nombre !== "string"
    )
      continue;
    const canonical = byName.get(e.nombre);
    if (!canonical) {
      console.error(`  [${filename}] WARN: sin canonical para ${e.nombre}`);
      continue;
    }
    if (e.municipioId !== canonical) {
      console.log(
        `  [${filename}] ${e.nombre.padEnd(22)} ${e.municipioId} -> ${canonical}`,
      );
      e.municipioId = canonical;
      fileChanged++;
    }
  }
  if (fileChanged > 0) {
    writeFileSync(path, JSON.stringify(raw, null, 2) + "\n", "utf-8");
    console.log(`  [${filename}] ✓ ${fileChanged} cambiados\n`);
    totalChanged += fileChanged;
  }
}

console.log(`\n✓ TOTAL changed: ${totalChanged} entries en ${PILOT_FILES.length} files`);
