/**
 * Base utilities for bulk data loading from national sources.
 *
 * Each loader reads a CSV/JSON file with data for all 135 municipalities,
 * maps party codes (INDEC 6-digit) to municipioIds, and generates
 * DataPointInsert arrays.
 */

import { readFileSync } from "node:fs";
import { ConfidenceLevel } from "@radar-municipal/core";
import type { DataPointInsert } from "../writers/data-point-writer";

export interface CsvRow {
  [key: string]: string;
}

/**
 * Parse a simple CSV file into rows.
 * Expects header row. Handles quoted fields.
 */
export function parseCsv(filePath: string, separator = ","): CsvRow[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(separator).map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a JSON file.
 */
export function parseJson<T = unknown>(filePath: string): T {
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
}

/**
 * Create a base DataPointInsert with common source fields.
 */
export function makeBaseInsert(
  municipioId: string,
  campo: string,
  anio: number,
  opts: {
    fuenteCapa: string;
    fuenteOrganismo: string;
    fuenteUrl?: string | null;
    fuenteFormato?: string;
    confianzaNivel?: string;
    confianzaNotas?: string | null;
  }
): Omit<DataPointInsert, "valorNumerico" | "valorTexto" | "valorBooleano"> {
  return {
    municipioId,
    campo,
    anio,
    fuenteCapa: opts.fuenteCapa,
    fuenteOrganismo: opts.fuenteOrganismo,
    fuenteUrl: opts.fuenteUrl ?? null,
    fuenteFormato: opts.fuenteFormato ?? null,
    fuenteFechaAcceso: new Date(),
    confianzaNivel: opts.confianzaNivel ?? ConfidenceLevel.ALTA,
    confianzaNotas: opts.confianzaNotas ?? null,
  };
}

/**
 * Normalize a partido code to 6 digits (INDEC format).
 * Some sources use 3-digit codes (partido within provincia),
 * need to prepend "06" for Buenos Aires.
 */
export function normalizePartidoCode(code: string): string {
  const cleaned = code.replace(/\D/g, "");
  if (cleaned.length === 3) return `06${cleaned.padStart(4, "0")}`;
  if (cleaned.length === 4) return `06${cleaned}`;
  if (cleaned.length === 5) return `0${cleaned}`;
  return cleaned.padStart(6, "0");
}
