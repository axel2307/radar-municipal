/**
 * Sprint 19 — Probe extendido del schema "Planilla C".
 *
 * El probe Berisso reveló que los 12 XLSX comparten el header
 * "LEYES Nº 12462 - Nº13295 y modificatoria" — la planilla estandarizada
 * provincial de Stock de Deuda. Acá leemos el archivo completo de UN
 * Berisso XLSX + UN archivo de otro municipio para:
 *  1. Documentar el schema completo (qué columnas, qué filas, qué totales)
 *  2. Confirmar que es realmente estandarizado (vs. cada municipio con
 *     variaciones)
 *
 * No escribe parser ni a disco — sólo stdout. Sprint 20 puede usar
 * estos hallazgos para una ingesta de Pilar 2 (Fiscal/Deuda).
 */

import ExcelJS from "exceljs";

// Un XLSX de Berisso (Sprint 17 detectó 12; tomamos el primero)
const BERISSO = "https://berisso.gob.ar/storage/pdfs/34803f0b-dfb6-495b-9c97-9e1bdf55b257.xlsx";

// Un XLSX de Carmen de Areco con "STOCK-DE-DEUDA" en el filename
const CARMEN = "http://carmendeareco.gob.ar/wp-content/uploads/2025/10/STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-AL-30-09-2025-.xlsx";

// Un XLSX de Lincoln
const LINCOLN = "https://www.lincoln.gob.ar/sites/default/files/stock_de_deuda_y_p_de_vtos_06-2022.xlsx";

// Un XLSX de Ameghino
const AMEGHINO = "https://ameghino.gob.ar/wp-content/uploads/2025/10/STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-Planilla-Modelo-30-09-2025.xlsx";

const SAMPLES = [
  { label: "Berisso (UUID)", url: BERISSO },
  { label: "Carmen de Areco (Q3 2025)", url: CARMEN },
  { label: "Lincoln (Q2 2022)", url: LINCOLN },
  { label: "Ameghino (Q3 2025)", url: AMEGHINO },
];

async function dump(label: string, url: string): Promise<void> {
  console.log(`\n████ ${label} ████`);
  console.log(`     ${url}`);
  let buf: ArrayBuffer;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 30_000);
    const r = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "RadarMunicipal/0.1 (probe)" } });
    clearTimeout(t);
    if (!r.ok) {
      console.log(`  ✗ HTTP ${r.status}`);
      return;
    }
    buf = await r.arrayBuffer();
  } catch (e) {
    console.log(`  ✗ ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  console.log(`  📑 sheets: ${wb.worksheets.map((s) => s.name).join(", ")}`);

  for (const ws of wb.worksheets) {
    console.log(`\n  --- "${ws.name}" (${ws.rowCount} filas, ${ws.columnCount} cols) ---`);
    for (let r = 1; r <= Math.min(20, ws.rowCount); r++) {
      const row = ws.getRow(r);
      const cells: string[] = [];
      for (let c = 1; c <= Math.min(8, ws.columnCount); c++) {
        const v = row.getCell(c).value;
        const text = v == null ? "" : typeof v === "object" && "text" in v ? String((v as { text: unknown }).text) : String(v);
        cells.push(text.replace(/\s+/g, " ").slice(0, 35));
      }
      // Skip filas completamente vacías
      if (cells.every((c) => c === "")) continue;
      console.log(`    [${r}] ${cells.map((c) => c.padEnd(35)).join(" | ")}`);
    }
  }
}

async function main() {
  console.log(`🔎 Sprint 19 — Probe schema Planilla C "Stock de Deuda" (Ley 12462)`);
  for (const s of SAMPLES) await dump(s.label, s.url);
}
void main();
