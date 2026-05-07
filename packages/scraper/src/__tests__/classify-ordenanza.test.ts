/**
 * Golden tests del classifier de contenido de ordenanzas.
 *
 * Los fixtures son dumps REALES de 9 municipios capturados en Sprint 8
 * (packages/scraper/output/dumps/). Esto garantiza que el classifier resiste
 * los modos de falla reales (PDFs con `!` en vez de espacios, texto sin
 * espacios entre palabras, documentos combinados Fiscal+Impositiva) y no
 * sólo casos sintéticos.
 *
 * El classifier es heurístico: su contrato no es "100% acierto" sino
 * "UNKNOWN antes que wrong". Los tests reflejan esa actitud — verificamos
 * el `kind` esperado cuando el caso es claro, y que degrada a UNKNOWN
 * elegantemente en los casos con extracción rota.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { classifyOrdenanzaContent } from "../parsers/classify-ordenanza";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DUMPS_DIR = join(__dirname, "..", "..", "output", "dumps");

/**
 * Levanta un dump tal como fue grabado por scripts/dump-ordenanza-text.ts.
 * Cada archivo empieza con un header (URL:, Año:, Tarifas:, Longitud:) y
 * luego === PRIMEROS 8000 CHARS === con el texto real. Nos quedamos con
 * ese segmento — es lo que el classifier vería en producción tras un
 * fetch + extract parcial.
 */
function readDumpText(filename: string): string {
  const path = join(DUMPS_DIR, filename);
  if (!existsSync(path)) {
    throw new Error(`Dump no encontrado (correr Sprint 8 dump): ${path}`);
  }
  const raw = readFileSync(path, "utf-8");
  const marker = "=== PRIMEROS 8000 CHARS ===";
  const idx = raw.indexOf(marker);
  if (idx === -1) return raw;
  return raw.slice(idx + marker.length).trim();
}

describe("classify-ordenanza — contrato base", () => {
  it("texto vacío → UNKNOWN con score ≈ 0", () => {
    const result = classifyOrdenanzaContent("");
    expect(result.kind).toBe("UNKNOWN");
    expect(result.score).toBe(0);
  });

  it("documento pro-impositiva sintético → IMPOSITIVA", () => {
    const text = `
      ORDENANZA IMPOSITIVA EJERCICIO FISCAL 2026
      CAPÍTULO I - TASA POR SERVICIOS GENERALES
      Artículo 1: La alícuota será del 10 por mil sobre la valuación fiscal.
      CAPÍTULO II - TASA POR INSPECCIÓN DE SEGURIDAD E HIGIENE
      Artículo 5: La alícuota TISH general es del 0,8%.
      Derecho de construcción: $ 5.500 por m².
      Tasa Vial Rural: $ 850 por hectárea.
    `;
    const result = classifyOrdenanzaContent(text);
    expect(result.kind).toBe("IMPOSITIVA");
    expect(result.score).toBeGreaterThan(0.3);
  });

  it("documento pro-fiscal procedural sintético → FISCAL", () => {
    const text = `
      CÓDIGO FISCAL 2026 — PARTE FISCAL
      TÍTULO I - NORMAS GENERALES
      ARTÍCULO 1°: Domicilio fiscal del contribuyente.
      ARTÍCULO 2°: Responsabilidad solidaria de terceros responsables.
      ARTÍCULO 3°: Infracciones y prescripción de la acción fiscal.
      Procedimiento de determinación de oficio.
      Recurso de reconsideración ante el juez administrativo.
      Juicio de apremio para la cobranza coactiva.
    `.repeat(2); // duplicamos para acumular longitud + baja densidad monetaria
    const result = classifyOrdenanzaContent(text);
    expect(result.kind).toBe("FISCAL");
    expect(result.score).toBeLessThan(-0.2);
  });

  it("documento neutro / genérico → UNKNOWN", () => {
    const text = "Acta de reunión del Concejo Deliberante sobre espacio público.";
    const result = classifyOrdenanzaContent(text);
    expect(result.kind).toBe("UNKNOWN");
  });
});

