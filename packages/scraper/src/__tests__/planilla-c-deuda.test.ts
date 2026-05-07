/**
 * Sprint 20 — Tests del parser de Planilla C (Stock de Deuda PBA).
 *
 * Cubrimos:
 *  - Helpers puros (cellText, cellNumber, cellDate, isSectionHeader)
 *  - Golden test E2E sobre fixture descargado de Berisso Q1 2026
 *
 * El fixture (`fixtures/planilla-c/berisso-q1-2026.xlsx`) es un snapshot
 * real provincial; cualquier cambio en el parser o en el schema upstream
 * debería romper este test. Si Berisso re-genera con otra estructura,
 * se actualiza fixture + golden valores.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  cellText,
  cellNumber,
  cellDate,
  isSectionHeader,
  extractFechaFromUrl,
  parsePlanillaC,
} from "../parsers/planilla-c-deuda";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, "fixtures", "planilla-c", "berisso-q1-2026.xlsx");

// ─────────────────────────────────────────
// cellText
// ─────────────────────────────────────────

describe("cellText", () => {
  it("trims strings", () => {
    expect(cellText("  hola  ")).toBe("hola");
  });

  it("converts numbers", () => {
    expect(cellText(1234)).toBe("1234");
  });

  it("formats Date as ISO", () => {
    expect(cellText(new Date("2026-03-31T00:00:00Z"))).toContain("2026-03-31");
  });

  it("handles richText cells (typical en planillas con bold)", () => {
    expect(cellText({ richText: [{ text: "TOTAL " }, { text: "DEUDA" }] })).toBe(
      "TOTAL DEUDA",
    );
  });

  it("resuelve fórmulas via .result", () => {
    expect(cellText({ formula: "SUM(A1:A5)", result: 12345 })).toBe("12345");
  });

  it("null/undefined → ''", () => {
    expect(cellText(null)).toBe("");
    expect(cellText(undefined)).toBe("");
  });
});

// ─────────────────────────────────────────
// cellNumber
// ─────────────────────────────────────────

describe("cellNumber", () => {
  it("number → number", () => {
    expect(cellNumber(1234.56)).toBe(1234.56);
  });

  it("string AR (12.345,67) → number", () => {
    expect(cellNumber("12.345,67")).toBeCloseTo(12345.67, 2);
  });

  it("fórmula con result → result", () => {
    expect(cellNumber({ formula: "A1*2", result: 100 })).toBe(100);
  });

  it("null / texto no numérico → null", () => {
    expect(cellNumber(null)).toBeNull();
    expect(cellNumber("hola")).toBeNull();
  });
});

// ─────────────────────────────────────────
// cellDate
// ─────────────────────────────────────────

describe("cellDate", () => {
  it("Date → yyyy-mm-dd", () => {
    expect(cellDate(new Date("2026-03-31T00:00:00Z"))).toBe("2026-03-31");
  });

  it("string ISO → yyyy-mm-dd", () => {
    expect(cellDate("2026-03-31")).toBe("2026-03-31");
  });

  it("null → null", () => {
    expect(cellDate(null)).toBeNull();
  });
});

// ─────────────────────────────────────────
// isSectionHeader
// ─────────────────────────────────────────

describe("isSectionHeader", () => {
  it("filas numeradas son sección", () => {
    expect(isSectionHeader("1. DEUDA PÚBLICA")).toBe(true);
    expect(isSectionHeader("1.1. DEUDA PÚBLICA CONSOLIDADA")).toBe(true);
    expect(isSectionHeader("1.3. DEUDA FLOTANTE")).toBe(true);
  });

  it("bloques uppercase de subgrupo son sección", () => {
    expect(isSectionHeader("ORGANISMOS PUBLICOS PROVINCIALES")).toBe(true);
    expect(isSectionHeader("ORGANISMOS NACIONALES")).toBe(true);
    expect(isSectionHeader("ENTIDADES FINANCIERAS")).toBe(true);
  });

  it("filas TOTAL son sección (no contar como acreedor)", () => {
    expect(isSectionHeader("TOTAL DEUDA")).toBe(true);
    expect(isSectionHeader("TOTAL CONSOLIDADA")).toBe(true);
  });

  it("acreedores reales NO son sección", () => {
    expect(isSectionHeader("TESORO PROVINCIAL")).toBe(false);
    expect(isSectionHeader("A.R.C.A")).toBe(false);
    expect(isSectionHeader("I.P.S.")).toBe(false);
    expect(isSectionHeader("PERSONAL")).toBe(false);
    expect(isSectionHeader("PROVEEDORES")).toBe(false);
  });

  it("string vacío → sección (skip)", () => {
    expect(isSectionHeader("")).toBe(true);
    expect(isSectionHeader("   ")).toBe(true);
  });
});

// ─────────────────────────────────────────
// extractFechaFromUrl (Sprint 23)
// ─────────────────────────────────────────

describe("extractFechaFromUrl", () => {
  it("formato dd-mm-yyyy en filename", () => {
    expect(
      extractFechaFromUrl(
        "https://carmendeareco.gob.ar/wp-content/uploads/2024/10/30-09-2024.xlsx",
      ),
    ).toBe("2024-09-30");
  });

  it("formato d-m-yyyy con dígito simple", () => {
    expect(
      extractFechaFromUrl(
        "https://example.com/STOCK-DE-DEUDA-Planilla-Modelo-30-9-2024.xlsx",
      ),
    ).toBe("2024-09-30");
  });

  it("año 2 dígitos → 20XX (Madariaga case)", () => {
    expect(
      extractFechaFromUrl(
        "https://www.madariaga.gob.ar/uploads_archivos/stock_deuda_30-06-22.xlsx",
      ),
    ).toBe("2022-06-30");
  });

  it("formato AL-31-12-2024 (Carmen de Areco case)", () => {
    expect(
      extractFechaFromUrl(
        "http://carmendeareco.gob.ar/STOCK-DE-DEUDA-Y-PERFIL-AL-31-12-2024.xlsx",
      ),
    ).toBe("2024-12-31");
  });

  it("pattern mm-yyyy (sin día) → último día del mes", () => {
    expect(
      extractFechaFromUrl(
        "https://www.lincoln.gob.ar/sites/default/files/stock_de_deuda_y_p_de_vtos_06-2022.xlsx",
      ),
    ).toBe("2022-06-30");
  });

  it("pattern mm-yyyy diciembre → 31", () => {
    expect(
      extractFechaFromUrl(
        "https://www.lincoln.gob.ar/sites/default/files/stock_de_deuda_y_p_de_vtos_12-2021.xlsx",
      ),
    ).toBe("2021-12-31");
  });

  it("prefiere la fecha más cercana al final (no la del path)", () => {
    // El path tiene "2024/10/" pero la fecha de corte es 30-9-2024
    expect(
      extractFechaFromUrl(
        "https://x.gob.ar/wp-content/uploads/2024/10/03.01-STOCK-30-9-2024.xlsx",
      ),
    ).toBe("2024-09-30");
  });

  it("fechas inválidas → null", () => {
    expect(extractFechaFromUrl("https://x.com/file.xlsx")).toBeNull();
    expect(extractFechaFromUrl("https://x.com/32-13-2024.xlsx")).toBeNull();
  });

  it("URL-encoded space en filename se decodea", () => {
    expect(
      extractFechaFromUrl(
        "https://x.com/Stock%20de%20Deuda%2030-09-2024.xlsx",
      ),
    ).toBe("2024-09-30");
  });
});

// ─────────────────────────────────────────
// parsePlanillaC — golden test sobre Berisso Q1 2026
// ─────────────────────────────────────────

describe("parsePlanillaC — Berisso Q1 2026 (fixture real)", () => {
  it("parsea snapshot completo sin warnings", async () => {
    const buf = readFileSync(FIXTURE);
    const r = await parsePlanillaC(buf, {
      municipioId: "060098",
      fuenteUrl: "https://berisso.gob.ar/storage/pdfs/34803f0b-dfb6-495b-9c97-9e1bdf55b257.xlsx",
    });
    expect(r.warnings).toEqual([]);
    expect(r.snapshot).not.toBeNull();
  });

  it("detecta nombre del municipio (BERISSO) desde 'Municipalidad de:'", async () => {
    const buf = readFileSync(FIXTURE);
    const r = await parsePlanillaC(buf, { municipioId: "060098", fuenteUrl: "x" });
    expect(r.snapshot!.nombreFuente).toBe("BERISSO");
  });

  it("detecta fecha del corte 2026-03-31", async () => {
    const buf = readFileSync(FIXTURE);
    const r = await parsePlanillaC(buf, { municipioId: "060098", fuenteUrl: "x" });
    expect(r.snapshot!.fechaSnapshot).toBe("2026-03-31");
  });

  it("identifica 7 acreedores con saldo > 0", async () => {
    const buf = readFileSync(FIXTURE);
    const r = await parsePlanillaC(buf, { municipioId: "060098", fuenteUrl: "x" });
    expect(r.snapshot!.acreedoresConSaldo).toBe(7);
    expect(r.snapshot!.acreedores).toHaveLength(7);
    const nombres = r.snapshot!.acreedores.map((a) => a.nombre);
    expect(nombres).toContain("TESORO PROVINCIAL");
    expect(nombres).toContain("A.R.C.A");
    expect(nombres).toContain("PERSONAL");
    expect(nombres).toContain("PROVEEDORES");
  });

  it("calcula saldoTotal igual a la suma de acreedores", async () => {
    const buf = readFileSync(FIXTURE);
    const r = await parsePlanillaC(buf, { municipioId: "060098", fuenteUrl: "x" });
    const sumaManual = r.snapshot!.acreedores.reduce((s, a) => s + a.saldo, 0);
    expect(r.snapshot!.saldoTotal).toBeCloseTo(sumaManual, 2);
    // Sanidad: el orden de magnitud es ~$2.5B (Berisso, ~88k habitantes)
    expect(r.snapshot!.saldoTotal).toBeGreaterThan(1_000_000_000);
    expect(r.snapshot!.saldoTotal).toBeLessThan(10_000_000_000);
  });

  it("preserva la sección jerárquica de cada acreedor", async () => {
    const buf = readFileSync(FIXTURE);
    const r = await parsePlanillaC(buf, { municipioId: "060098", fuenteUrl: "x" });
    const tesoro = r.snapshot!.acreedores.find((a) => a.nombre === "TESORO PROVINCIAL");
    expect(tesoro?.seccion).toMatch(/ORGANISMOS PUBLICOS/);
    const personal = r.snapshot!.acreedores.find((a) => a.nombre === "PERSONAL");
    expect(personal?.seccion).toMatch(/DEUDA FLOTANTE/);
  });

  it("preserva trazabilidad: fuenteUrl y parsedAt", async () => {
    const buf = readFileSync(FIXTURE);
    const r = await parsePlanillaC(buf, {
      municipioId: "060098",
      fuenteUrl: "https://example.com/source.xlsx",
    });
    expect(r.snapshot!.fuenteUrl).toBe("https://example.com/source.xlsx");
    expect(r.snapshot!.parsedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO
  });
});

// ─────────────────────────────────────────
// parsePlanillaC — fallos manejados
// ─────────────────────────────────────────

describe("parsePlanillaC — robustez", () => {
  it("buffer inválido → warning, snapshot null", async () => {
    const r = await parsePlanillaC(new ArrayBuffer(0), {
      municipioId: "060098",
      fuenteUrl: "x",
    });
    expect(r.snapshot).toBeNull();
    expect(r.warnings.some((w) => /load fail/.test(w))).toBe(true);
  });
});
