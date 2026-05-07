/**
 * Sprint 20 — Parser de "Planilla C: Stock de Deuda Pública y Perfil de
 * Vencimientos" (Ley 12462/13295 PBA).
 *
 * Schema confirmado uniforme en Sprint 19 sobre 4 municipios distintos.
 * Layout típico:
 *
 *   [1]  LEYES Nº 12462 - Nº13295 y modificatoria
 *   [3]  Municipalidad de: <NOMBRE>
 *   [5]  STOCK DE DEUDA PÚBLICA Y PERFIL DE VENCIMIENTOS
 *   [7]  | ORGANISMO ACREEDOR | SALDO AL | 2024 | 2024 | 2025 | 2025 | ...
 *   [8]  |                    | <fecha>  | AMORTIZ. | INTERESES | ...
 *   [11] 1. DEUDA PÚBLICA                ← section header (skip)
 *   [12] 1.1. DEUDA PÚBLICA CONSOLIDADA  ← sub-section (skip)
 *   [13] ORGANISMOS PUBLICOS PROVINCIALES ← sub-sub-section (skip)
 *   [14] TESORO PROVINCIAL               ← acreedor real
 *   [15] A.R.C.A
 *   ...
 *
 * Diseño mínimo viable: extraer (municipality, fecha, saldoTotal,
 * acreedores con saldo > 0). Aggregator histórico multi-snapshot queda
 * para Sprint 21+ si tiene tracción.
 */

import ExcelJS from "exceljs";
import type {
  AcreedorSaldo,
  StockDeudaSnapshot,
} from "@radar-municipal/core";

// ─────────────────────────────────────────
// Cell value normalizers
// ─────────────────────────────────────────

/**
 * ExcelJS devuelve `cell.value` como string | number | Date | { formula,
 * result } | { richText } | null. Esta función recupera un string limpio
 * o vacío.
 */
export function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof (value as { text: unknown }).text === "string") {
      return ((value as { text: string }).text).trim();
    }
    if ("richText" in value && Array.isArray((value as { richText: unknown[] }).richText)) {
      return (value as { richText: { text?: string }[] }).richText
        .map((rt) => rt.text ?? "")
        .join("")
        .trim();
    }
    if ("result" in value) {
      // Fórmula resuelta. Puede ser number, string, Date, etc.
      return cellText((value as { result: ExcelJS.CellValue }).result);
    }
    if ("formula" in value && "result" in (value as object) === false) {
      // Fórmula sin resultado calculado (raro).
      return "";
    }
  }
  return "";
}

/**
 * Devuelve el valor numérico de la celda, resolviendo fórmulas via
 * `cell.result`. Null si no se puede convertir.
 */
export function cellNumber(value: ExcelJS.CellValue): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "object") {
    if ("result" in value) {
      return cellNumber((value as { result: ExcelJS.CellValue }).result);
    }
  }
  return null;
}

/**
 * La fecha de "SALDO AL" puede venir como:
 *   - Date (más común)
 *   - string ISO o castellano
 *   - parte de un texto "SALDO AL Mon Dec 30 2024 ..."
 * Devolvemos yyyy-mm-dd o null si no se puede determinar.
 */
export function cellDate(value: ExcelJS.CellValue): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (typeof value === "object" && "result" in value) {
    return cellDate((value as { result: ExcelJS.CellValue }).result);
  }
  return null;
}

// ─────────────────────────────────────────
// Section header heuristic
// ─────────────────────────────────────────

/**
 * Sprint 23 — extracta fecha de corte desde el filename de la URL del
 * XLSX. Útil cuando la planilla NO tiene la fecha en el header (cache
 * antiguo / planilla parcialmente llenada). Patrones cubiertos:
 *
 *  - "30-9-2024.xlsx" → 2024-09-30 (DD-M-YYYY, mes 1 dígito)
 *  - "30-09-2024.xlsx" → 2024-09-30
 *  - "30-06-22.xlsx" → 2022-06-30 (año 2 dígitos → 20XX)
 *  - "stock_de_deuda_y_p_de_vtos_06-2022.xlsx" → 2022-06-30 (M-YYYY)
 *  - "AL-31-12-2024.xlsx" → 2024-12-31
 *  - "30-9-2020.xlsx" → 2020-09-30
 *
 * Devuelve yyyy-mm-dd o null si no matchea ningún patrón. Conservador:
 * sólo matchea cuando la cadena tiene una forma fecha-like clara.
 */
