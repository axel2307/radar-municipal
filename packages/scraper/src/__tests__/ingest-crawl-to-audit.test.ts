/**
 * Tests del mapper CrawlResult → PilotAuditEntry.
 *
 * Foco: pureza del mapeo. Las reglas claves a cubrir:
 *   - se excluyen pilotos cuando excludePiloto=true
 *   - sitioOnline=false → skip
 *   - outcome.kind !== "OK" → skip
 *   - para cada categoría fiscal se emite UN DocumentAudit (publicado true/false)
 *   - fechaAuditoria queda en YYYY-MM-DD
 *   - format string se mapea a DocumentFormat enum; inválido → null
 */

import { describe, it, expect } from "vitest";
import { crawlEntryToAudit, mapCrawlJsonToAudit, parseArgs } from "../cli/ingest-crawl-to-audit";
import { DocumentCategory, DocumentFormat } from "@radar-municipal/core";

const mkOk = (
  overrides: Partial<{
    municipioId: string;
    esPiloto: boolean;
    sitioOnline: boolean;
    documentos: Array<{
      categoria: string;
      url: string;
      formato: string | null;
      textoContexto: string;
      esParseable: boolean | null;
      anioDetectado: number | null;
      trimestreDetectado: number | null;
    }>;
    fechaCrawl: string;
    urlPortal: string | null;
  }> = {},
) =>
  ({
    municipioId: overrides.municipioId ?? "060001",
    nombre: "Test",
    partido: "Test",
    esPiloto: overrides.esPiloto ?? false,
    urlOficial: "https://test.gob.ar",
    outcome: {
      kind: "OK" as const,
      crawl: {
        municipioId: overrides.municipioId ?? "060001",
        fechaCrawl: overrides.fechaCrawl ?? "2026-04-18T23:55:03.110Z",
        sitioOnline: overrides.sitioOnline ?? true,
        accesibilidad: {
          urlPortal: overrides.urlPortal ?? "https://test.gob.ar/transparencia",
          portalAccesible: true,
          clicksDesdeHome: 2,
          menuTransparenciaVisible: true,
        },
        documentos: overrides.documentos ?? [],
      },
    },
  }) as const;

