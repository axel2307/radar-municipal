/**
 * Tests del batch CLI de ordenanzas impositivas.
 *
 * Cobertura:
 *   - parseArgs: flags, defaults, validaciones
 *   - extractOrdenanzaTargets: filtrado + dedupe por municipioId
 *   - summarize: conteos correctos (success, partial, failed, por tarifa)
 *   - attemptToPresionImpositivaData: shape correcta cuando hay result
 *   - buildReport: incluye secciones esperadas
 *
 * NO toca red: todo el parser real queda en otros tests (ordenanza-impositiva.test.ts).
 */

import { describe, it, expect } from "vitest";
import {
  parseArgs,
  extractOrdenanzaTargets,
  summarize,
  attemptToPresionImpositivaData,
  buildReport,
  type ParseAttempt,
  type OrdenanzaTarget,
} from "../cli/batch-parse-ordenanzas";
import type { ClassificationResult, OrdenanzaKind } from "../parsers/classify-ordenanza";
import {
  ConfidenceLevel,
  DocumentCategory,
  DocumentFormat,
  SourceLayer,
  type PilotAuditData,
  type PilotAuditEntry,
} from "@radar-municipal/core";

// ─────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────

const mkEntry = (
  id: string,
  docs: Array<{ categoria: DocumentCategory; publicado: boolean; url: string | null }>,
): PilotAuditEntry => ({
  municipioId: id,
  fechaAuditoria: "2026-04-18",
  auditor: "test",
  accesibilidad: {
    urlPortal: "https://x.test",
    portalAccesible: true,
    clicksDesdeHome: 1,
    menuTransparenciaVisible: true,
  },
  documentos: docs.map((d) => ({
    categoria: d.categoria,
    publicado: d.publicado,
    url: d.url,
    formato: DocumentFormat.PDF,
    anio: null,
    trimestre: null,
    fechaPublicacion: null,
    fechaCorte: null,
    esParseable: true,
    notas: null,
  })),
});

const mkSourcedValue = (valor: number, url: string) => ({
  valor,
  fuente: {
    capa: SourceLayer.MUNICIPAL,
    organismo: "PORTAL_MUNICIPAL" as const,
    url,
    formato: null,
    fechaAcceso: "2026-04-18",
    fechaPublicacion: null,
  },
  confianza: {
    nivel: ConfidenceLevel.MEDIA,
    notas: "test",
    validadoContra: null,
  },
});

const mkAttempt = (overrides: Partial<ParseAttempt>): ParseAttempt => ({
  target: { municipioId: "001", nombre: "Test", url: "https://test/x.pdf" },
  success: false,
  anioFiscal: null,
  tarifasEncontradas: { tsg: false, tish: false, rural: false, construccion: false },
  warnings: [],
  durationMs: 100,
  error: null,
  result: null,
  classification: null,
  ...overrides,
});

const mkClassification = (kind: OrdenanzaKind, score: number): ClassificationResult => ({
  kind,
  score,
  signals: {
    positiveHits: {},
    negativeHits: kind === "FISCAL" ? { domicilio_fiscal: 3, infracciones: 2 } : {},
    monetaryDensity: 0,
    textLength: 10_000,
  },
});

// ─────────────────────────────────────────
// parseArgs
// ─────────────────────────────────────────

