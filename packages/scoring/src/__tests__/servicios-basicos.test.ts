import { describe, it, expect } from "vitest";
import {
  scoreServiciosBasicos,
  type ServiciosBasicosInput,
} from "../dimensions/servicios-basicos";

describe("scoreServiciosBasicos", () => {
  it("municipio urbano con alta cobertura tiene score alto", () => {
    const input: ServiciosBasicosInput = {
      pctAguaRed: 98,
      pctCloaca: 95,
      pctGasRed: 96,
      recoleccionResiduos: 1.0,
      alumbradoPublico: 1.0,
    };
    const result = scoreServiciosBasicos(input);
    expect(result.scoreTotal).toBeGreaterThan(90);
    expect(result.criterios).toHaveLength(5);
  });

  it("municipio rural con baja cobertura tiene score bajo", () => {
    const input: ServiciosBasicosInput = {
      pctAguaRed: 50,
      pctCloaca: 20,
      pctGasRed: 30,
      recoleccionResiduos: 0.5,
      alumbradoPublico: 0,
    };
    const result = scoreServiciosBasicos(input);
    expect(result.scoreTotal).toBeLessThan(40);
  });

  it("sin datos da score neutro bajo (~30)", () => {
    const input: ServiciosBasicosInput = {
      pctAguaRed: null,
      pctCloaca: null,
      pctGasRed: null,
      recoleccionResiduos: null,
      alumbradoPublico: null,
    };
    const result = scoreServiciosBasicos(input);
    expect(result.scoreTotal).toBeGreaterThan(25);
    expect(result.scoreTotal).toBeLessThan(35);
  });

  it("score total está entre 0 y 100", () => {
    const input: ServiciosBasicosInput = {
      pctAguaRed: 85,
      pctCloaca: 60,
      pctGasRed: 75,
      recoleccionResiduos: 1.0,
      alumbradoPublico: 0.5,
    };
    const result = scoreServiciosBasicos(input);
    expect(result.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
  });

  it("pesos suman 1.0", () => {
    const input: ServiciosBasicosInput = {
      pctAguaRed: 80,
      pctCloaca: 60,
      pctGasRed: 70,
      recoleccionResiduos: 1.0,
      alumbradoPublico: 1.0,
    };
    const result = scoreServiciosBasicos(input);
    const totalPeso = result.criterios.reduce((s, c) => s + c.peso, 0);
    expect(totalPeso).toBeCloseTo(1.0, 5);
  });

  it("retorna valores raw correctos", () => {
    const input: ServiciosBasicosInput = {
      pctAguaRed: 92.5,
      pctCloaca: 65.3,
      pctGasRed: 80.0,
      recoleccionResiduos: 1.0,
      alumbradoPublico: 0.5,
    };
    const result = scoreServiciosBasicos(input);
    expect(result.pctAguaRed).toBe(92.5);
    expect(result.pctCloaca).toBe(65.3);
    expect(result.pctGasRed).toBe(80.0);
  });
});
