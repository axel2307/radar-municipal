import { parseOrdenanzaImpositivaFromUrl } from "../src/parsers/ordenanza-impositiva.js";

async function main() {
  const r = await parseOrdenanzaImpositivaFromUrl(
    "https://berazategui.gob.ar/descargas/ordenanzas/2026/ordenanza_impositiva_2026.pdf",
  );
  console.log("=== 9500-11800 (around '10 por mil sobre activo fijo') ===");
  console.log(r.rawText.slice(9500, 11800));
  console.log("\n=== 11800-13500 (CAPÍTULO CUARTO TISH header) ===");
  console.log(r.rawText.slice(11800, 13500));
  console.log("\n=== 16500-19500 (tabla actividades %) ===");
  console.log(r.rawText.slice(16500, 19500));
}
void main();