describe("parseArgs (batch-parse-ordenanzas)", () => {
  it("requiere --audit", () => {
    expect(() => parseArgs(["node", "cli.ts"])).toThrow(/--audit/);
  });

  it("lee un único --audit", () => {
    const opt = parseArgs(["node", "cli.ts", "--audit", "/tmp/a.json"]);
    expect(opt.auditPaths).toEqual(["/tmp/a.json"]);
  });

  it("lee múltiples --audit (repetible)", () => {
    const opt = parseArgs(["node", "cli.ts", "--audit", "/tmp/a.json", "--audit", "/tmp/b.json"]);
    expect(opt.auditPaths).toEqual(["/tmp/a.json", "/tmp/b.json"]);
  });

  it("defaults razonables", () => {
    const opt = parseArgs(["node", "cli.ts", "--audit", "/tmp/a.json"]);
    expect(opt.concurrency).toBe(2);
    // Sprint 8: default subido a 120s para dejar espacio al retry del parser.
    expect(opt.timeoutMs).toBe(120_000);
    expect(opt.limit).toBeNull();
    expect(opt.dryRun).toBe(false);
    expect(opt.outputPath).toBe("../web/src/data/auto-presion-impositiva.json");
  });

  it("valida --concurrency en [1, 10]", () => {
    expect(() => parseArgs(["node", "cli.ts", "--audit", "/tmp/a", "--concurrency", "11"])).toThrow();
    expect(() => parseArgs(["node", "cli.ts", "--audit", "/tmp/a", "--concurrency", "0"])).toThrow();
  });

  it("valida --limit > 0", () => {
    expect(() => parseArgs(["node", "cli.ts", "--audit", "/tmp/a", "--limit", "-1"])).toThrow();
  });

  it("valida --timeout-ms >= 1000", () => {
    expect(() => parseArgs(["node", "cli.ts", "--audit", "/tmp/a", "--timeout-ms", "500"])).toThrow();
  });

  it("--dry-run y --limit y --output", () => {
    const opt = parseArgs([
      "node", "cli.ts",
      "--audit", "/tmp/a.json",
      "--limit", "3",
      "--dry-run",
      "--output", "/tmp/out.json",
    ]);
    expect(opt.limit).toBe(3);
    expect(opt.dryRun).toBe(true);
    expect(opt.outputPath).toBe("/tmp/out.json");
  });
});

// ─────────────────────────────────────────
// extractOrdenanzaTargets
// ─────────────────────────────────────────

