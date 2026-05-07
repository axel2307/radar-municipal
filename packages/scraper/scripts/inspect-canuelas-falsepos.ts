/**
 * Sprint 13 sanity check: ¿qué matcheó el extractor de alícuota en
 * Cañuelas (cuyo doc es Código Fiscal procedural, no Impositiva)?
 * Si es un falso positivo, debemos decidir entre tighten regex o filtrar
 * a nivel writer.
 */
import { parseOrdenanzaImpositivaFromUrl } from "../src/parsers/ordenanza-impositiva.js";

async function main() {
  const r = await parseOrdenanzaImpositivaFromUrl(
    "https://www.canuelas.gob.ar/images/documentos/3776-04-12-2024expteF19924OrdenanzaFiscal2025.pdf",
  );
  console.log(`Año fiscal: ${r.anioFiscal}`);
  console.log(`Tarifas:`, r.tarifas);
  // Find the construccion header context
  const t = r.rawText.toLowerCase();
  const re = /derecho[s]?\s+de\s+(?:construcci[oó]n|edificaci[oó]n)/gi;
  const matches = Array.from(t.matchAll(re));
  console.log(`\nApariciones del header (${matches.length}):`);
  for (const m of matches) {
    const idx = m.index ?? 0;
    const window = t.slice(idx, idx + 600).replace(/\s+/g, " ");
    console.log(`  @${idx}: ${window.slice(0, 400)}...`);
  }
}
void main();