describe("crawlEntryToAudit", () => {
  it("retorna null para municipios piloto cuando excludePiloto=true", () => {
    const entry = mkOk({ esPiloto: true });
    expect(crawlEntryToAudit(entry, { excludePiloto: true })).toBeNull();
  });

  it("incluye municipios piloto cuando excludePiloto=false", () => {
    const entry = mkOk({ esPiloto: true });
    const audit = crawlEntryToAudit(entry, { excludePiloto: false });
    expect(audit).not.toBeNull();
    expect(audit!.municipioId).toBe("060001");
  });

  it("retorna null si sitioOnline=false", () => {
    const entry = mkOk({ sitioOnline: false });
    expect(crawlEntryToAudit(entry, { excludePiloto: true })).toBeNull();
  });

  it("retorna null si outcome.kind=SIN_URL", () => {
    const entry = {
      municipioId: "060001",
      nombre: "X",
      partido: "X",
      esPiloto: false,
      urlOficial: null,
      outcome: { kind: "SIN_URL" as const, razon: "no url" },
    };
    expect(crawlEntryToAudit(entry, { excludePiloto: true })).toBeNull();
  });

  it("emite UN DocumentAudit por cada categoría fiscal (7 en total, incluye ORDENANZA_IMPOSITIVA)", () => {
    const entry = mkOk({ documentos: [] });
    const audit = crawlEntryToAudit(entry, { excludePiloto: true });
    expect(audit!.documentos).toHaveLength(7);
    const cats = audit!.documentos.map((d) => d.categoria).sort();
    expect(cats).toEqual(
      [
        DocumentCategory.DEUDA,
        DocumentCategory.EJECUCION,
        DocumentCategory.FINALIDAD_FUNCION,
        DocumentCategory.ORDENANZA_FISCAL,
        DocumentCategory.ORDENANZA_IMPOSITIVA,
        DocumentCategory.PRESUPUESTO,
        DocumentCategory.SEF,
      ].sort(),
    );
    // Sin docs crawled → todos publicado:false
    expect(audit!.documentos.every((d) => !d.publicado)).toBe(true);
    expect(audit!.documentos.every((d) => d.url === null)).toBe(true);
  });

  it("URL con 'impositiva' emite entrada ORDENANZA_IMPOSITIVA + FISCAL (fallback)", () => {
    const entry = mkOk({
      documentos: [
        {
          categoria: "ORDENANZA_FISCAL",
          url: "https://x.test/Ordenanza-Impositiva-2026.pdf",
          formato: "PDF",
          textoContexto: "Impositiva",
          esParseable: null,
          anioDetectado: 2026,
          trimestreDetectado: null,
        },
      ],
    });
    const audit = crawlEntryToAudit(entry, { excludePiloto: true });
    const impo = audit!.documentos.find((d) => d.categoria === DocumentCategory.ORDENANZA_IMPOSITIVA);
    const fisc = audit!.documentos.find((d) => d.categoria === DocumentCategory.ORDENANZA_FISCAL);
    expect(impo!.publicado).toBe(true);
    expect(impo!.url).toBe("https://x.test/Ordenanza-Impositiva-2026.pdf");
    // Fallback: si no hay FISCAL puro, se reusa la URL impositiva para mantener la señal
    expect(fisc!.publicado).toBe(true);
    expect(fisc!.url).toBe("https://x.test/Ordenanza-Impositiva-2026.pdf");
  });

  it("URL con 'tarifaria' también dispara ORDENANZA_IMPOSITIVA", () => {
    const entry = mkOk({
      documentos: [
        {
          categoria: "ORDENANZA_FISCAL",
          url: "https://x.test/ordenanza_tarifaria_2026.pdf",
          formato: "PDF",
          textoContexto: "Tarifaria",
          esParseable: null,
          anioDetectado: 2026,
          trimestreDetectado: null,
        },
      ],
    });
    const audit = crawlEntryToAudit(entry, { excludePiloto: true });
    const impo = audit!.documentos.find((d) => d.categoria === DocumentCategory.ORDENANZA_IMPOSITIVA);
    expect(impo!.publicado).toBe(true);
  });

  it("URL sin keyword emite sólo ORDENANZA_FISCAL — IMPOSITIVA queda en false", () => {
    const entry = mkOk({
      documentos: [
        {
          categoria: "ORDENANZA_FISCAL",
          url: "https://x.test/OrdenanzaFiscal2025.pdf",
          formato: "PDF",
          textoContexto: "Fiscal",
          esParseable: null,
          anioDetectado: 2025,
          trimestreDetectado: null,
        },
      ],
    });
    const audit = crawlEntryToAudit(entry, { excludePiloto: true });
    const impo = audit!.documentos.find((d) => d.categoria === DocumentCategory.ORDENANZA_IMPOSITIVA);
    const fisc = audit!.documentos.find((d) => d.categoria === DocumentCategory.ORDENANZA_FISCAL);
    expect(impo!.publicado).toBe(false);
    expect(fisc!.publicado).toBe(true);
    expect(fisc!.url).toBe("https://x.test/OrdenanzaFiscal2025.pdf");
  });

  it("con impositiva + fiscal puro, cada categoría toma su URL correspondiente", () => {
    const entry = mkOk({
      documentos: [
        {
          categoria: "ORDENANZA_FISCAL",
          url: "https://x.test/OrdenanzaFiscal2026.pdf",
          formato: "PDF",
          textoContexto: "Fiscal",
          esParseable: null,
          anioDetectado: 2026,
          trimestreDetectado: null,
        },
        {
          categoria: "ORDENANZA_FISCAL",
          url: "https://x.test/OrdenanzaImpositiva2026.pdf",
          formato: "PDF",
          textoContexto: "Impositiva",
          esParseable: null,
          anioDetectado: 2026,
          trimestreDetectado: null,
        },
      ],
    });
    const audit = crawlEntryToAudit(entry, { excludePiloto: true });
    const impo = audit!.documentos.find((d) => d.categoria === DocumentCategory.ORDENANZA_IMPOSITIVA);
    const fisc = audit!.documentos.find((d) => d.categoria === DocumentCategory.ORDENANZA_FISCAL);
    expect(impo!.url).toBe("https://x.test/OrdenanzaImpositiva2026.pdf");
    expect(fisc!.url).toBe("https://x.test/OrdenanzaFiscal2026.pdf");
  });

  it("impositiva: elige el más reciente por anioDetectado", () => {
    const entry = mkOk({
      documentos: [
        {
          categoria: "ORDENANZA_FISCAL",
          url: "https://x.test/Impositiva2023.pdf",
          formato: "PDF",
          textoContexto: "vieja",
          esParseable: null,
          anioDetectado: 2023,
          trimestreDetectado: null,
        },
        {
          categoria: "ORDENANZA_FISCAL",
          url: "https://x.test/Impositiva2026.pdf",
          formato: "PDF",
          textoContexto: "nueva",
          esParseable: null,
          anioDetectado: 2026,
          trimestreDetectado: null,
        },
      ],
    });
    const audit = crawlEntryToAudit(entry, { excludePiloto: true });
    const impo = audit!.documentos.find((d) => d.categoria === DocumentCategory.ORDENANZA_IMPOSITIVA);
    expect(impo!.anio).toBe(2026);
    expect(impo!.url).toBe("https://x.test/Impositiva2026.pdf");
  });

  it("publicado=true para categorías con doc detectado", () => {
    const entry = mkOk({
      documentos: [
        {
          categoria: "PRESUPUESTO",
          url: "https://x.test/ppto.pdf",
          formato: "PDF",
          textoContexto: "Presupuesto 2026",
          esParseable: true,
          anioDetectado: 2026,
          trimestreDetectado: null,
        },
      ],
    });
    const audit = crawlEntryToAudit(entry, { excludePiloto: true });
    const ppto = audit!.documentos.find((d) => d.categoria === DocumentCategory.PRESUPUESTO);
    expect(ppto!.publicado).toBe(true);
    expect(ppto!.url).toBe("https://x.test/ppto.pdf");
    expect(ppto!.formato).toBe(DocumentFormat.PDF);
    expect(ppto!.anio).toBe(2026);
    expect(ppto!.trimestre).toBeNull();
    expect(ppto!.esParseable).toBe(true);
    expect(ppto!.notas).toBe("Presupuesto 2026");
    // Las otras 5 categorías siguen en false
    const otros = audit!.documentos.filter((d) => d.categoria !== DocumentCategory.PRESUPUESTO);
    expect(otros.every((d) => !d.publicado)).toBe(true);
  });

  it("fechaAuditoria queda como YYYY-MM-DD", () => {
    const entry = mkOk({ fechaCrawl: "2026-04-18T23:55:03.110Z" });
    const audit = crawlEntryToAudit(entry, { excludePiloto: true });
    expect(audit!.fechaAuditoria).toBe("2026-04-18");
  });

  it("auditor es crawler-automatico", () => {
    const entry = mkOk();
    const audit = crawlEntryToAudit(entry, { excludePiloto: true });
    expect(audit!.auditor).toBe("crawler-automatico");
  });

  it("formato inválido → null (no rompe)", () => {
    const entry = mkOk({
      documentos: [
        {
          categoria: "EJECUCION",
          url: "https://x.test/ej",
          formato: "DOCX-MALFORMED",
          textoContexto: "Ejecución",
          esParseable: false,
          anioDetectado: null,
          trimestreDetectado: null,
        },
      ],
    });
    const audit = crawlEntryToAudit(entry, { excludePiloto: true });
    const ej = audit!.documentos.find((d) => d.categoria === DocumentCategory.EJECUCION);
    expect(ej!.formato).toBeNull();
  });

  it("esParseable null se normaliza a false", () => {
    const entry = mkOk({
      documentos: [
        {
          categoria: "SEF",
          url: "https://x.test/sef",
          formato: "HTML",
          textoContexto: "SEF",
          esParseable: null,
          anioDetectado: null,
          trimestreDetectado: null,
        },
      ],
    });
    const audit = crawlEntryToAudit(entry, { excludePiloto: true });
    const sef = audit!.documentos.find((d) => d.categoria === DocumentCategory.SEF);
    expect(sef!.esParseable).toBe(false);
  });
});

