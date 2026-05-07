/**
 * Smoke test inline para `parsePlanillaC` contra el fixture Berisso.
 * Eval temporal — no es test ni script de producción.
 */
import { readFileSync } from "node:fs";
import { parsePlanillaC } from "../src/parsers/planilla-c-deuda.js";

const buf = readFileSync("src/__tests__/fixtures/planilla-c/berisso-q1-2026.xlsx");
const r = await parsePlanillaC(buf, {
  municipioId: "060098",
  fuenteUrl: "https://berisso.gob.ar/storage/pdfs/34803f0b-dfb6-495b-9c97-9e1bdf55b257.xlsx",
});
console.log("warnings:", r.warnings);
console.log("snapshot:", JSON.stringify(r.snapshot, null, 2));
