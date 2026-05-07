/**
 * Sprint 16 — Parser de licitaciones publicadas en `gobabierto.ar`.
 *
 * `gobabierto.ar` es un CMS WordPress usado por algunos municipios PBA
 * (Carlos Casares confirmado; Adolfo Alsina lo usa pero NO publica
 * licitaciones en CSV). El schema es radicalmente distinto al de Quilmes:
 *
 *   1. Comma-delimited (no semicolon).
 *   2. Primera fila es un banner ("CONCURSOS" o "LICITACIÓN PRIVADA"). Skip.
 *   3. Segunda fila es el header real. Puede tener una celda numérica
 *      basura al final.
 *   4. Cada licitación se distribuye en MÚLTIPLES filas — una por cada
 *      firma invitada. La fila primaria tiene N° Concurso + Expediente +
 *      Fecha + Detalle. Las filas siguientes (con esos campos vacíos)
 *      son continuaciones del mismo concurso.
 *   5. La columna `Adjudicacion` está poblada SÓLO en la fila del
 *      proveedor ganador. La columna `Importe` aparece junto con
 *      `Adjudicacion`.
 *   6. Importe formateado como `$ 12.081.000` (AR, miles con punto).
 *   7. Estado especial `DESIERTA`: aparece literal en Adjudicacion +
 *      Orden + Importe → mapeo a estado DESIERTA, proveedor/monto null.
 *
 * En contraste con Quilmes, este schema EXPONE PROVEEDOR Y MONTO
 * ADJUDICADO. Por primera vez podemos calcular HHI sobre proveedores —
 * la métrica que el plan estratégico promete pero que Sprint 15 no podía
 * entregar.
 *
 * Sprint 16 cubre Carlos Casares solamente (único municipio gobabierto.ar
 * con licitaciones CSV). Si Sprint 17+ encuentra otros municipios con la
 * misma plantilla, este parser ya los soporta sin cambios.
 */

import type { Contratacion, ContratacionEstado } from "@radar-municipal/core";

// ─────────────────────────────────────────
// CSV reader (comma-delimited con quotes opcionales)
// ─────────────────────────────────────────

/**
 * Parser CSV minimal con commas como delimitador. Maneja quotes para
 * celdas con commas embebidas (ej. nombres de empresas con coma).
 */
export function splitCommaCsv(csv: string): string[][] {
  const out: string[][] = [];
  const norm = csv.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (const line of norm.split("\n")) {
    if (line.length === 0) continue;
    const cells: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') {
          current += '"';
          i++;
          continue;
        }
        inQuote = !inQuote;
        continue;
      }
      if (c === "," && !inQuote) {
        cells.push(current);
        current = "";
        continue;
      }
      current += c;
    }
    cells.push(current);
    out.push(cells);
  }
  return out;
}

// ─────────────────────────────────────────
// Normalizadores
// ─────────────────────────────────────────

/**
 * Importe `$ 12.081.000` → 12081000. Acepta también sin signo, con coma
 * decimal AR (ya cubierto por el parser estándar). Devuelve null si no
 * parsea o si el texto es DESIERTA/anulación.
 */
