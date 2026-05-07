/**
 * Tests de la lógica pura de `crawl-all-135`:
 *   - parseArgs: lectura de flags
 *   - buildPlan: clasificación de los 135 en OK / SIN_URL / SKIPPED_BY_FILTER
 *
 * No se ejercita el crawl de red (eso requiere integración real).
 */

import { describe, it, expect } from "vitest";
import { parseArgs, buildPlan } from "../cli/crawl-all-135";
import { Region, type Municipio } from "@radar-municipal/core";

const mk = (id: string, nombre: string, url: string | null, esPiloto = false): Municipio => ({
  id,
  nombre,
  partido: nombre,
  region: Region.INTERIOR,
  poblacion: 100000,
  superficieKm2: 100,
  densidad: 1000,
  urlOficial: url,
  esPiloto,
});

describe("parseArgs", () => {
  it("default: no flags → valores por defecto", () => {
    const opt = parseArgs(["node", "cli.ts"]);
    expect(opt.dryRun).toBe(false);
    expect(opt.onlyPiloto).toBe(false);
    expect(opt.limit).toBeNull();
    expect(opt.ids).toBeNull();
    expect(opt.rateLimitMs).toBe(2000);
    expect(opt.concurrency).toBe(1);
  });

  it("lee --dry-run y --only-piloto", () => {
    const opt = parseArgs(["node", "cli.ts", "--dry-run", "--only-piloto"]);
    expect(opt.dryRun).toBe(true);
    expect(opt.onlyPiloto).toBe(true);
  });

  it("lee --limit y --ids y --output y --rate-ms y --concurrency", () => {
    const opt = parseArgs([
      "node", "cli.ts",
      "--limit", "5",
      "--ids", "060056,060441",
      "--output", "./tmp",
      "--rate-ms", "500",
      "--concurrency", "3",
    ]);
    expect(opt.limit).toBe(5);
    expect(opt.ids?.has("060056")).toBe(true);
    expect(opt.ids?.has("060441")).toBe(true);
    expect(opt.ids?.size).toBe(2);
    expect(opt.outputDir).toBe("./tmp");
    expect(opt.rateLimitMs).toBe(500);
    expect(opt.concurrency).toBe(3);
  });

  it("rechaza --limit inválido", () => {
    expect(() => parseArgs(["node", "cli.ts", "--limit", "abc"])).toThrow();
    expect(() => parseArgs(["node", "cli.ts", "--limit", "0"])).toThrow();
  });

  it("rechaza --concurrency fuera de 1..10", () => {
    expect(() => parseArgs(["node", "cli.ts", "--concurrency", "0"])).toThrow();
    expect(() => parseArgs(["node", "cli.ts", "--concurrency", "20"])).toThrow();
  });
});

describe("buildPlan", () => {
  const muns: Municipio[] = [
    mk("060056", "Bahía Blanca", "https://x", true),
    mk("060441", "La Plata", "https://y", true),
    mk("060007", "Adolfo Alsina", null),
    mk("060021", "Alberti", null),
    mk("060791", "Tandil", "https://z", true),
  ];

  it("sin filtros: clasifica URL vs null", () => {
    const plan = buildPlan(muns, { onlyPiloto: false, limit: null, ids: null });
    const byStatus = Object.fromEntries(
      ["OK", "SIN_URL", "SKIPPED_BY_FILTER"].map((k) => [k, plan.filter((p) => p.status === k).length])
    );
    expect(byStatus.OK).toBe(3);
    expect(byStatus.SIN_URL).toBe(2);
    expect(byStatus.SKIPPED_BY_FILTER).toBe(0);
  });

  it("--only-piloto excluye no-pilotos", () => {
    const plan = buildPlan(muns, { onlyPiloto: true, limit: null, ids: null });
    // Los 3 OK son todos piloto, los 2 null son no-piloto → quedan SIN_URL ... pero esPiloto=false los saca antes como SKIPPED
    // Con la lógica actual: ids-filter first, only-piloto second, url-null third.
    // Un no-piloto sin URL queda SKIPPED_BY_FILTER (only-piloto gana antes que SIN_URL).
    const okPiloto = plan.filter((p) => p.status === "OK").map((p) => p.municipio.id);
    expect(okPiloto.sort()).toEqual(["060056", "060441", "060791"]);
    const skipped = plan.filter((p) => p.status === "SKIPPED_BY_FILTER");
    expect(skipped.length).toBe(2);
    expect(skipped.every((s) => s.skipReason?.includes("piloto"))).toBe(true);
  });

  it("--ids filtra al set exacto", () => {
    const plan = buildPlan(muns, {
      onlyPiloto: false,
      limit: null,
      ids: new Set(["060056", "060007"]),
    });
    const ok = plan.filter((p) => p.status === "OK");
    const sin = plan.filter((p) => p.status === "SIN_URL");
    const skipped = plan.filter((p) => p.status === "SKIPPED_BY_FILTER");
    expect(ok.map((p) => p.municipio.id)).toEqual(["060056"]);
    expect(sin.map((p) => p.municipio.id)).toEqual(["060007"]);
    expect(skipped.length).toBe(3);
  });

  it("--limit N aplica solo a los OK", () => {
    const plan = buildPlan(muns, { onlyPiloto: false, limit: 2, ids: null });
    const ok = plan.filter((p) => p.status === "OK");
    expect(ok.length).toBe(2);
    // Los que excedieron deben estar SKIPPED con razón explícita
    const excedidos = plan.filter(
      (p) => p.status === "SKIPPED_BY_FILTER" && p.skipReason?.includes("--limit"),
    );
    expect(excedidos.length).toBe(1); // el tercer OK (Tandil)
  });

  it("--limit no convierte SIN_URL en OK", () => {
    const plan = buildPlan(muns, { onlyPiloto: false, limit: 10, ids: null });
    const sin = plan.filter((p) => p.status === "SIN_URL");
    expect(sin.length).toBe(2);
  });
});
