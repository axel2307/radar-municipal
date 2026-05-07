/**
 * Golden tests del parser de Ordenanzas Impositivas.
 *
 * Cada fixture declara los valores esperados de las 4 tarifas y los montos
 * aplicados a los caso testigo default. Un cambio en los regex o en la
 * lógica de cómputo debe romper estos tests — son el contrato del parser.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  parseOrdenanzaImpositivaFromHtml,
  extractTarifas,
  computeMontosFromTarifas,
  extractAnioFiscal,
  normalizeText,
} from "../parsers/ordenanza-impositiva";
import { CASOS_TESTIGO_DEFAULT, ConfidenceLevel } from "@radar-municipal/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readFixture = (name: string) =>
  readFileSync(join(__dirname, "fixtures", name), "utf-8");

// Tolerancia ±1% para golden (redondeos).
const approx = (actual: number, expected: number, pct = 0.01) => {
  expect(Math.abs(actual - expected) / expected).toBeLessThan(pct);
};

describe("ordenanza-impositiva — utilidades puras", () => {
  it("extractAnioFiscal detecta año en títulos típicos", () => {
    expect(extractAnioFiscal("Ordenanza Impositiva 2026")).toBe(2026);
    expect(extractAnioFiscal("ORDENANZA IMPOSITIVA N° 2150/2025")).toBe(2025);
    expect(extractAnioFiscal("Ejercicio Fiscal 2026")).toBe(2026);
    expect(extractAnioFiscal("sin año aquí")).toBeNull();
    expect(extractAnioFiscal("año 1999")).toBeNull(); // fuera de rango
  });

  it("normalizeText colapsa whitespace y preserva saltos de párrafo", () => {
    const input = "hola\t  \nmundo\r\n\r\n\r\nfin";
    const out = normalizeText(input);
    expect(out).toContain("hola\nmundo");
    expect(out).not.toContain("\n\n\n");
  });

  it("computeMontosFromTarifas aplica los 4 casos testigo default", () => {
    const tarifas = {
      tsgPorMil: 10,
      tishPorciento: 1,
      tasaVialRuralPorHa: 1000,
      derechoConstruccionPorM2: 5000,
      derechoConstruccionAlicuota: null,
    };
    const montos = computeMontosFromTarifas(tarifas);
    // Vivienda: 10/1000 * 40M = 400.000
    expect(montos.vivienda).toBe(400_000);
    // Comercio: 1/100 * 50M = 500.000
    expect(montos.comercio).toBe(500_000);
    // Rural: 1000 * 100 = 100.000
    expect(montos.rural).toBe(100_000);
    // Construcción: 5000 * 100 = 500.000
    expect(montos.construccion).toBe(500_000);
  });

  it("computeMontosFromTarifas respeta parámetros custom", () => {
    const montos = computeMontosFromTarifas(
      {
        tsgPorMil: 12,
        tishPorciento: null,
        tasaVialRuralPorHa: null,
        derechoConstruccionPorM2: null,
        derechoConstruccionAlicuota: null,
      },
      {
        ...CASOS_TESTIGO_DEFAULT,
        vivienda: { valuacionFiscal: 20_000_000, zona: "x" },
      }
    );
    expect(montos.vivienda).toBe(240_000); // 12/1000 * 20M
    expect(montos.comercio).toBeNull();
    expect(montos.rural).toBeNull();
    expect(montos.construccion).toBeNull();
  });

  it("extractTarifas retorna todos null para texto vacío", () => {
    const t = extractTarifas("");
    expect(t).toEqual({
      tsgPorMil: null,
      tishPorciento: null,
      tasaVialRuralPorHa: null,
      derechoConstruccionPorM2: null,
      derechoConstruccionAlicuota: null,
    });
  });

  it("extractTarifas rechaza valores fuera de rango razonable", () => {
    // TSG de 500‰ no es plausible
    const t = extractTarifas("alícuota del 500 por mil sobre valuación");
    expect(t.tsgPorMil).toBeNull();
  });
});

describe("ordenanza-impositiva — golden HTML Bahía Blanca 2026", () => {
  const html = readFixture("ordenanza-impositiva-bahiablanca.html");
  const result = parseOrdenanzaImpositivaFromHtml(html, {
    url: "https://www.bahiablanca.gob.ar/ordenanza-impositiva-2026",
    fechaAcceso: "2026-04-18",
  });

  it("parsea con success=true", () => {
    expect(result.success).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("detecta año fiscal 2026", () => {
    expect(result.anioFiscal).toBe(2026);
  });

  it("extrae las 4 tarifas correctas", () => {
    expect(result.tarifas.tsgPorMil).toBe(10.5);
    expect(result.tarifas.tishPorciento).toBe(1.2);
    expect(result.tarifas.tasaVialRuralPorHa).toBe(1200);
    expect(result.tarifas.derechoConstruccionPorM2).toBe(8500);
  });

  it("calcula montos con caso testigo default", () => {
    // 10,50/1000 * 40M = 420.000
    approx(result.montoVivienda.valor!, 420_000);
    // 1,20/100 * 50M = 600.000
    approx(result.montoComercio.valor!, 600_000);
    // 1200 * 100 = 120.000
    approx(result.montoRural.valor!, 120_000);
    // 8500 * 100 = 850.000
    approx(result.montoConstruccion.valor!, 850_000);
  });

  it("marca provenance con capa municipal + confianza MEDIA", () => {
    expect(result.montoVivienda.fuente?.capa).toBe("MUNICIPAL");
    expect(result.montoVivienda.fuente?.url).toBe(
      "https://www.bahiablanca.gob.ar/ordenanza-impositiva-2026"
    );
    expect(result.montoVivienda.fuente?.formato).toBe("HTML");
    expect(result.montoVivienda.fuente?.fechaAcceso).toBe("2026-04-18");
    expect(result.montoVivienda.confianza?.nivel).toBe(ConfidenceLevel.MEDIA);
  });

  it("ignora scripts y estilos embebidos", () => {
    expect(result.rawText).not.toContain("console.log");
  });
});

describe("ordenanza-impositiva — golden TEXT Tandil 2026", () => {
  // Tandil fixture es .txt plano — usamos HTML path encapsulándolo en <body>
  const txt = readFixture("ordenanza-impositiva-tandil.txt");
  const html = `<html><body><pre>${txt}</pre></body></html>`;
  const result = parseOrdenanzaImpositivaFromHtml(html, {
    url: "https://www.tandil.gov.ar/ordenanza-impositiva-2026.txt",
  });

  it("extrae tarifas desde texto plano", () => {
    expect(result.tarifas.tsgPorMil).toBe(8.75);
    expect(result.tarifas.tishPorciento).toBe(0.95);
    expect(result.tarifas.tasaVialRuralPorHa).toBe(950);
    expect(result.tarifas.derechoConstruccionPorM2).toBe(6200);
  });

  it("detecta año fiscal 2026", () => {
    expect(result.anioFiscal).toBe(2026);
  });

  it("calcula montos esperados dentro de tolerancia", () => {
    // 8,75/1000 * 40M = 350.000
    approx(result.montoVivienda.valor!, 350_000);
    // 0,95/100 * 50M = 475.000
    approx(result.montoComercio.valor!, 475_000);
    // 950 * 100 = 95.000
    approx(result.montoRural.valor!, 95_000);
    // 6200 * 100 = 620.000
    approx(result.montoConstruccion.valor!, 620_000);
  });
});

describe("ordenanza-impositiva — TSG expresada como % de valuación (Sprint 8)", () => {
  // Observado en San Antonio de Areco 2025: la ordenanza publica la tasa por
  // servicios urbanos como "Base Imponible: Valuación Fiscal suministrada por
  // ARBA. 0,25%" — matemáticamente 0,25% == 2,5 por mil. El parser debe
  // reconocer esta variante y convertirla antes de aplicar el caso testigo.
  it("captura '0,25%' sobre valuación fiscal y lo convierte a 2,5 por mil", () => {
    const txt = `
      Tasa por Servicios Urbanos
      Artículo 1: Los contribuyentes abonarán la tasa en forma mensual.
      Base Imponible: Valuación Fiscal suministrada por ARBA. 0,25%
      MINIMO $10.960
    `;
    const html = `<html><body><pre>${txt}</pre></body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.tarifas.tsgPorMil).toBe(2.5);
  });

  it("captura '0,5%' sobre valuación fiscal como 5 por mil", () => {
    const txt = `
      Tasa por Servicios Generales
      Sobre la Valuación Fiscal se aplicará el 0,5% anual.
    `;
    const html = `<html><body><pre>${txt}</pre></body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.tarifas.tsgPorMil).toBe(5);
  });

  it("NO confunde TISH con TSG cuando se habla de ingresos brutos", () => {
    // Este texto tiene "valuación fiscal" en algún lado pero el "0,6%"
    // está específicamente en contexto de ingresos (TISH). El lookahead
    // negativo del patrón TSG-% debe descartar esta match.
    const txt = `
      La valuación fiscal de referencia para comercio minorista.
      La alícuota TISH será del 0,6% sobre ingresos brutos.
    `;
    const html = `<html><body><pre>${txt}</pre></body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.tarifas.tsgPorMil).toBeNull();
    expect(result.tarifas.tishPorciento).toBe(0.6);
  });

  it("prefiere el patrón canónico 'por mil' sobre el fallback '%'", () => {
    // Si conviven ambos, gana el canónico (orden de patterns).
    const txt = `
      Tasa por Servicios Generales: alícuota del 8,00 por mil sobre valuación.
      Base Imponible: Valuación Fiscal. 0,25%
    `;
    const html = `<html><body><pre>${txt}</pre></body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.tarifas.tsgPorMil).toBe(8);
  });
});

describe("ordenanza-impositiva — variantes Sprint 11", () => {
  // Sprint 11: relax ground for IMPOSITIVA-classified docs that el batch
  // detectaba pero no parseaba. Los dos fixes aquí son surgical:
  //
  //   - "Red Vial Municipal" como variante de "Red Vial Rural"
  //   - año fiscal en doc unificado "Ordenanza Fiscal e Impositiva 2024"

  it("extractAnioFiscal captura 'Ordenanza Fiscal e Impositiva 2024' (Belgrano-style)", () => {
    expect(extractAnioFiscal("ORDENANZA FISCAL E IMPOSITIVA 2024")).toBe(2024);
    expect(extractAnioFiscal("Ordenanza Fiscal e Impositiva 2025")).toBe(2025);
    // Y la variante con "Ordenanza Fiscal" sola (Cañuelas)
    expect(extractAnioFiscal("ORDENANZA FISCAL 2025 - PARTE GENERAL")).toBe(2025);
  });

  it("extractAnioFiscal sigue priorizando 'ejercicio fiscal' cuando hay dos años", () => {
    // En Belgrano hay "DECRETO N° 901/2024" antes y "ORDENANZA FISCAL E
    // IMPOSITIVA 2024" después — ambos son 2024 así que ok. Pero queremos
    // garantizar el orden: "ejercicio fiscal" siempre gana.
    const txt = "Decreto 50/2023 ... Ejercicio Fiscal 2025 ... Ordenanza Fiscal 2024";
    expect(extractAnioFiscal(txt)).toBe(2025);
  });

  it("extractTasaVialRuralPorHa captura 'Red Vial Municipal' (San Vicente 2023)", () => {
    const txt = `
      Capítulo IV - Tasa por Conservación, Reparación y Mejorado de la Red Vial Municipal
      Artículo 4°: De acuerdo a lo establecido en la Ordenanza Fiscal vigente se fija el
      siguiente valor:
      Por hectárea $71,00
    `;
    const html = `<html><body><pre>${txt}</pre></body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.tarifas.tasaVialRuralPorHa).toBe(71);
  });

  it("extractTasaVialRuralPorHa sigue capturando 'Red Vial Rural' canónico", () => {
    const txt = `Tasa Vial Rural — $ 850 por hectárea`;
    const html = `<html><body><pre>${txt}</pre></body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.tarifas.tasaVialRuralPorHa).toBe(850);
  });

  it("extractTasaVialRuralPorHa NO matchea cuando 'municipal' no es vial", () => {
    // El regex requiere "vial" + "(rural|municipal)". "Tasa municipal" sin
    // "vial" no debe matchear, ni "ingresos municipales" + "por ha" (que no
    // sería razonable de todas formas).
    const txt = `Tasa Municipal de Servicios — $ 850 por mes`;
    const html = `<html><body><pre>${txt}</pre></body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.tarifas.tasaVialRuralPorHa).toBeNull();
  });
});

describe("ordenanza-impositiva — alícuota sobre valor de obra (Sprint 13)", () => {
  // Sprint 12 confirmó (vía inspect-construccion) que General Belgrano y otros
  // PBA NO usan $/m² fijo — usan alícuota sobre valor de obra. El extractor
  // debe reconocer la estructura "DERECHOS DE CONSTRUCCIÓN ... base imponible
  // = valor de la obra ... Establécese N% el alícuota". El fallback al
  // costo de referencia es lo que recupera el monto computado.

  it("captura el patrón Belgrano '1%' sobre valor de obra", () => {
    const txt = `
      TÍTULO XIII - DERECHOS DE CONSTRUCCIÓN
      ARTÍCULO 35°. La base imponible estará dada por el valor de la obra
      determinada por la Dirección de Obras Particulares según las superficies y
      categorías construidas.
      ARTÍCULO 36°. Establécese en el uno por ciento (1%) el alícuota a aplicar
      sobre la base imponible para el cómputo del derecho.
    `;
    const html = `<html><body><pre>${txt}</pre></body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.tarifas.derechoConstruccionAlicuota).toBe(1);
    expect(result.tarifas.derechoConstruccionPorM2).toBeNull();
  });

  it("captura alícuota '1,5%' (decimal con coma)", () => {
    const txt = `
      DERECHOS DE EDIFICACIÓN
      Sobre el valor de la obra determinada se aplicará una alícuota del 1,5%
      en concepto del derecho establecido en este título.
    `;
    const html = `<html><body><pre>${txt}</pre></body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.tarifas.derechoConstruccionAlicuota).toBe(1.5);
  });

  it("computeMontosFromTarifas usa alícuota cuando $/m² es null", () => {
    const tarifas = {
      tsgPorMil: null,
      tishPorciento: null,
      tasaVialRuralPorHa: null,
      derechoConstruccionPorM2: null,
      derechoConstruccionAlicuota: 1, // 1%
    };
    const montos = computeMontosFromTarifas(tarifas);
    // 1% × 2.000.000 ARS/m² × 100 m² = 2.000.000
    expect(montos.construccion).toBe(2_000_000);
  });

  it("computeMontosFromTarifas prefiere $/m² sobre alícuota cuando hay ambos", () => {
    const tarifas = {
      tsgPorMil: null,
      tishPorciento: null,
      tasaVialRuralPorHa: null,
      derechoConstruccionPorM2: 5000,
      derechoConstruccionAlicuota: 1,
    };
    const montos = computeMontosFromTarifas(tarifas);
    // 5000 × 100 = 500.000 (gana $/m²); NO 2.000.000 (alícuota fallback).
    expect(montos.construccion).toBe(500_000);
  });

  it("computeMontosFromTarifas devuelve null si alícuota presente pero costoReferencia falta", () => {
    const tarifas = {
      tsgPorMil: null,
      tishPorciento: null,
      tasaVialRuralPorHa: null,
      derechoConstruccionPorM2: null,
      derechoConstruccionAlicuota: 1,
    };
    const casos = {
      ...CASOS_TESTIGO_DEFAULT,
      construccion: {
        ...CASOS_TESTIGO_DEFAULT.construccion,
        costoReferenciaPorM2: undefined,
      },
    };
    const montos = computeMontosFromTarifas(tarifas, casos);
    expect(montos.construccion).toBeNull();
  });

  it("rechaza alícuota fuera de rango razonable (>10%)", () => {
    const txt = `
      DERECHOS DE CONSTRUCCIÓN
      Sobre el valor de la obra se aplicará una alícuota del 25%.
    `;
    const html = `<html><body><pre>${txt}</pre></body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.tarifas.derechoConstruccionAlicuota).toBeNull();
  });

  it("NO matchea cuando el % está lejos del header DERECHO DE CONSTRUCCIÓN", () => {
    const txt = `
      DERECHOS DE CONSTRUCCIÓN
      Texto sin valores tarifarios aquí.
      ${"x ".repeat(2000)}
      Por descuento del 5% por pago anticipado, según artículo X.
    `;
    const html = `<html><body><pre>${txt}</pre></body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.tarifas.derechoConstruccionAlicuota).toBeNull();
  });

  it("NO matchea cuando la ventana no menciona obra/edificación/valor", () => {
    // Window mention obligatorio: si solo hay un % suelto cerca del header
    // sin contexto de obra, debe descartarse para evitar falsos positivos
    // (ej: descuentos por pago, multas, etc.).
    const txt = `
      DERECHOS DE CONSTRUCCIÓN
      Capítulo de descuentos: 5% por pago anticipado. Recargo del 2% mensual.
    `;
    const html = `<html><body><pre>${txt}</pre></body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.tarifas.derechoConstruccionAlicuota).toBeNull();
  });
});

describe("ordenanza-impositiva — degradación elegante", () => {
  it("HTML sin datos retorna success=false con 4 warnings", () => {
    const result = parseOrdenanzaImpositivaFromHtml(
      "<html><body><h1>Página genérica sin tributos</h1></body></html>",
      { url: "https://example.test/no-data" }
    );
    expect(result.success).toBe(false);
    expect(result.warnings).toHaveLength(4);
    expect(result.montoVivienda.valor).toBeNull();
    expect(result.montoVivienda.confianza?.nivel).toBe(ConfidenceLevel.ESTIMACION);
  });

  it("HTML con tarifas parciales reporta solo los missing", () => {
    const html = `<html><body>
      <p>Alícuota del 9,25 por mil sobre valuación fiscal.</p>
      <p>Alícuota general TISH: 1,00%</p>
    </body></html>`;
    const result = parseOrdenanzaImpositivaFromHtml(html, { url: "x" });
    expect(result.success).toBe(true);
    expect(result.tarifas.tsgPorMil).toBe(9.25);
    expect(result.tarifas.tishPorciento).toBe(1);
    expect(result.tarifas.tasaVialRuralPorHa).toBeNull();
    expect(result.tarifas.derechoConstruccionPorM2).toBeNull();
    expect(result.warnings).toHaveLength(2);
  });
});
