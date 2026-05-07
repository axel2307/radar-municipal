/**
 * Diagnóstico: descarga N URLs de ordenanzas y dumpea texto + keyword hits,
 * para identificar qué patrones reales usan los municipios y qué se le
 * escapa al regex actual.
 *
 * Uso: tsx scripts/dump-ordenanza-text.ts [--out dumps/]
 *
 * El dump por municipio se escribe a un archivo separado en `output/dumps/`
 * así queda en disco para inspección y no se pierde en el scroll del terminal.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseOrdenanzaImpositivaFromUrl } from "../src/parsers/ordenanza-impositiva.js";

// Targets del batch Sprint 7 cuyo PDF parseó OK (año detectado → texto válido)
// pero el regex actual no encontró TSG. Son los candidatos naturales para
// entender qué formato usan las ordenanzas "bien maquetadas" de PBA.
const SAMPLES: Array<{ id: string; nombre: string }> = [
  { id: "060091", nombre: "Berazategui" },        // año 2026 detectado
  { id: "060126", nombre: "Cañuelas" },           // año 2025
  { id: "060217", nombre: "Chivilcoy" },          // año 2026 (doubled glyphs)
  { id: "060287", nombre: "General Arenales" },   // el único OK (control)
  { id: "060322", nombre: "General Las Heras" },  // año 2026
  { id: "060700", nombre: "San Antonio de Areco" }, // año 2025
  { id: "060742", nombre: "San Vicente" },        // año 2023
  { id: "060294", nombre: "General Belgrano" },   // sin año; para ver si texto real
  { id: "060154", nombre: "Carmen de Areco" },    // XLSX (caso especial)
  { id: "060140", nombre: "Carlos Casares" },     // Sprint 12: IMPOSITIVA 0.50 sin parsear
];

import auto from "../../web/src/data/auto-audit.json" with { type: "json" };
import pilot from "../../web/src/data/pilot-audit.json" with { type: "json" };

interface AuditDocLite {
  categoria: string;
  publicado: boolean;
  url: string | null;
}
const all = [...pilot, ...auto];

const outDir = resolve("./output/dumps");
mkdirSync(outDir, { recursive: true });

for (const s of SAMPLES) {
  const entry = all.find((a) => a.municipioId === s.id);
  // Preferir IMPOSITIVA; fallback a FISCAL
  const impositiva = entry?.documentos.find(
    (d: AuditDocLite) => d.categoria === "ORDENANZA_IMPOSITIVA" && d.publicado && d.url,
  );
  const fiscal = entry?.documentos.find(
    (d: AuditDocLite) => d.categoria === "ORDENANZA_FISCAL" && d.publicado && d.url,
  );
  const doc = impositiva ?? fiscal;
  if (!doc?.url) {
    console.log(`── ${s.nombre} (${s.id}): sin URL en audit`);
    continue;
  }

  console.log("─".repeat(70));
  console.log(`${s.nombre} (${s.id})`);
  console.log(`URL: ${doc.url}`);

  try {
    const result = await parseOrdenanzaImpositivaFromUrl(doc.url);
    console.log(
      `Año: ${result.anioFiscal ?? "?"}  TSG=${result.tarifas.tsgPorMil} TISH=${result.tarifas.tishPorciento} Rural=${result.tarifas.tasaVialRuralPorHa} Cons=${result.tarifas.derechoConstruccionPorM2}`,
    );
    console.log(`Longitud texto: ${result.rawText.length} chars`);

    // Keyword hits — dan pista del contexto donde ESTÁN las tarifas
    const hitRe = /(tsg|tasa.{0,40}servicios.{0,20}generales|abl|alumbrado|por\s+mil|%o|‰|al[ií]cuota|tish|seguridad.{0,10}higiene|vial\s+rural|construcci[oó]n|edificaci[oó]n|valuaci[oó]n|artículo|art\.?\s*\d+)/gi;
    const hits = [...result.rawText.matchAll(hitRe)].slice(0, 40);
    const hitLines = hits.map(
      (m) =>
        `  @${m.index}: "${result.rawText
          .slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + 120)
          .replace(/\s+/g, " ")}"`,
    );

    // Escribir dump completo a archivo
    const dumpPath = resolve(outDir, `${s.id}-${s.nombre.replace(/\s+/g, "_")}.txt`);
    writeFileSync(
      dumpPath,
      [
        `URL: ${doc.url}`,
        `Año: ${result.anioFiscal}`,
        `Tarifas: ${JSON.stringify(result.tarifas)}`,
        `Longitud: ${result.rawText.length}`,
        "",
        "=== HITS (40 primeros) ===",
        hitLines.join("\n"),
        "",
        "=== PRIMEROS 8000 CHARS ===",
        result.rawText.slice(0, 8000),
      ].join("\n"),
      "utf-8",
    );
    console.log(`  → dump escrito a ${dumpPath}`);
    console.log(`  Hits: ${hits.length}`);
  } catch (e) {
    console.log("ERROR:", e instanceof Error ? e.message : String(e));
  }
}

console.log("\n✅ Dumps completos en:", outDir);
