/**
 * Tests del CLI `resolve-impositiva-urls` + `apply-impositiva-patch`.
 *
 * Cobertura:
 *   - parseArgs: validaciones + defaults.
 *   - buildTargets: resolución de portalUrl + skip entries inválidas.
 *   - buildPatch: forma correcta del output.
 *   - applyPatchInMemory: mutación idempotente del audit (add vs update).
 *
 * No toca red — `resolveOne()` queda fuera del scope de estos tests
 * (integración real en el CLI).
 */

import { describe, it, expect } from "vitest";
import {
  parseArgs as parseResolveArgs,
  buildTargets,
  buildPatch,
  type ResolveResult,
} from "../cli/resolve-impositiva-urls";
import {
  parseArgs as parseApplyArgs,
  applyPatchInMemory,
  type ApplyResult,
} from "../cli/apply-impositiva-patch";
import type { ImpositivaPatchEntry } from "../cli/resolve-impositiva-urls";
import {
  DocumentCategory,
  DocumentFormat,
  type Municipio,
  type PilotAuditData,
  type PilotAuditEntry,
  Region,
} from "@radar-municipal/core";

// ─────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────

const mkMuni = (id: string, nombre: string, urlOficial: string | null): Municipio => ({
  id,
  nombre,
  partido: nombre,
  urlOficial,
  poblacion: 10_000,
  superficieKm2: 1000,
  densidad: 10,
  region: Region.INTERIOR,
  esPiloto: false,
});

const mkEntry = (
  id: string,
  docs: Array<{ categoria: DocumentCategory; url: string | null; publicado: boolean }>,
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

// ─────────────────────────────────────────
// parseArgs (resolve-impositiva-urls)
// ─────────────────────────────────────────

describe("parseArgs (resolve-impositiva-urls)", () => {
  it("requiere --audit y --ids", () => {
    expect(() => parseResolveArgs(["node", "cli", "--audit", "a.json"])).toThrow(/--ids/);
    expect(() => parseResolveArgs(["node", "cli", "--ids", "060001"])).toThrow(/--audit/);
  });

  it("parsea ids como CSV", () => {
    const opt = parseResolveArgs([
      "node", "cli",
      "--audit", "a.json",
      "--ids", "060126,060134 , 060294",
    ]);
    expect(opt.ids).toEqual(["060126", "060134", "060294"]);
  });

  it("defaults razonables", () => {
    const opt = parseResolveArgs(["node", "cli", "--audit", "a.json", "--ids", "060001"]);
    expect(opt.topN).toBe(5);
    expect(opt.timeoutMs).toBe(30_000);
    expect(opt.dryRun).toBe(false);
  });

  it("--top-n fuera de rango lanza", () => {
    expect(() =>
      parseResolveArgs(["node", "cli", "--audit", "a", "--ids", "x", "--top-n", "0"]),
    ).toThrow();
    expect(() =>
      parseResolveArgs(["node", "cli", "--audit", "a", "--ids", "x", "--top-n", "50"]),
    ).toThrow();
  });
});

// ─────────────────────────────────────────
// buildTargets
// ─────────────────────────────────────────

describe("buildTargets", () => {
  const municipios = [
    mkMuni("060126", "Cañuelas", "https://www.canuelas.gob.ar/"),
    mkMuni("060134", "Capitán Sarmiento", "https://capitansarmiento.gob.ar/"),
    mkMuni("999999", "Sin Url", null),
  ];

  it("resuelve targets con URL actual", () => {
    const audit: PilotAuditData = [
      mkEntry("060126", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://x/ord.pdf" },
      ]),
    ];
    const { targets, warnings } = buildTargets(audit, ["060126"], municipios);
    expect(targets).toHaveLength(1);
    expect(targets[0].portalUrl).toBe("https://www.canuelas.gob.ar/");
    expect(targets[0].currentUrl).toBe("https://x/ord.pdf");
    expect(warnings).toEqual([]);
  });

  it("warning si el id no está en audit", () => {
    const { targets, warnings } = buildTargets([], ["060126"], municipios);
    expect(targets).toHaveLength(0);
    expect(warnings[0]).toMatch(/no hay entry/);
  });

  it("warning si el municipio no tiene urlOficial", () => {
    const audit: PilotAuditData = [
      mkEntry("999999", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://x/o.pdf" },
      ]),
    ];
    const { targets, warnings } = buildTargets(audit, ["999999"], municipios);
    expect(targets).toHaveLength(0);
    expect(warnings[0]).toMatch(/sin urlOficial/);
  });

  it("warning si no hay URL de ordenanza en entry", () => {
    const audit: PilotAuditData = [
      mkEntry("060126", [
        { categoria: DocumentCategory.PRESUPUESTO, publicado: true, url: "https://x/p.pdf" },
      ]),
    ];
    const { targets, warnings } = buildTargets(audit, ["060126"], municipios);
    expect(targets).toHaveLength(0);
    expect(warnings[0]).toMatch(/no hay URL de ordenanza/);
  });

  it("acepta ORDENANZA_IMPOSITIVA como URL actual", () => {
    const audit: PilotAuditData = [
      mkEntry("060126", [
        { categoria: DocumentCategory.ORDENANZA_IMPOSITIVA, publicado: true, url: "https://x/ord.pdf" },
      ]),
    ];
    const { targets } = buildTargets(audit, ["060126"], municipios);
    expect(targets).toHaveLength(1);
    expect(targets[0].currentUrl).toBe("https://x/ord.pdf");
  });
});