describe("classify-ordenanza — golden contra dumps reales de Sprint 8", () => {
  // Casos claros: ordenanzas impositivas reales.
  // San Antonio de Areco: unlocked en Sprint 8, tiene "0,25% sobre valuación".
  it("San Antonio de Areco → IMPOSITIVA", () => {
    const text = readDumpText("060700-San_Antonio_de_Areco.txt");
    const result = classifyOrdenanzaContent(text);
    expect(result.kind).toBe("IMPOSITIVA");
    expect(result.score).toBeGreaterThan(0.1);
  });

  // Berazategui: Ordenanza Impositiva 2026, tiene tabla de alícuotas por zona.
  // Texto tiene "ALICUOTA" + "%" en abundancia.
  it("Berazategui → IMPOSITIVA", () => {
    const text = readDumpText("060091-Berazategui.txt");
    const result = classifyOrdenanzaContent(text);
    expect(result.kind).toBe("IMPOSITIVA");
  });

  // San Vicente: "por metro lineal de frente $X", claramente tarifario.
  it("San Vicente → IMPOSITIVA o UNKNOWN (no FISCAL)", () => {
    const text = readDumpText("060742-San_Vicente.txt");
    const result = classifyOrdenanzaContent(text);
    expect(result.kind).not.toBe("FISCAL");
  });

  // Sprint 10 cambió la URL de Belgrano al PDF "Ordenanza Fiscal e Impositiva
  // - parte 4" (2024), que es el documento impositivo real (no el código
  // procedural que tenía antes). El classifier ahora debería ver señales
  // IMPOSITIVA fuertes — "PARTE IMPOSITIVA", "ARTÍCULO ... establecer ... tasa",
  // tablas con `$` por zona.
  it("General Belgrano parte 4 (Sprint 10 URL) → IMPOSITIVA", () => {
    const text = readDumpText("060294-General_Belgrano.txt");
    const result = classifyOrdenanzaContent(text);
    expect(result.kind).toBe("IMPOSITIVA");
    expect(result.score).toBeGreaterThan(0.3);
  });

  // Casos degradados: PDF roto, XLSX, texto basura. No esperamos
  // clasificación firme — sólo que no explote.
  it("Chivilcoy (PDF sin espacios) → no lanza error", () => {
    const text = readDumpText("060217-Chivilcoy.txt");
    expect(() => classifyOrdenanzaContent(text)).not.toThrow();
  });

  it("Carmen de Areco (XLSX binary garbage) → UNKNOWN probable", () => {
    const text = readDumpText("060154-Carmen_de_Areco.txt");
    const result = classifyOrdenanzaContent(text);
    // XLSX raw es texto basura; el classifier debería no encontrar señales
    // fuertes en ninguna dirección.
    expect(Math.abs(result.score)).toBeLessThan(0.5);
  });
});

describe("classify-ordenanza — signals transparentes", () => {
  it("reporta positiveHits y negativeHits por separado", () => {
    const text = `
      Tasa por Servicios Generales 10 por mil sobre valuación fiscal.
      Domicilio fiscal del contribuyente.
    `;
    const result = classifyOrdenanzaContent(text);
    expect(result.signals.positiveHits).toHaveProperty("por_mil");
    expect(result.signals.positiveHits).toHaveProperty("valuacion_fiscal");
    expect(result.signals.negativeHits).toHaveProperty("domicilio_fiscal");
  });

  it("reporta monetaryDensity > 0 cuando hay $ o %", () => {
    const text = "Artículo 1: $ 1.500 por m². Alícuota 0,5%.";
    const result = classifyOrdenanzaContent(text);
    expect(result.signals.monetaryDensity).toBeGreaterThan(0);
  });

  it("caps hits por señal a 5 para no saturar por repetición", () => {
    // Si "alicuota" apareciera 100 veces, el weight contribuye como si fueran 5.
    const text = "alicuota ".repeat(100);
    const result = classifyOrdenanzaContent(text);
    // 5 hits × weight 1 = 5, el score no debe explotar.
    expect(result.score).toBeLessThanOrEqual(0.3);
  });
});
