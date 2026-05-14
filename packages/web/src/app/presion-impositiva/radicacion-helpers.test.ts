/**
 * Sprint 49 — Tests de radicacion-helpers.
 *
 * Valida la lógica del RadicacionFinder sin levantar React:
 *   - PERFILES tiene los 4 esperados con tasas correctas
 *   - getTasaMonto extrae el monto correcto de cada caso
 *   - totalAnualPerfil suma tasas + devuelve null si falta alguna
 *   - rankingPorPerfil ordena ascendente + filtra rows incompletos
 *   - ahorroPotencial calcula bien diff + %
 */
import { describe, it, expect } from "vitest";
import type { PresionImpositivaRankingEntry } from "@radar-municipal/core";
import {
  PERFILES,
  getTasaMonto,
  totalAnualPerfil,
  rankingPorPerfil,
  ahorroPotencial,
} from "./radicacion-helpers";

// Helper para construir rows de prueba con menos boilerplate
function makeRow(
  partial: {
    id: string;
    nombre: string;
    region?: string;
    vivienda?: number | null;
    comercio?: number | null;
    rural?: number | null;
    construccion?: number | null;
    sinData?: boolean;
  },
): PresionImpositivaRankingEntry {
  if (partial.sinData) {
    return {
      municipioId: partial.id,
      nombre: partial.nombre,
      partido: partial.nombre,
      region: partial.region ?? "INTERIOR",
      poblacion: 10000,
      esPiloto: true,
      data: null,
      indiceRelativo: null,
    };
  }
  const wrap = (v: number | null) => ({
    valor: v,
    fuente: {
      capa: "DERIVADA" as const,
      organismo: "TEST",
      url: "",
      formato: null,
      fechaAcceso: "2026-01-01",
      fechaPublicacion: null,
    },
    confianza: "BAJA" as const,
  });
  // `??` confundía null con undefined → usar comparación explícita para
  // distinguir "no especificado" (undefined → default) vs "explícito null".
  const pick = (v: number | null | undefined, def: number) =>
    v === undefined ? def : v;
  return {
    municipioId: partial.id,
    nombre: partial.nombre,
    partido: partial.nombre,
    region: partial.region ?? "INTERIOR",
    poblacion: 10000,
    esPiloto: true,
    data: {
      municipioId: partial.id,
      nombre: partial.nombre,
      anioFiscal: 2026,
      montoVivienda: wrap(pick(partial.vivienda, 100_000)) as unknown as PresionImpositivaRankingEntry["data"] extends { montoVivienda: infer T } ? T : never,
      montoComercio: wrap(pick(partial.comercio, 500_000)) as unknown as PresionImpositivaRankingEntry["data"] extends { montoComercio: infer T } ? T : never,
      montoRural: wrap(pick(partial.rural, 200_000)) as unknown as PresionImpositivaRankingEntry["data"] extends { montoRural: infer T } ? T : never,
      montoConstruccion: wrap(pick(partial.construccion, 50_000)) as unknown as PresionImpositivaRankingEntry["data"] extends { montoConstruccion: infer T } ? T : never,
      publicaOrdenanzaFiscal: true,
      publicaOrdenanzaImpositiva: true,
      urlOrdenanzaImpositiva: null,
      notaMetodologica: null,
    },
    indiceRelativo: 50,
  };
}

describe("PERFILES", () => {
  it("define 4 perfiles", () => {
    expect(PERFILES).toHaveLength(4);
  });

  it("Familia paga solo vivienda", () => {
    const p = PERFILES.find((x) => x.key === "familia")!;
    expect(p.tasas).toEqual(["vivienda"]);
  });

  it("Comerciante paga vivienda + TISH", () => {
    const p = PERFILES.find((x) => x.key === "comerciante")!;
    expect(p.tasas).toEqual(["vivienda", "comercio"]);
  });

  it("Empresa con obra paga TISH + construcción", () => {
    const p = PERFILES.find((x) => x.key === "empresa-obra")!;
    expect(p.tasas).toEqual(["comercio", "construccion"]);
  });

  it("Productor rural paga vivienda + rural", () => {
    const p = PERFILES.find((x) => x.key === "rural")!;
    expect(p.tasas).toEqual(["vivienda", "rural"]);
  });
});

