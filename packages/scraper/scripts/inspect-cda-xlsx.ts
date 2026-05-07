/**
 * Sprint 23 — Comparación side-by-side de los 2 XLSX de Carmen de Areco
 * que exponen +7751% delta en Sprint 22. Inspecciona filas, ve qué celdas
 * tienen montos, y diagnostica si es:
 *  - Unit mismatch (uno en miles)
 *  - Scope distinto (filas extra en uno)
 *  - Bug parser (lectura mal)
 *  - Préstamo real
 */
import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";

const FILES = [
  { label: "Q3-2024 ($2.7M)", path: "scripts/_tmp/cda-Q3-2024.xlsx" },
  { label: "Q4-2024 ($213M)", path: "scripts/_tmp/cda-Q4-2024.xlsx" },
];

async function dump(label: string, path: string) {
  console.log(`\n████ ${label} ████`);
  const buf = readFileSync(path);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.worksheets[0];
  console.log(`  rows=${ws.rowCount} cols=${ws.columnCount} sheet="${ws.name}"`);
  for (let r = 1; r <= Math.min(35, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const cells: string[] = [];
    for (let c = 1; c <= Math.min(8, ws.columnCount); c++) {
      const v = row.getCell(c).value;
      let text = "";
      if (v == null) text = "";
      else if (typeof v === "number") text = String(v);
      else if (typeof v === "string") text = v.trim();
      else if (v instanceof Date) text = v.toISOString().slice(0, 10);
      else if (typeof v === "object") {
        if ("result" in v) text = String((v as { result: unknown }).result ?? "");
        else if ("text" in v) text = String((v as { text: unknown }).text);
        else if ("richText" in v)
          text = (v as { richText: { text?: string }[] }).richText
            .map((rt) => rt.text ?? "")
            .join("");
      }
      cells.push((text ?? "").replace(/\s+/g, " ").slice(0, 28).padEnd(28));
    }
    if (cells.every((c) => c.trim() === "")) continue;
    console.log(`  [${String(r).padStart(2)}] ${cells.join("|")}`);
  }
}

async function main() {
  for (const f of FILES) await dump(f.label, f.path);
}
void main();
