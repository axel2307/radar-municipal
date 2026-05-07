import { describe, it, expect } from "vitest";
import {
  scoreSeguridadVial,
  type SeguridadVialInput,
} from "../dimensions/seguridad-vial";

describe("scoreSeguridadVial", () => {
  it("municipio urbano seguro tiene score alto", () => {
    const input: SeguridadVialInput = {
      siniestrosPer100k: 3,
      kmPavimentadoPerKm2: 7,
      transitoPublico: 1.0,
      kmCiclovias: 25,
    };
    const result = scoreSeguridadVial(input);
    expect(result.scoreTotal).toBeGreaterThan(90);
    expect(result.criterios).toHaveLength(4);
  });

  it("municipio rural sin infraestructura tiene score bajo", () => {
    const input: SeguridadVialInput = {
      siniestrosPer100k: 20,
      kmPavimentadoPerKm2: 0.1,
      transitoPublico: 0,
      kmCiclovias: 0,
    };
    const result = scoreSeguridadVial(input);
    expect(result.scoreTotal).toBeLessThan(10);
  });

  it("sin datos da score neutro bajo (~30)", () => {
    const input: SeguridadVialInput = {
      siniestrosPer100k: null,
      kmPavimentadoPerKm2: null,
      transitoPublico: null,
      kmCiclovias: null,
    };
    const result = scoreSeguridadVial(input);
    expect(result.scoreTotal).toBeGreaterThan(25);
    expect(result.scoreTotal).toBeLessThan(35);
  });

  it("score total está entre 0 y 100", () => {
    const input: SeguridadVialInput = {
      siniestrosPer100k: 10,
      kmPavimentadoPerKm2: 2,
      transitoPublico: 0.5,
      kmCiclovias: 5,
    };
    const result = scoreSeguridadVial(input);
    expect(result.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
  });

  it("pesos suman 1.0", () => {
    const input: SeguridadVialInput = {
      siniestrosPer100k: 8,
      kmPavimentadoPerKm2: 3,
      transitoPublico: 0.5,
      kmCiclovias: 10,
    };
    const result = scoreSeguridadVial(input);
    const totalPeso = result.criterios.reduce((s, c) => s + c.peso, 0);
    expect(totalPeso).toBeCloseTo(1.0, 5);
  });

  it("retorna valores raw correctos", () => {
    const input: SeguridadVialInput = {
      siniestrosPer100k: 9.5,
      kmPavimentadoPerKm2: 2.8,
      transitoPublico: 0.5,
      kmCiclovias: 12.0,
    };
    const result = scoreSeguridadVial(input);
    expect(result.siniestrosPer100k).toBe(9.5);
    expect(result.kmPavimentadoPerKm2).toBe(2.8);
    expect(result.kmCiclovias).toBe(12.0);
  });
});