export function extractFechaFromUrl(url: string): string | null {
  // Intentar primero el último segmento del path (el filename).
  const filename = url.split("/").pop() ?? url;
  // Decodificar URL-encoded chars por las dudas.
  const decoded = decodeURIComponent(filename);

  // Pattern 1: D(D)-M(M)-(YY|YYYY) — más común en filenames AR.
  // Permitir separadores: -, _.
  const re1 = /(\d{1,2})[-_](\d{1,2})[-_](\d{2,4})(?=[^\d]|$)/g;
  const candidates: { y: number; m: number; d: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re1.exec(decoded)) !== null) {
    let y = Number(m[3]);
    const mm = Number(m[2]);
    const dd = Number(m[1]);
    if (y < 100) y += 2000;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || y < 2000 || y > 2100) continue;
    candidates.push({ y, m: mm, d: dd });
  }
  // Pattern 2: M(M)-YYYY (sin día) — algunos filenames lo usan ("06-2022").
  // Asumimos último día del mes como convención (es un cierre trimestral).
  if (candidates.length === 0) {
    const re2 = /(?<![\d-])(\d{1,2})[-_](20\d{2})(?=[^\d]|$)/g;
    let m2: RegExpExecArray | null;
    while ((m2 = re2.exec(decoded)) !== null) {
      const mm = Number(m2[1]);
      const y = Number(m2[2]);
      if (mm < 1 || mm > 12) continue;
      // Último día del mes
      const lastDay = new Date(y, mm, 0).getDate();
      candidates.push({ y, m: mm, d: lastDay });
    }
  }
  if (candidates.length === 0) return null;
  // Si hay múltiples candidatas (ej. "2024/10/03.01-...30-9-2024.xlsx"
  // tiene varias), preferimos la última matcheada — suele ser la fecha
  // de corte real, no la fecha de subida del archivo.
  const last = candidates[candidates.length - 1];
  return `${last.y}-${String(last.m).padStart(2, "0")}-${String(last.d).padStart(2, "0")}`;
}

/**
 * Determina si un nombre de fila es un encabezado de sección (que NO
 * debemos contar como acreedor). Patrones detectados en Sprint 19:
 *  - Numerada: "1. DEUDA PÚBLICA", "1.1. DEUDA PÚBLICA CONSOLIDADA"
 *  - Bloques uppercase de subgrupo: "ORGANISMOS PUBLICOS PROVINCIALES",
 *    "ORGANISMOS NACIONALES", "ENTIDADES FINANCIERAS"
 *  - Totales: filas con la palabra "TOTAL" en mayúscula
 */
export function isSectionHeader(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (/^\d+(\.\d+)*\.?\s/.test(trimmed)) return true; // "1. ", "1.1. "
  if (/^TOTAL\b/i.test(trimmed)) return true;
  // Bloques mayúscula sin lowercase con palabras clave de sección.
  const SECTION_KEYWORDS = [
    "ORGANISMOS PUBLICOS",
    "ORGANISMOS NACIONALES",
    "ENTIDADES FINANCIERAS",
    "DEUDA PÚBLICA",
    "DEUDA PUBLICA",
    "DEUDA NO CONSOLIDADA",
    "OTROS PASIVOS",
  ];
  for (const kw of SECTION_KEYWORDS) {
    if (trimmed.toUpperCase().startsWith(kw)) return true;
  }
  return false;
}

// ─────────────────────────────────────────
// Header detection
// ─────────────────────────────────────────

interface HeaderInfo {
  /** Nombre del municipio (raw text, sin normalizar). */
  nombreFuente: string | null;
  /** Fecha del corte (yyyy-mm-dd). */
  fechaSnapshot: string | null;
  /** Index 1-based de la columna donde está el SALDO. */
  saldoCol: number | null;
  /** Index 1-based de la última fila de header (datos empiezan después). */
  ultimaFilaHeader: number;
}

/**
 * Itera las primeras N filas buscando los anchors del header. Tolera
 * variaciones de spacing y punctuation entre municipios.
 */
