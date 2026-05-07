/**
 * Sprint 13 sanity check: confirma que el extractor de alícuota funciona
 * sobre el dump real de Belgrano (parte 4) ahora que iteramos por todas
 * las apariciones del header DERECHOS DE CONSTRUCCIÓN.
 */
import { parseOrdenanzaImpositivaFromUrl } from "../src/parsers/ordenanza-impositiva.js";

async function main() {
  const r = await parseOrdenanzaImpositivaFromUrl(
    "https://gestion.generalbelgrano.gob.ar/gobiernoabierto/2024/Ordenanza%20Fiscal%20e%20Impositiva/Ordenanza%20Fiscal%20e%20Impositiva%20-%20parte%204.pdf",
  );
  console.log(`Año fiscal: ${r.anioFiscal}`);
  console.log(`Tarifas:`, r.tarifas);
  console.log(`Monto construccion: ${r.montoConstruccion.valor} (confianza: ${r.montoConstruccion.confianza?.nivel})`);
  console.log(`Warnings:\n  - ${r.warnings.join("\n  - ")}`);
}
void main();
