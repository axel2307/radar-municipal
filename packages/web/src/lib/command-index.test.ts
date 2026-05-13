/**
 * Sprint 45A — Tests del command-index.
 *
 * Validan:
 *   - COMMAND_INDEX contiene las 4 categorías esperadas
 *   - searchCommandIndex maneja vacíos, prefix match, sustring,
 *     normalización de acentos, keywords
 */
import { describe, it, expect } from "vitest";
import { COMMAND_INDEX, searchCommandIndex } from "./command-index";

describe("COMMAND_INDEX", () => {
  it("incluye los 4 kinds", () => {
    const kinds = new Set(COMMAND_INDEX.map((i) => i.kind));
    expect(kinds.has("municipio")).toBe(true);
    expect(kinds.has("dimension")).toBe(true);
    expect(kinds.has("page")).toBe(true);
    expect(kinds.has("metric")).toBe(true);
  });

  it("indexa los 135 municipios", () => {
    const count = COMMAND_INDEX.filter((i) => i.kind === "municipio").length;
    expect(count).toBe(135);
  });

  it("indexa 12 dimensiones activas (ACTIVE_DIMENSIONS)", () => {
    const count = COMMAND_INDEX.filter((i) => i.kind === "dimension").length;
    expect(count).toBe(12);
  });

  it("indexa 15 métricas del mapa", () => {
    const count = COMMAND_INDEX.filter((i) => i.kind === "metric").length;
    expect(count).toBe(15);
  });

  it("todas las entries tienen href no vacío", () => {
    for (const item of COMMAND_INDEX) {
      expect(item.href.length).toBeGreaterThan(0);
    }
  });
});

describe("searchCommandIndex", () => {
  it("query vacío devuelve hasta `limit` items", () => {
    const results = searchCommandIndex("", undefined, 10);
    expect(results.length).toBe(10);
  });

  it("matchea por prefix con prioridad alta", () => {
    const results = searchCommandIndex("Bahia", undefined, 5);
    // Bahía Blanca debería estar en top porque label empieza con "Bahia"
    // (normalize quita acentos)
    expect(results[0].label).toBe("Bahía Blanca");
  });

  it("normaliza acentos (Bahia ≡ Bahía)", () => {
    const withAccent = searchCommandIndex("Bahía", undefined, 5);
    const withoutAccent = searchCommandIndex("Bahia", undefined, 5);
    expect(withAccent[0].label).toBe(withoutAccent[0].label);
  });

  it("matchea substring case-insensitive", () => {
    const results = searchCommandIndex("blanca", undefined, 5);
    expect(results.some((r) => r.label === "Bahía Blanca")).toBe(true);
  });

  it("matchea por keywords del item (e.g. 'piloto')", () => {
    // Los municipios piloto tienen keywords="piloto"
    const results = searchCommandIndex("piloto", undefined, 50);
    // Debería traer al menos los 13 piloto
    const municipios = results.filter((r) => r.kind === "municipio");
    expect(municipios.length).toBeGreaterThanOrEqual(13);
  });

  it("matchea páginas (kind='page')", () => {
    const results = searchCommandIndex("ranking", undefined, 5);
    expect(results.some((r) => r.kind === "page" && r.label === "Ranking")).toBe(
      true,
    );
  });

  it("matchea métricas del mapa (kind='metric')", () => {
    const results = searchCommandIndex("pesos por km", undefined, 5);
    expect(
      results.some((r) => r.kind === "metric" && r.label.includes("Pesos por km")),
    ).toBe(true);
  });

  it("query sin matches devuelve []", () => {
    const results = searchCommandIndex("xyznonsensequery", undefined, 5);
    expect(results).toEqual([]);
  });

  it("respeta el limit", () => {
    const results = searchCommandIndex("a", undefined, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("prefix score > substring score (ordenamiento)", () => {
    // "tand" debería match Tandil (prefix). Buscar otra cosa que solo tenga
    // "tand" como substring es difícil, así que verificamos top result.
    const results = searchCommandIndex("tand", undefined, 5);
    expect(results[0].label).toBe("Tandil");
  });
});