// ─────────────────────────────────────────
// buildPatch
// ─────────────────────────────────────────

describe("buildPatch", () => {
  const mkResult = (overrides: Partial<ResolveResult>): ResolveResult => ({
    target: {
      municipioId: "060126",
      nombre: "Cañuelas",
      portalUrl: "https://www.canuelas.gob.ar/",
      currentUrl: "https://old.pdf",
    },
    candidates: [],
    evaluated: [],
    best: null,
    reasoning: "",
    durationMs: 0,
    ...overrides,
  });

  it("emite newUrl=null cuando no hay mejor candidato", () => {
    const patch = buildPatch([mkResult({ reasoning: "nada encontrado" })]);
    expect(patch).toHaveLength(1);
    expect(patch[0].newUrl).toBeNull();
    expect(patch[0].currentKind).toBe("FISCAL");
    expect(patch[0].reasoning).toBe("nada encontrado");
  });

  it("emite newUrl cuando hay best candidato IMPOSITIVA", () => {
    const patch = buildPatch([
      mkResult({
        best: {
          url: "https://new.pdf",
          anchorText: "Ordenanza Impositiva 2026",
          score: 8,
          reasons: ["+5 impositiva"],
          classification: {
            kind: "IMPOSITIVA",
            score: 0.7,
            signals: { positiveHits: {}, negativeHits: {}, monetaryDensity: 0, textLength: 100 },
          },
          error: null,
        },
        evaluated: [],
        reasoning: "ok",
      }),
    ]);
    expect(patch[0].newUrl).toBe("https://new.pdf");
    expect(patch[0].newKind).toBe("IMPOSITIVA");
    expect(patch[0].newScore).toBe(0.7);
  });
});

// ─────────────────────────────────────────
// parseArgs (apply-impositiva-patch)
// ─────────────────────────────────────────

describe("parseArgs (apply-impositiva-patch)", () => {
  it("requiere --patch y --audit", () => {
    expect(() => parseApplyArgs(["node", "cli", "--audit", "a"])).toThrow(/--patch/);
    expect(() => parseApplyArgs(["node", "cli", "--patch", "p"])).toThrow(/--audit/);
  });
});

// ─────────────────────────────────────────
// applyPatchInMemory
// ─────────────────────────────────────────

