/**
 * Diagnóstico Sprint 12: para los municipios cuyo IMPOSITIVA parsea OK
 * (TSG/TISH/Vial extraídos), inspeccionar el contexto cercano a "construcción"
 * o "edificación" para descubrir qué patrones reales usan las ordenanzas y
 * por qué el regex `extractDerechoConstruccionPorM2` está en 0/42.
 */
import { parseOrdenanzaImpositivaFromUrl } from "../src/parsers/ordenanza-impositiva.js";

const TARGETS: Array<{ id: string; nombre: string; url: string }> = [
  // SAA: IMPOSITIVA con TISH OK pero Construcción null
  {
    id: "060700",
    nombre: "San Antonio de Areco",
    url: "https://www.sanantoniodeareco.gob.ar/wp-content/uploads/2024/12/3927-25-OrdenanzaImpositiva-2025.pdf",
  },
  // Belgrano parte 4: IMPOSITIVA confirmada Sprint 11
  {
    id: "060294",
    nombre: "General Belgrano",
    url: "https://gestion.generalbelgrano.gob.ar/gobiernoabierto/2024/Ordenanza%20Fiscal%20e%20Impositiva/Ordenanza%20Fiscal%20e%20Impositiva%20-%20parte%204.pdf",
  },
  // San Vicente: Vial Rural OK Sprint 11, ¿Construcción?
  {
    id: "060742",
    nombre: "San Vicente",
    url: "https://www.sanvicente.gob.ar/transparencia/wp-content/uploads/sites/3/2023/06/ORDENANZA-IMPOSITIVA-2023.pdf",
  },
];

function findConstruccionHits(text: string): Array<{ idx: number; ctx: string }> {
  // Patrones amplios: "derecho de construcción/edificación", "tasa de
  // construcción", "permiso de obra", "$/m²" precedido por contexto
  // edilicio. Capturamos 250 chars de contexto a cada lado.
  const re = /(derecho[s]?\s+de\s+(?:construcci[oó]n|edificaci[oó]n)|tasa[\s\S]{0,40}construcci[oó]n|permiso[s]?\s+de\s+(?:obra|construcci[oó]n|edificaci[oó]n)|por\s+m\s*[2²]|\/\s*m\s*[2²]|el\s+m\s*[2²]|metro\s+cuadrado)/gi;
  const hits: Array<{ idx: number; ctx: string }> = [];
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    const ctx = text
      .slice(Math.max(0, idx - 100), idx + 300)
      .replace(/\s+/g, " ");
    hits.push({ idx, ctx });
  }
  return hits.slice(0, 30);
}

async function main() {
  for (const t of TARGETS) {
    console.log("─".repeat(80));
    console.log(`${t.nombre} (${t.id})`);
    console.log(`URL: ${t.url}`);
    try {
      const r = await parseOrdenanzaImpositivaFromUrl(t.url);
      console.log(`Año: ${r.anioFiscal} | Longitud: ${r.rawText.length}`);
      console.log(
        `Tarifas: TSG=${r.tarifas.tsgPorMil} TISH=${r.tarifas.tishPorciento} Vial=${r.tarifas.tasaVialRuralPorHa} Cons=${r.tarifas.derechoConstruccionPorM2}`,
      );
      const hits = findConstruccionHits(r.rawText);
      console.log(`\nHits construcción (${hits.length}):`);
      for (const h of hits) {
        console.log(`  @${h.idx}: ${h.ctx}`);
      }
    } catch (e) {
      console.log(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
    console.log();
  }
}
void main();