describe("mapCrawlJsonToAudit", () => {
  it("cuenta skips por categoría correctamente", () => {
    const entries = [
      mkOk({ municipioId: "001" }),
      mkOk({ municipioId: "002", sitioOnline: false }),
      {
        municipioId: "003",
        nombre: "X",
        partido: "X",
        esPiloto: false,
        urlOficial: null,
        outcome: { kind: "SIN_URL" as const, razon: "sin URL" },
      },
      {
        municipioId: "004",
        nombre: "X",
        partido: "X",
        esPiloto: false,
        urlOficial: "https://x",
        outcome: { kind: "ERROR" as const, error: "timeout" },
      },
      mkOk({ municipioId: "005", esPiloto: true }),
    ];
    const { audit, summary } = mapCrawlJsonToAudit(entries, { excludePiloto: true });
    expect(audit).toHaveLength(1);
    expect(audit[0].municipioId).toBe("001");
    expect(summary).toEqual({
      inputTotal: 5,
      emitted: 1,
      skippedPiloto: 1,
      skippedOffline: 1,
      skippedSinUrl: 1,
      skippedError: 1,
    });
  });
});

describe("parseArgs (ingest-crawl-to-audit)", () => {
  it("requiere --input", () => {
    expect(() => parseArgs(["node", "cli.ts"])).toThrow(/--input/);
  });

  it("lee flags con defaults razonables", () => {
    const opt = parseArgs(["node", "cli.ts", "--input", "/tmp/x.json"]);
    expect(opt.inputPath).toBe("/tmp/x.json");
    expect(opt.outputPath).toBe("../web/src/data/auto-audit.json");
    expect(opt.excludePiloto).toBe(true);
    expect(opt.dryRun).toBe(false);
  });

  it("--include-piloto invierte excludePiloto", () => {
    const opt = parseArgs(["node", "cli.ts", "--input", "/tmp/x.json", "--include-piloto"]);
    expect(opt.excludePiloto).toBe(false);
  });

  it("--dry-run", () => {
    const opt = parseArgs(["node", "cli.ts", "--input", "/tmp/x.json", "--dry-run"]);
    expect(opt.dryRun).toBe(true);
  });

  it("--output override", () => {
    const opt = parseArgs(["node", "cli.ts", "--input", "/tmp/x.json", "--output", "/tmp/out.json"]);
    expect(opt.outputPath).toBe("/tmp/out.json");
  });
});