describe("applyPatchInMemory", () => {
  const mkPatch = (overrides: Partial<ImpositivaPatchEntry>): ImpositivaPatchEntry => ({
    municipioId: "060126",
    nombre: "Cañuelas",
    currentUrl: "https://old.pdf",
    currentKind: "FISCAL",
    newUrl: "https://new.pdf",
    newKind: "IMPOSITIVA",
    newScore: 0.7,
    reasoning: "ok",
    ...overrides,
  });

  it("agrega ORDENANZA_IMPOSITIVA si no existía", () => {
    const audit: PilotAuditData = [
      mkEntry("060126", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://old.pdf" },
      ]),
    ];
    const result = applyPatchInMemory(audit, [mkPatch({})]);
    expect(result.applied).toBe(1);
    expect(result.updatedEntries[0].action).toBe("added");

    const imp = audit[0].documentos.find(
      (d) => d.categoria === DocumentCategory.ORDENANZA_IMPOSITIVA,
    );
    expect(imp).toBeDefined();
    expect(imp!.url).toBe("https://new.pdf");
    expect(imp!.publicado).toBe(true);
    expect(imp!.notas).toContain("Sprint 10");
    // FISCAL original intacta
    const fiscal = audit[0].documentos.find(
      (d) => d.categoria === DocumentCategory.ORDENANZA_FISCAL,
    );
    expect(fiscal!.url).toBe("https://old.pdf");
  });

  it("actualiza ORDENANZA_IMPOSITIVA existente en vez de duplicar", () => {
    const audit: PilotAuditData = [
      mkEntry("060126", [
        { categoria: DocumentCategory.ORDENANZA_IMPOSITIVA, publicado: false, url: null },
      ]),
    ];
    const result = applyPatchInMemory(audit, [mkPatch({})]);
    expect(result.applied).toBe(1);
    expect(result.updatedEntries[0].action).toBe("updated");
    const imps = audit[0].documentos.filter(
      (d) => d.categoria === DocumentCategory.ORDENANZA_IMPOSITIVA,
    );
    expect(imps).toHaveLength(1);
    expect(imps[0].url).toBe("https://new.pdf");
    expect(imps[0].publicado).toBe(true);
  });

  it("skippea entries con newUrl=null", () => {
    const audit: PilotAuditData = [
      mkEntry("060126", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://old.pdf" },
      ]),
    ];
    const result = applyPatchInMemory(audit, [mkPatch({ newUrl: null })]);
    expect(result.applied).toBe(0);
    expect(result.skippedNoNewUrl).toBe(1);
    // El audit NO se modifica
    expect(audit[0].documentos).toHaveLength(1);
  });

  it("skippea entries cuyo municipioId no existe en audit", () => {
    const result = applyPatchInMemory([], [mkPatch({})]);
    expect(result.applied).toBe(0);
    expect(result.skippedMissingEntry).toBe(1);
  });

  it("aplica múltiples patches independientes", () => {
    const audit: PilotAuditData = [
      mkEntry("060126", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://a.pdf" },
      ]),
      mkEntry("060134", [
        { categoria: DocumentCategory.ORDENANZA_FISCAL, publicado: true, url: "https://b.pdf" },
      ]),
    ];
    const result = applyPatchInMemory(audit, [
      mkPatch({ municipioId: "060126", newUrl: "https://a-new.pdf" }),
      mkPatch({ municipioId: "060134", newUrl: "https://b-new.pdf" }),
    ]);
    expect(result.applied).toBe(2);
    expect(audit[0].documentos).toHaveLength(2); // FISCAL + IMPOSITIVA nueva
    expect(audit[1].documentos).toHaveLength(2);
  });
});

// ─────────────────────────────────────────
// resolveOne (integración con fetch mockeado)
// ─────────────────────────────────────────

describe("resolveOne (fetch mockeado)", () => {
  it("devuelve reasoning descriptivo cuando el portal no devuelve HTML", async () => {
    const { resolveOne } = await import("../cli/resolve-impositiva-urls");
    const mockFetch: typeof fetch = async () =>
      new Response(null, { status: 500 });
    const res = await resolveOne(
      {
        municipioId: "060126",
        nombre: "Cañuelas",
        portalUrl: "https://portal.test/",
        currentUrl: "https://old.pdf",
      },
      { topN: 3, timeoutMs: 5000, fetchImpl: mockFetch },
    );
    expect(res.best).toBeNull();
    expect(res.reasoning).toMatch(/no se pudo obtener HTML/);
  });

  it("devuelve reasoning cuando el portal no tiene candidatos con keywords", async () => {
    const { resolveOne } = await import("../cli/resolve-impositiva-urls");
    const mockFetch: typeof fetch = async () =>
      new Response("<html><body><p>Sólo noticias</p></body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    const res = await resolveOne(
      {
        municipioId: "060126",
        nombre: "Cañuelas",
        portalUrl: "https://portal.test/",
        currentUrl: "https://old.pdf",
      },
      { topN: 3, timeoutMs: 5000, fetchImpl: mockFetch },
    );
    expect(res.candidates).toEqual([]);
    expect(res.best).toBeNull();
    expect(res.reasoning).toMatch(/no expone candidatos/);
  });

  it("descarta currentUrl del set de candidatos (no re-verifica el mismo)", async () => {
    const { resolveOne } = await import("../cli/resolve-impositiva-urls");
    const mockFetch: typeof fetch = async (url) => {
      if (String(url) === "https://portal.test/") {
        return new Response(
          `<html><body><a href="/old.pdf">Ordenanza Impositiva</a></body></html>`,
          { status: 200, headers: { "content-type": "text/html" } },
        );
      }
      return new Response(null, { status: 404 });
    };
    const res = await resolveOne(
      {
        municipioId: "060126",
        nombre: "Cañuelas",
        portalUrl: "https://portal.test/",
        currentUrl: "https://portal.test/old.pdf",
      },
      { topN: 3, timeoutMs: 5000, fetchImpl: mockFetch },
    );
    // El único candidato encontrado es currentUrl → se filtra → evaluated vacío
    expect(res.candidates).toHaveLength(1);
    expect(res.evaluated).toHaveLength(0);
    expect(res.best).toBeNull();
  });
});
