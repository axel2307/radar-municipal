/**
 * Sprint 19 — probe de los 16 XLSX UUID de Berisso.
 *
 * Sprint 17 detectó que Berisso publica 16 archivos XLSX en
 * `berisso.gob.ar/storage/pdfs/` con nombres UUID opacos (sin
 * Content-Disposition, sin contexto en HTML). Este probe descarga cada
 * uno, lee la primera hoja, e imprime las primeras 3 filas + nombre de
 * la hoja. El objetivo es categorizar:
 *   - licitaciones / contrataciones / concursos → escribimos adapter
 *   - presupuesto / deuda / RAFAM → ya cubierto, descartar
 *   - otra cosa → caso a caso
 *
 * Output: stdout legible (no escribe a disco).
 */

import ExcelJS from "exceljs";

const URLS = [
  "https://berisso.gob.ar/storage/pdfs/34803f0b-dfb6-495b-9c97-9e1bdf55b257.xlsx",
  "https://berisso.gob.ar/storage/pdfs/15303cf7-1a3a-49af-a304-5c26087d2c14.xlsx",
  "https://berisso.gob.ar/storage/pdfs/6b015a2d-db90-4cef-9b89-632d3f81de50.xlsx",
  "https://www.berisso.gob.ar/storage/pdfs/6fd3db9b-04b5-42bf-8ae3-e7df3a83940a.xlsx",
  "https://berisso.gob.ar/storage/pdfs/27617e73-4bf0-448d-8578-4241662d9740.xlsx",
  "https://berisso.gob.ar/storage/pdfs/8bf86149-9308-4d68-93ef-771db80a43a8.xlsx",
  "https://berisso.gob.ar/storage/pdfs/18ea1564-5646-47db-aba4-3f04b5f4c8b5.xlsx",
  "https://www.berisso.gob.ar/storage/pdfs/bf34ca12-4e02-46ce-9b2c-a54b428511ce.xlsx",
  "https://www.berisso.gob.ar/storage/pdfs/0012bfc0-0c16-4ac7-b5ef-fc8692bc9e97.xlsx",
  "https://www.berisso.gob.ar/storage/pdfs/7717ff9d-b144-4f43-a14a-0f8561692be0.xlsx",
  "https://www.berisso.gob.ar/storage/pdfs/5bcfc187-fcf0-420a-8737-3d9f6174483b.xlsx",
  "https://www.berisso.gob.ar/storage/pdfs/1da7960d-2400-48c2-836f-5d591d6044f8.xlsx",
];

const TIMEOUT = 20_000;

async function probeOne(url: string): Promise<void> {
  const uuid = url.match(/([0-9a-f-]{36})\.xlsx/)?.[1] ?? "?";
  console.log(`\n━━━ ${uuid} ━━━`);
  let buffer: ArrayBuffer;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT);
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "RadarMunicipal/0.1 (probe)" },
    });
    clearTimeout(t);
    if (!res.ok) {
      console.log(`  ✗ HTTP ${res.status}`);
      return;
    }
    buffer = await res.arrayBuffer();
  } catch (e) {
    console.log(`  ✗ fetch fail: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  console.log(`  📏 ${buffer.byteLength} bytes`);

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch (e) {
    console.log(`  ✗ xlsx parse fail: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  console.log(`  📑 sheets: ${wb.worksheets.map((s) => s.name).join(", ")}`);

  const ws = wb.worksheets[0];
  if (!ws) {
    console.log("  (no sheets)");
    return;
  }
  console.log(`  rows: ${ws.rowCount}, cols: ${ws.columnCount}`);

  // Primeras 4 filas, primeras 8 columnas
  for (let r = 1; r <= Math.min(4, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const cells: string[] = [];
    for (let c = 1; c <= Math.min(8, ws.columnCount); c++) {
      const v = row.getCell(c).value;
      const text = v == null ? "" : typeof v === "object" && "text" in v ? String((v as { text: unknown }).text) : String(v);
      cells.push(text.replace(/\s+/g, " ").slice(0, 40));
    }
    console.log(`    [${r}] ${cells.join(" | ")}`);
  }

  // Heurística: detectar palabras clave de licitación
  let allText = "";
  for (let r = 1; r <= Math.min(8, ws.rowCount); r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= ws.columnCount; c++) {
      const v = row.getCell(c).value;
      if (v != null) allText += " " + String(v);
    }
  }
  const tags: string[] = [];
  if (/licitaci|concurso|adjudicaci|proveedor|oferent|expediente/i.test(allText)) tags.push("LICITACIONES?");
  if (/presupuesto|gasto|recurso|partida|finalidad|funci[oó]n/i.test(allText)) tags.push("PRESUPUESTO?");
  if (/deuda|stock|vencimiento|pasivo|amortizaci/i.test(allText)) tags.push("DEUDA?");
  if (/rafam|sef|estado.*ejec/i.test(allText)) tags.push("RAFAM?");
  console.log(`  🏷️  ${tags.length > 0 ? tags.join(", ") : "(sin keywords)"}`);
}

async function main() {
  console.log(`🔎 Sprint 19 — Berisso XLSX probe (${URLS.length} archivos)`);
  for (const url of URLS) {
    await probeOne(url);
  }
}

void main();
