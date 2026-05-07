import { describe, it, expect } from "vitest";
import {
  scoreConectividad,
  type ConectividadInput,
} from "../dimensions/conectividad-digital";

describe("scoreConectividad", () => {
  it("municipio con alta conectividad tiene score alto", () => {
    const input: ConectividadInput = {
      pctInternet: 90,
      bandaAnchaPer100: 35,
      pctComputadora: 85,
      serviciosDigitales: 1.0,
    };
    const result = scoreConectividad(input);
    expect(result.scoreTotal).toBeGreaterThan(90);
    expect(result.criterios).toHaveLength(4);
  });

  it("municipio rural con baja conectividad tiene score bajo", () => {
    const input: ConectividadInput = {
      pctInternet: 30,
      bandaAnchaPer100: 5,
      pctComputadora: 20,
      serviciosDigitales: 0,
    };
    const result = scoreConectividad(input);
    expect(result.scoreTotal).toBeLessThan(30);
  });

  it("sin datos da score neutro bajo (~30)", () => {
    const input: ConectividadInput = {
      pctInternet: null,
      bandaAnchaPer100: null,
      pctComputadora: null,
      serviciosDigitales: null,
    };
    const result = scoreConectividad(input);
    expect(result.scoreTotal).toBeGreaterThan(25);
    expect(result.scoreTotal).toBeLessThan(35);
  });

  it("score total está entre 0 y 100", () => {
    const input: ConectividadInput = {
      pctInternet: 70,
      bandaAnchaPer100: 20,
      pctComputadora: 55,
      serviciosDigitales: 0.5,
    };
    const result = scoreConectividad(input);
    expect(result.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
  });

  it("pesos suman 1.0", () => {
    const input: ConectividadInput = {
      pctInternet: 75,
      bandaAnchaPer100: 22,
      pctComputadora: 60,
      serviciosDigitales: 0.5,
    };
    const result = scoreConectividad(input);
    const totalPeso = result.criterios.reduce((s, c) => s + c.peso, 0);
    expect(totalPeso).toBeCloseTo(1.0, 5);
  });

  it("retorna valores raw correctos", () => {
    const input: ConectividadInput = {
      pctInternet: 82.5,
      bandaAnchaPer100: 28.0,
      pctComputadora: 68.5,
      serviciosDigitales: 1.0,
    };
    const result = scoreConectividad(input);
    expect(result.pctInternet).toBe(82.5);
    expect(result.bandaAnchaPer100).toBe(28.0);
    expect(result.pctComputadora).toBe(68.5);
  });
});