export function detectHeader(ws: ExcelJS.Worksheet): HeaderInfo {
  const out: HeaderInfo = {
    nombreFuente: null,
    fechaSnapshot: null,
    saldoCol: null,
    ultimaFilaHeader: 0,
  };
  const maxRow = Math.min(15, ws.rowCount);
  const maxCol = Math.min(20, ws.columnCount);
  for (let r = 1; r <= maxRow; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= maxCol; c++) {
      const v = row.getCell(c).value;
      const text = cellText(v);
      if (!text) continue;
      // Municipalidad de: BERISSO  (con o sin :)
      const munMatch = text.match(/^Municipalidad\s+de\s*:?\s*(.+)$/i);
      if (munMatch && munMatch[1].trim().length > 0) {
        out.nombreFuente = munMatch[1].trim().replace(/[\s.…]+$/, "");
        out.ultimaFilaHeader = Math.max(out.ultimaFilaHeader, r);
      }
      // SALDO AL → la columna donde aparece marca dónde leer el saldo.
      if (/^SALDO\s+AL/i.test(text)) {
        out.saldoCol = c;
        out.ultimaFilaHeader = Math.max(out.ultimaFilaHeader, r);
        // La fecha puede estar EN la misma celda ("SALDO AL <date>") o
        // en la celda inmediatamente debajo (next row, same col).
        const inlineDate = text.match(/SALDO\s+AL\s+(.+)/i);
        if (inlineDate && inlineDate[1].trim().length > 0) {
          const d = new Date(inlineDate[1].trim());
          if (!Number.isNaN(d.getTime())) {
            out.fechaSnapshot = d.toISOString().slice(0, 10);
          }
        }
        // Mirar la celda en la fila siguiente, misma columna.
        if (!out.fechaSnapshot && r < ws.rowCount) {
          const below = ws.getRow(r + 1).getCell(c).value;
          const d = cellDate(below);
          if (d) out.fechaSnapshot = d;
        }
      }
      // 1. DEUDA PÚBLICA — empuja la última fila de header.
      if (/^1\.\s*DEUDA\s+P[UÚ]BLICA/i.test(text)) {
        out.ultimaFilaHeader = Math.max(out.ultimaFilaHeader, r - 1);
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────
// Parser principal
// ─────────────────────────────────────────

export interface ParsePlanillaCOptions {
  municipioId: string;
  fuenteUrl: string;
  /** Fallback si la planilla no expone fecha legible. */
  fechaFallback?: string;
}

export interface ParsePlanillaCResult {
  snapshot: StockDeudaSnapshot | null;
  warnings: string[];
}

export async function parsePlanillaC(
  buffer: ArrayBuffer | Buffer,
  opt: ParsePlanillaCOptions,
): Promise<ParsePlanillaCResult> {
  const warnings: string[] = [];
  const wb = new ExcelJS.Workbook();
  try {
    // ExcelJS espera Node Buffer; su .d.ts referencia el tipo bare `Buffer`
    // pero @types/node 24+ devuelve `Buffer<ArrayBufferLike>` (genérico).
    // El cast a `Parameters<...>` toma el shape exacto que ExcelJS pide.
    type LoadParam = Parameters<typeof wb.xlsx.load>[0];
    await wb.xlsx.load(buffer as unknown as LoadParam);
  } catch (e) {
    warnings.push(`xlsx.load fail: ${e instanceof Error ? e.message : String(e)}`);
    return { snapshot: null, warnings };
  }
  const ws = wb.worksheets[0];
  if (!ws) {
    warnings.push("XLSX sin hojas");
    return { snapshot: null, warnings };
  }

  const header = detectHeader(ws);
  if (header.saldoCol == null) {
    warnings.push("No se encontró columna 'SALDO AL' — schema desconocido");
    return { snapshot: null, warnings };
  }

  // Cadena de detección (Sprint 23): header → opts.fallback → URL filename.
  // El último es importante para planillas que no traen la fecha en el header
  // (cache antiguos, formularios parcialmente cargados): la fecha SUELE estar
  // en el filename del URL como convención AR.
  const fechaSnapshot =
    header.fechaSnapshot ??
    opt.fechaFallback ??
    extractFechaFromUrl(opt.fuenteUrl) ??
    null;
  if (!fechaSnapshot) {
    warnings.push(
      "Fecha de corte no detectada (header + fallback + filename)",
    );
    return { snapshot: null, warnings };
  }

  // Iterar filas de datos. Asumimos col 2 tiene el nombre del acreedor
  // (consistent across Sprint 19 fixtures).
  const NOMBRE_COL = 2;
  const acreedores: AcreedorSaldo[] = [];
  let seccionActual: string | null = null;
  for (let r = header.ultimaFilaHeader + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const nombre = cellText(row.getCell(NOMBRE_COL).value);
    if (!nombre) continue;

    // Si parece sección, lo guardamos como contexto para los próximos
    // acreedores y NO lo agregamos como saldo.
    if (isSectionHeader(nombre)) {
      seccionActual = nombre;
      continue;
    }

    const saldo = cellNumber(row.getCell(header.saldoCol).value);
    if (saldo == null || saldo <= 0) continue;

    acreedores.push({
      nombre,
      saldo,
      seccion: seccionActual,
    });
  }

  if (acreedores.length === 0) {
    warnings.push("Header detectado pero ningún acreedor con saldo > 0");
    // Aún así devolvemos snapshot con saldoTotal=0; útil para auditoría
    // ("publica la planilla pero está vacía").
  }

  const saldoTotal = acreedores.reduce((s, a) => s + a.saldo, 0);
  const snapshot: StockDeudaSnapshot = {
    municipioId: opt.municipioId,
    nombreFuente: header.nombreFuente ?? "",
    fechaSnapshot,
    saldoTotal,
    acreedoresConSaldo: acreedores.length,
    acreedores,
    fuenteUrl: opt.fuenteUrl,
    parsedAt: new Date().toISOString(),
  };
  return { snapshot, warnings };
}
