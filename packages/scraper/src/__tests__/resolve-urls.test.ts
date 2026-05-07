/**
 * Tests de la lógica pura del CLI resolve-urls:
 *   - parseArgs: flags + validaciones
 *   - buildPlan: filtrado de municipios sin urlOficial
 *   - summarize, buildMarkdownReport, buildSeedPatch: output puro
 */

import { describe, it, expect } from "vitest";
import {
  parseArgs,
  buildPlan,
  summarize,
  buildMarkdownReport,
  buildSeedPatch,
  type ResolutionRecord,
} from "../cli/resolve-urls";
import { Region, type Municipio } from "@radar-municipal/core";

const mk = (id: string, nombre: string, url: string | null): Municipio => ({
  id,
  nombre,
  partido: nombre,
  region: Region.INTERIOR,
  poblacion: 10000,
  superficieKm2: 100,
  densidad: 100,
  urlOficial: url,
  esPiloto: false,
});

describe("parseArgs (resolve-urls)", () => {
  it("default valores", () => {
    const opt = parseArgs(["node", "cli.ts"]);
    expect(opt.dryRun).toBe(false);
    expect(opt.limit).toBeNull();
    expect(opt.threshold).toBe(0.7);
    expect(opt.concurrency).toBe(2);
    expect(opt.timeoutMs).toBe(10_000);
  });

  it("lee --threshold con validación de rango [0, 1]", () => {
    expect(parseArgs(["node", "cli.ts", "--threshold", "0.6"]).threshold).toBe(0.6);
    expect(() => parseArgs(["node", "cli.ts", "--threshold", "1.5"])).toThrow();
    expect(() => parseArgs(["node", "cli.ts", "--threshold", "-0.1"])).toThrow();
  });

  it("lee --limit, --ids, --concurrency, --timeout-ms", () => {
    const opt = parseArgs([
      "node", "cli.ts",
      "--limit", "10",
      "--ids", "060007,060021",
      "--concurrency", "3",
      "--timeout-ms", "5000",
    ]);
    expect(opt.limit).toBe(10);
    expect(opt.ids?.size).toBe(2);
    expect(opt.concurrency).toBe(3);
    expect(opt.timeoutMs).toBe(5000);
  });
});

describe("buildPlan (resolve-urls)", () => {
  const muns: Municipio[] = [
    mk("001", "Tiene URL", "https://x.test"),
    mk("002", "Sin URL uno", null),
    mk("003", "Sin URL dos", null),
    mk("004", "Sin URL tres", null),
  ];

  it("solo considera los que tienen urlOficial null", () => {
    const plan = buildPlan(muns, { limit: null, ids: null });
    expect(plan).toHaveLength(3);
    expect(plan.every((p) => !p.municipio.urlOficial)).toBe(true);
  });

  it("--limit recorta", () => {
    const plan = buildPlan(muns, { limit: 2, ids: null });
    expect(plan).toHaveLength(2);
  });

  it("--ids filtra exacto", () => {
    const plan = buildPlan(muns, { limit: null, ids: new Set(["002", "001"]) });
    // "001" tiene URL → se descarta; "002" no → entra
    expect(plan).toHaveLength(1);
    expect(plan[0].municipio.id).toBe("002");
  });

  it("incluye candidateUrls para cada planned municipio", () => {
    const plan = buildPlan(muns, { limit: 1, ids: null });
    expect(plan[0].candidateUrls.length).toBeGreaterThan(0);
    expect(plan[0].candidateUrls[0]).toMatch(/^https:\/\//);
  });
});

// ─────────────────────────────────────────
// Reporte y patch
// ─────────────────────────────────────────

const mkRecord = (
  id: string,
  nombre: string,
  selectedUrl: string | null,
  confidence: number,
): ResolutionRecord => ({
  municipioId: id,
  nombre,
  partido: nombre,
  selectedUrl,
  confidence,
  attempted: 3,
  durationMs: 1200,
  reason: selectedUrl ? "aceptada" : confidence > 0 ? "debajo de umbral" : "ninguna respondió",
  details: [],
});

describe("summarize", () => {
  it("cuenta aceptados/dudosos/no-encontrados", () => {
    const records = [
      mkRecord("1", "A", "https://a.test", 1),
      mkRecord("2", "B", null, 0.5),
      mkRecord("3", "C", null, 0),
      mkRecord("4", "D", "https://d.test", 0.8),
    ];
    const s = summarize(records, 5000);
    expect(s.total).toBe(4);
    expect(s.accepted).toBe(2);
    expect(s.uncertain).toBe(1);
    expect(s.notFound).toBe(1);
    expect(s.durationMs).toBe(5000);
  });
});

describe("buildMarkdownReport", () => {
  it("incluye secciones Aceptados / Dudosos / No encontrados", () => {
    const records = [mkRecord("1", "A", "https://a.test", 1), mkRecord("2", "B", null, 0)];
    const summary = summarize(records, 1000);
    const md = buildMarkdownReport(records, summary, {
      dryRun: false,
      limit: null,
      ids: null,
      threshold: 0.7,
      outputDir: "./o",
      concurrency: 2,
      timeoutMs: 10000,
    });
    expect(md).toContain("## Aceptados");
    expect(md).toContain("## Dudosos");
    expect(md).toContain("## No encontrados");
    expect(md).toContain("https://a.test");
  });
});

describe("buildSeedPatch", () => {
  it("solo incluye records con selectedUrl", () => {
    const records = [
      mkRecord("001", "Alsina", "https://alsina.gob.ar", 1),
      mkRecord("002", "Sin nada", null, 0),
    ];
    const patch = buildSeedPatch(records);
    expect(patch).toContain('"001": "https://alsina.gob.ar"');
    expect(patch).not.toContain("002");
  });

  it("formato válido de objeto TypeScript", () => {
    const patch = buildSeedPatch([mkRecord("001", "X", "https://x.test", 1)]);
    expect(patch).toMatch(/export const RESOLVED_URLS: Record<string, string> = \{/);
    expect(patch).toMatch(/\};\n/);
  });
});
