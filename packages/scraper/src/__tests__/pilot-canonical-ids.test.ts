/**
 * Sprint 33 — Regresión para el bug de IDs no canónicos en pilot JSONs.
 *
 * El bug histórico: `pilot-gasto-funcion.json` tenía 10 de 13 entries con
 * `municipioId` calculado de forma distinta al canónico de MUNICIPIOS.
 * Eso dropeaba silenciosamente la dimensión gasto-función en
 * `/municipios/[id]`, `/ranking` y el cross vial para esos 10 partidos.
 *
 * Este test audita TODOS los pilot-*.json y exige que cada `municipioId`
 * coincida con el canónico de MUNICIPIOS (lookup por `nombre`). Previene
 * que el bug vuelva en otro pilot file.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MUNICIPIOS } from "@radar-municipal/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "..", "..", "..", "web", "src", "data");

// Algunos pilot-*.json no tienen municipioId/nombre (e.g. pilot-data-gaps
// puede ser un meta-archivo). Filtramos los que tienen el shape esperado
// en runtime — el test valida lo que es validable.
const PILOT_FILES = readdirSync(DATA_DIR)
  .filter((f) => f.startsWith("pilot-") && f.endsWith(".json"))
  .sort();

describe("pilot-*.json: municipioId canónico", () => {
  const byName = new Map(MUNICIPIOS.map((m) => [m.nombre, m.id]));

  for (const filename of PILOT_FILES) {
    it(`${filename}: cada entry con \`nombre\` matchea el ID canónico`, () => {
      const raw = JSON.parse(
        readFileSync(resolve(DATA_DIR, filename), "utf-8"),
      );
      if (!Array.isArray(raw)) return; // meta-archivo, skip

      const mismatches: string[] = [];
      for (const entry of raw) {
        if (
          !entry ||
          typeof entry !== "object" ||
          typeof entry.municipioId !== "string" ||
          typeof entry.nombre !== "string"
        )
          continue; // entry sin shape esperado, skip

        const canonical = byName.get(entry.nombre);
        if (!canonical) {
          mismatches.push(
            `  ${entry.nombre} (id=${entry.municipioId}) no existe en MUNICIPIOS`,
          );
        } else if (entry.municipioId !== canonical) {
          mismatches.push(
            `  ${entry.nombre}: ${entry.municipioId} ≠ canonical ${canonical}`,
          );
        }
      }
      expect(mismatches, mismatches.join("\n")).toEqual([]);
    });
  }
});