describe("extractOrdenanzaTargets", () => {
  const munis = [
    { id: "001", nombre: "Alpha" },
    { id: "002", nombre: "Beta" },
    { id: "003", nombre: "Gamma" },
  ];

  it("solo devuelve entries con ORDENANZA_FISCAL publicado + url", () => {
    const audit: PilotAuditData = [
      mkEntry("001", [
        { categoria: DocumentCategory.PRESUPUESTO, publicado: true, url: "https://x/p" },
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://x/ord" },
      ]),
      mkEntry("002", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: false, url: null },
      ]),
      mkEntry("003", [
        { categoria: DocumentCategory.PRESUPUESTO, publicado: true, url: "https://y/p" },
      ]),
    ];
    const targets = extractOrdenanzaTargets(audit, munis);
    expect(targets).toHaveLength(1);
    expect(targets[0].municipioId).toBe("001");
    expect(targets[0].nombre).toBe("Alpha");
    expect(targets[0].url).toBe("https://x/ord");
  });

  it("prefiere ORDENANZA_IMPOSITIVA sobre ORDENANZA_FISCAL cuando coexisten", () => {
    const audit: PilotAuditData = [
      mkEntry("001", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://x/fiscal.pdf" },
        { categoria: DocumentCategory.ORDENANZA_IMPOSITIVA, publicado: true, url: "https://x/impositiva.pdf" },
      ]),
    ];
    const targets = extractOrdenanzaTargets(audit, munis);
    expect(targets).toHaveLength(1);
    expect(targets[0].url).toBe("https://x/impositiva.pdf");
  });

  it("fallback: si no hay IMPOSITIVA pero FISCAL tiene 'impositiv' en URL, lo usa", () => {
    const audit: PilotAuditData = [
      mkEntry("001", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://x/codigo-fiscal.pdf" },
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://x/ord-impositiva-2026.pdf" },
      ]),
    ];
    const targets = extractOrdenanzaTargets(audit, munis);
    expect(targets).toHaveLength(1);
    expect(targets[0].url).toBe("https://x/ord-impositiva-2026.pdf");
  });

  it("fallback: acepta 'tarifari' como keyword alternativo", () => {
    const audit: PilotAuditData = [
      mkEntry("001", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://x/codigo-fiscal.pdf" },
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://x/ord-tarifaria.pdf" },
      ]),
    ];
    const targets = extractOrdenanzaTargets(audit, munis);
    expect(targets).toHaveLength(1);
    expect(targets[0].url).toBe("https://x/ord-tarifaria.pdf");
  });

  it("fallback final: FISCAL sin keyword se usa igual (mejor que nada)", () => {
    const audit: PilotAuditData = [
      mkEntry("001", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://x/ord-2026.pdf" },
      ]),
    ];
    const targets = extractOrdenanzaTargets(audit, munis);
    expect(targets).toHaveLength(1);
    expect(targets[0].url).toBe("https://x/ord-2026.pdf");
  });

  it("descarta publicado:true sin url", () => {
    const audit: PilotAuditData = [
      mkEntry("001", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: null },
      ]),
    ];
    expect(extractOrdenanzaTargets(audit, munis)).toHaveLength(0);
  });

  it("dedupe: si el mismo municipioId aparece dos veces, gana el primero (pilot > auto)", () => {
    const audit: PilotAuditData = [
      mkEntry("001", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://pilot/ord" },
      ]),
      mkEntry("001", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://auto/ord" },
      ]),
    ];
    const targets = extractOrdenanzaTargets(audit, munis);
    expect(targets).toHaveLength(1);
    expect(targets[0].url).toBe("https://pilot/ord");
  });

  it("descarta entries cuyo municipioId no está en el catálogo", () => {
    const audit: PilotAuditData = [
      mkEntry("999", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://x/o" },
      ]),
    ];
    expect(extractOrdenanzaTargets(audit, munis)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────
// summarize
// ─────────────────────────────────────────

describe("summarize", () => {
  it("cuenta success/partial/failed correctamente", () => {
    const attempts: ParseAttempt[] = [
      mkAttempt({ success: true, tarifasEncontradas: { tsg: true, tish: true, rural: false, construccion: true } }),
      mkAttempt({ success: false, tarifasEncontradas: { tsg: true, tish: false, rural: false, construccion: false } }), // parcial
      mkAttempt({ success: false, tarifasEncontradas: { tsg: false, tish: false, rural: false, construccion: false }, error: "timeout" }),
    ];
    const s = summarize(attempts, 1000);
    expect(s.total).toBe(3);
    expect(s.success).toBe(1);
    expect(s.partial).toBe(1);
    expect(s.failed).toBe(2);
    expect(s.byTarifa.tsg).toBe(2);
    expect(s.byTarifa.tish).toBe(1);
    expect(s.byTarifa.rural).toBe(0);
    expect(s.byTarifa.construccion).toBe(1);
    expect(s.durationMs).toBe(1000);
  });

  it("total 0 cuando no hay attempts", () => {
    const s = summarize([], 0);
    expect(s.total).toBe(0);
    expect(s.success).toBe(0);
    expect(s.byTarifa).toEqual({ tsg: 0, tish: 0, rural: 0, construccion: 0 });
    expect(s.byKind).toEqual({ IMPOSITIVA: 0, FISCAL: 0, UNKNOWN: 0 });
    expect(s.failedMisclassified).toBe(0);
  });

  // Sprint 9: breakdown por clasificación de contenido.
  it("reporta byKind y failedMisclassified (Sprint 9)", () => {
    const attempts: ParseAttempt[] = [
      mkAttempt({
        success: true,
        tarifasEncontradas: { tsg: true, tish: false, rural: false, construccion: false },
        classification: mkClassification("IMPOSITIVA", 0.6),
      }),
      mkAttempt({
        success: false,
        error: "TSG no encontrada",
        classification: mkClassification("FISCAL", -0.4), // el doc es código fiscal procedural
      }),
      mkAttempt({
        success: false,
        error: "parser falla",
        classification: mkClassification("UNKNOWN", 0.05),
      }),
      mkAttempt({
        success: false,
        error: "fetch error",
        classification: null, // no hubo texto para clasificar
      }),
    ];
    const s = summarize(attempts, 100);
    expect(s.byKind.IMPOSITIVA).toBe(1);
    expect(s.byKind.FISCAL).toBe(1);
    expect(s.byKind.UNKNOWN).toBe(1);
    // failedMisclassified solo cuenta los fallos cuya clasificación es FISCAL
    expect(s.failedMisclassified).toBe(1);
  });
});

// ─────────────────────────────────────────
// attemptToPresionImpositivaData
// ─────────────────────────────────────────

describe("attemptToPresionImpositivaData", () => {
  it("devuelve null si no hay result", () => {
    const att = mkAttempt({ success: false, result: null });
    expect(attemptToPresionImpositivaData(att)).toBeNull();
  });

  it("arma PresionImpositivaData con shape correcto cuando hay result", () => {
    const att = mkAttempt({
      target: { municipioId: "060056", nombre: "Bahía Blanca", url: "https://b/ord" },
      success: true,
      anioFiscal: 2026,
      result: {
        success: true,
        anioFiscal: 2026,
        tarifas: {
          tsgPorMil: 10.5,
          tishPorciento: 1.2,
          tasaVialRuralPorHa: 1200,
          derechoConstruccionPorM2: 8500,
          derechoConstruccionAlicuota: null,
        },
        montoVivienda: mkSourcedValue(420000, "https://b/ord"),
        montoComercio: mkSourcedValue(600000, "https://b/ord"),
        montoRural: mkSourcedValue(120000, "https://b/ord"),
        montoConstruccion: mkSourcedValue(850000, "https://b/ord"),
        warnings: [],
        rawText: "...",
      },
    });
    const data = attemptToPresionImpositivaData(att);
    expect(data).not.toBeNull();
    expect(data!.municipioId).toBe("060056");
    expect(data!.nombre).toBe("Bahía Blanca");
    expect(data!.anioFiscal).toBe(2026);
    expect(data!.publicaOrdenanzaImpositiva).toBe(true);
    expect(data!.publicaOrdenanzaFiscal).toBe(true);
    expect(data!.urlOrdenanzaImpositiva).toBe("https://b/ord");
    expect(data!.montoVivienda.valor).toBe(420000);
    expect(data!.notaMetodologica).toContain("parser automático");
  });

  it("warnings se resumen en notaMetodologica", () => {
    const att = mkAttempt({
      target: { municipioId: "001", nombre: "X", url: "https://x" },
      success: true,
      anioFiscal: 2026,
      result: {
        success: true,
        anioFiscal: 2026,
        tarifas: { tsgPorMil: null, tishPorciento: null, tasaVialRuralPorHa: null, derechoConstruccionPorM2: null, derechoConstruccionAlicuota: null },
        montoVivienda: mkSourcedValue(0, "https://x"),
        montoComercio: mkSourcedValue(0, "https://x"),
        montoRural: mkSourcedValue(0, "https://x"),
        montoConstruccion: mkSourcedValue(0, "https://x"),
        warnings: ["TSG no encontrada", "TISH no encontrada", "Rural no encontrada"],
        rawText: "...",
      },
    });
    const data = attemptToPresionImpositivaData(att);
    expect(data!.notaMetodologica).toContain("Advertencias");
    expect(data!.notaMetodologica).toContain("TSG no encontrada");
  });
});

// ─────────────────────────────────────────
// buildReport
// ─────────────────────────────────────────

describe("buildReport", () => {
  it("incluye secciones esperadas", () => {
    const attempts: ParseAttempt[] = [
      mkAttempt({
        target: { municipioId: "001", nombre: "Alpha", url: "https://x/ord" },
        success: true,
        anioFiscal: 2026,
        tarifasEncontradas: { tsg: true, tish: true, rural: false, construccion: true },
      }),
      mkAttempt({
        target: { municipioId: "002", nombre: "Beta", url: "https://y/ord" },
        success: false,
        error: "HTTP 404",
      }),
    ];
    const summary = summarize(attempts, 1234);
    const md = buildReport(attempts, summary);
    expect(md).toContain("# Batch parser de Ordenanzas Impositivas");
    expect(md).toContain("## Resumen");
    expect(md).toContain("## Detalle por municipio");
    expect(md).toContain("Alpha (001)");
    expect(md).toContain("Beta (002)");
    expect(md).toContain("HTTP 404");
  });

  // Sprint 9: cuando hay failedMisclassified, el reporte agrega una sección accionable.
  it("incluye sección 'Documentos mal clasificados' cuando hay fallos FISCAL", () => {
    const attempts: ParseAttempt[] = [
      mkAttempt({
        target: { municipioId: "001", nombre: "Alpha", url: "https://x/codigo-fiscal.pdf" },
        success: false,
        error: "TSG no encontrada",
        classification: mkClassification("FISCAL", -0.35),
      }),
    ];
    const summary = summarize(attempts, 500);
    const md = buildReport(attempts, summary);
    expect(md).toContain("Clasificación por contenido (Sprint 9)");
    expect(md).toContain("Documentos mal clasificados por el crawler");
    expect(md).toContain("Alpha (001)");
    expect(md).toContain("https://x/codigo-fiscal.pdf");
    // El breakdown por kind aparece en la tabla de resumen
    expect(md).toContain("FISCAL");
  });

  it("omite sección 'mal clasificados' cuando no hay fallos FISCAL", () => {
    const attempts: ParseAttempt[] = [
      mkAttempt({
        target: { municipioId: "001", nombre: "Alpha", url: "https://x/ord" },
        success: true,
        classification: mkClassification("IMPOSITIVA", 0.6),
      }),
    ];
    const summary = summarize(attempts, 100);
    const md = buildReport(attempts, summary);
    expect(md).not.toContain("Documentos mal clasificados por el crawler");
  });
});