describe("getTasaMonto", () => {
  it("extrae monto de cada tasa", () => {
    const row = makeRow({
      id: "1",
      nombre: "X",
      vivienda: 111,
      comercio: 222,
      rural: 333,
      construccion: 444,
    });
    expect(getTasaMonto(row, "vivienda")).toBe(111);
    expect(getTasaMonto(row, "comercio")).toBe(222);
    expect(getTasaMonto(row, "rural")).toBe(333);
    expect(getTasaMonto(row, "construccion")).toBe(444);
  });

  it("devuelve null si data es null", () => {
    const row = makeRow({ id: "1", nombre: "X", sinData: true });
    expect(getTasaMonto(row, "vivienda")).toBeNull();
  });
});

describe("totalAnualPerfil", () => {
  const perfilComerciante = PERFILES.find((x) => x.key === "comerciante")!;
  const perfilRural = PERFILES.find((x) => x.key === "rural")!;

  it("suma las tasas del perfil", () => {
    const row = makeRow({
      id: "1",
      nombre: "X",
      vivienda: 100,
      comercio: 500,
      rural: 200,
    });
    // Comerciante = vivienda + comercio = 100 + 500
    expect(totalAnualPerfil(row, perfilComerciante)).toBe(600);
  });

  it("devuelve null si una tasa del perfil falta (rural=null en urbano)", () => {
    const row = makeRow({
      id: "1",
      nombre: "Vicente Lopez",
      vivienda: 100,
      rural: null, // urbano sin superficie rural
    });
    expect(totalAnualPerfil(row, perfilRural)).toBeNull();
  });

  it("devuelve null si data del municipio entera es null", () => {
    const row = makeRow({ id: "1", nombre: "X", sinData: true });
    expect(totalAnualPerfil(row, perfilComerciante)).toBeNull();
  });
});

describe("rankingPorPerfil", () => {
  const perfilFamilia = PERFILES.find((x) => x.key === "familia")!;

  it("ordena ascendente por total (más barato primero)", () => {
    const rows = [
      makeRow({ id: "a", nombre: "Caro", vivienda: 500 }),
      makeRow({ id: "b", nombre: "Barato", vivienda: 100 }),
      makeRow({ id: "c", nombre: "Medio", vivienda: 300 }),
    ];
    const ranking = rankingPorPerfil(rows, perfilFamilia);
    expect(ranking.map((r) => r.nombre)).toEqual(["Barato", "Medio", "Caro"]);
  });

  it("descarta rows sin total computable", () => {
    const rows = [
      makeRow({ id: "a", nombre: "OK", vivienda: 100 }),
      makeRow({ id: "b", nombre: "SinData", sinData: true }),
    ];
    const ranking = rankingPorPerfil(rows, perfilFamilia);
    expect(ranking).toHaveLength(1);
    expect(ranking[0].nombre).toBe("OK");
  });
});

describe("ahorroPotencial", () => {
  it("calcula diff absoluto + porcentaje correctos", () => {
    const ranking = [
      { municipioId: "a", nombre: "Barato", region: "INTERIOR", esPiloto: true, total: 100 },
      { municipioId: "b", nombre: "Medio", region: "INTERIOR", esPiloto: true, total: 200 },
      { municipioId: "c", nombre: "Caro", region: "INTERIOR", esPiloto: true, total: 500 },
    ];
    const a = ahorroPotencial(ranking);
    expect(a).not.toBeNull();
    expect(a!.absoluto).toBe(400);
    expect(a!.porcentaje).toBe(80); // 400/500 = 80%
    expect(a!.barato.nombre).toBe("Barato");
    expect(a!.caro.nombre).toBe("Caro");
  });

  it("devuelve null si ranking < 2", () => {
    expect(ahorroPotencial([])).toBeNull();
    expect(
      ahorroPotencial([
        { municipioId: "a", nombre: "X", region: "INTERIOR", esPiloto: true, total: 100 },
      ]),
    ).toBeNull();
  });
});