export function parseGobabiertoImporte(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (!s) return null;
  // DESIERTA / anulación: la fuente literalmente pone "DESIERTA" en la celda
  // de Importe. Eso NO es un monto — es estado. Devuelve null.
  if (/desiert|anul|cancel/i.test(s)) return null;
  // Strip currency symbol y espacios.
  s = s.replace(/^\$\s*/, "").replace(/\s+/g, "").trim();
  if (!s) return null;
  if (!/^[\d.,]+$/.test(s)) return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let cleaned: string;
  if (hasComma && hasDot) {
    cleaned = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    cleaned = s.replace(",", ".");
  } else if (hasDot) {
    const parts = s.split(".");
    const last = parts[parts.length - 1];
    if (parts.length > 1 && last.length === 3) cleaned = s.replace(/\./g, "");
    else cleaned = s;
  } else {
    cleaned = s;
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** `9/1/2026` o `29/01/2025` → ISO yyyy-mm-dd. Null si ilegible. */
export function parseGobabiertoFecha(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const dN = Number(dd);
  const mN = Number(mm);
  if (mN < 1 || mN > 12 || dN < 1 || dN > 31) return null;
  return `${m[3]}-${mm}-${dd}`;
}

// ─────────────────────────────────────────
// Parser principal
// ─────────────────────────────────────────

const HEADER_ALIASES = {
  numero: ["n° concurso", "n° licitacion", "n° licitación"],
  expediente: ["expediente"],
  fechaApertura: ["fecha apertura"],
  detalle: ["detalle"],
  firmasInvitadas: ["firmas invitadas"],
  adjudicacion: ["adjudicacion", "adjudicación"],
  importe: ["importe"],
} as const;

type ConceptKey = keyof typeof HEADER_ALIASES;

export interface ParseGobabiertoOptions {
  municipioId: string;
  fuenteUrl: string;
  /** Año del dataset si la fecha está vacía o malformada. */
  anioFallback: number;
}

export interface ParseGobabiertoResult {
  contrataciones: Contratacion[];
  warnings: string[];
}

/**
 * Detecta si una fila es continuación de la anterior (todos los campos de
 * "primary key" — N° + Expediente + Fecha + Detalle — vacíos).
 */
function isContinuationRow(
  cells: string[],
  idx: Partial<Record<ConceptKey, number>>,
): boolean {
  for (const k of ["numero", "expediente", "fechaApertura", "detalle"] as const) {
    const i = idx[k];
    if (i == null) continue;
    const v = cells[i];
    if (v != null && v.trim() !== "") return false;
  }
  return true;
}

export function parseCarlosCasaresLicitaciones(
  csv: string,
  opt: ParseGobabiertoOptions,
): ParseGobabiertoResult {
  const rows = splitCommaCsv(csv);
  const warnings: string[] = [];
  if (rows.length < 3) {
    // Esperamos 3 filas mínimo: banner + header + 1 dato.
    warnings.push("CSV demasiado corto (esperado: banner + header + datos)");
    return { contrataciones: [], warnings };
  }

  // Saltar banner (fila 0). Header real = fila 1.
  const headerNorm = rows[1].map((h) => h.trim().toLowerCase());
  const idx: Partial<Record<ConceptKey, number>> = {};
  for (const concept of Object.keys(HEADER_ALIASES) as ConceptKey[]) {
    for (const alias of HEADER_ALIASES[concept]) {
      const i = headerNorm.indexOf(alias);
      if (i !== -1) {
        idx[concept] = i;
        break;
      }
    }
  }
  const REQUIRED: ConceptKey[] = ["numero", "expediente", "firmasInvitadas", "adjudicacion", "importe"];
  const missing = REQUIRED.filter((c) => idx[c] == null);
  if (missing.length > 0) {
    warnings.push(`Header CSV no matchea schema gobabierto: faltan ${missing.join(", ")}`);
    return { contrataciones: [], warnings };
  }

  // Agrupar filas por concurso. Primera fila no-vacía con campos primarios
  // = nuevo grupo. Filas siguientes (campos primarios vacíos) = continuación.
  type Group = { primary: string[]; continuations: string[][] };
  const groups: Group[] = [];
  for (let r = 2; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.every((c) => c.trim() === "")) continue;
    if (isContinuationRow(cells, idx)) {
      const last = groups[groups.length - 1];
      if (last) last.continuations.push(cells);
      // Si es continuación huérfana (no hay grupo previo), se ignora.
      continue;
    }
    groups.push({ primary: cells, continuations: [] });
  }

  const out: Contratacion[] = [];
  for (const g of groups) {
    const primaryGet = (k: ConceptKey): string | null => {
      const i = idx[k];
      if (i == null) return null;
      const v = g.primary[i];
      return v == null ? null : v.trim() || null;
    };

    const numero = primaryGet("numero");
    const expediente = primaryGet("expediente");
    if (!numero && !expediente) continue; // Skip grupos vacíos

    const fechaRaw = primaryGet("fechaApertura");
    const fecha = parseGobabiertoFecha(fechaRaw);
    // Año: prefer el de la fecha; si no, último segmento del expediente
    // (`140/2026` → 2026); si no, fallback.
    let anio = opt.anioFallback;
    if (fecha) anio = Number(fecha.slice(0, 4));
    else if (expediente) {
      const m = expediente.match(/\/(\d{4})$/);
      if (m) anio = Number(m[1]);
    }

    // Buscar la fila adjudicada (primaria + continuaciones). La que tenga
    // Adjudicacion non-empty Y no sea DESIERTA cuenta como ganadora.
    const allRows = [g.primary, ...g.continuations];
    let adjudicacionRaw: string | null = null;
    let importeRaw: string | null = null;
    let isDesierta = false;
    for (const row of allRows) {
      const ai = idx.adjudicacion!;
      const ii = idx.importe!;
      const a = row[ai] != null ? row[ai].trim() : "";
      const imp = row[ii] != null ? row[ii].trim() : "";
      if (!a) continue;
      if (/desiert|anul|cancel/i.test(a)) {
        isDesierta = true;
        adjudicacionRaw = a;
        importeRaw = imp;
        break;
      }
      adjudicacionRaw = a;
      importeRaw = imp;
      break;
    }

    let estado: ContratacionEstado;
    let proveedor: string | null;
    let monto: number | null;
    let estadoRaw: string | null;

    if (isDesierta) {
      estado = "DESIERTA";
      proveedor = null;
      monto = null;
      estadoRaw = adjudicacionRaw;
    } else if (adjudicacionRaw) {
      estado = "ADJUDICADA";
      proveedor = adjudicacionRaw;
      monto = parseGobabiertoImporte(importeRaw);
      estadoRaw = "ADJUDICADA";
    } else {
      // No row with Adjudicacion → asumimos abierta o sin resolver.
      estado = "ABIERTA";
      proveedor = null;
      monto = null;
      estadoRaw = null;
    }

    // ID: prefiere expediente (incluye año), sino N°-anio.
    const idLocal = expediente ?? `${numero}-${anio}`;

    out.push({
      id: `${opt.municipioId}-${idLocal}`,
      municipioId: opt.municipioId,
      anio,
      estado,
      estadoRaw,
      objeto: primaryGet("detalle"),
      montoPresupuesto: monto,
      fechaApertura: fecha,
      lugarApertura: null, // gobabierto no expone este campo
      proveedor,
      fuenteUrl: opt.fuenteUrl,
      fuenteTipo: "OTRO",
    });
  }

  if (out.length === 0) {
    warnings.push("CSV parseado pero sin grupos con N° o expediente válidos");
  }
  return { contrataciones: out, warnings };
}
