import { describe, it, expect } from "vitest";
import {
  scoreEspacioPublico,
  type EspacioPublicoInput,
} from "../dimensions/espacio-publico";

describe("scoreEspacioPublico", () => {
  it("municipio con buen espacio público tiene score alto", () => {
    const input: EspacioPublicoInput = {
      espacioVerdePcapita: 18,
      coberturaArbolado: 30,
      separacionResiduos: 1.0,
      incidentesAmbientales: 0,
    };
    const result = scoreEspacioPublico(input);
    expect(result.scoreTotal).toBeGreaterThan(90);
    expect(result.criterios).toHaveLength(4);
  });

  it("municipio con problemas ambientales tiene score bajo", () => {
    const input: EspacioPublicoInput = {
      espacioVerdePcapita: 1,
      coberturaArbolado: 3,
      separacionResiduos: 0,
      incidentesAmbientales: 15,
    };
    const result = scoreEspacioPublico(input);
    expect(result.scoreTotal).toBeLessThan(15);
  });

  it("sin datos da score neutro bajo (~30)", () => {
    const input: EspacioPublicoInput = {
      espacioVerdePcapita: null,
      coberturaArbolado: null,
      separacionResiduos: null,
      incidentesAmbientales: null,
    };
    const result = scoreEspacioPublico(input);
    expect(result.scoreTotal).toBeGreaterThan(25);
    expect(result.scoreTotal).toBeLessThan(35);
  });

  it("score total está entre 0 y 100", () => {
    const input: EspacioPublicoInput = {
      espacioVerdePcapita: 8,
      coberturaArbolado: 15,
      separacionResiduos: 0.5,
      incidentesAmbientales: 3,
    };
    const result = scoreEspacioPublico(input);
    expect(result.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
  });

  it("pesos suman 1.0", () => {
    const input: EspacioPublicoInput = {
      espacioVerdePcapita: 10,
      coberturaArbolado: 20,
      separacionResiduos: 1.0,
      incidentesAmbientales: 2,
    };
    const result = scoreEspacioPublico(input);
    const totalPeso = result.criterios.reduce((s, c) => s + c.peso, 0);
    expect(totalPeso).toBeCloseTo(1.0, 5);
  });

  it("retorna valores raw correctos", () => {
    const input: EspacioPublicoInput = {
      espacioVerdePcapita: 12.5,
      coberturaArbolado: 18.0,
      separacionResiduos: 0.5,
      incidentesAmbientales: 3,
    };
    const result = scoreEspacioPublico(input);
    expect(result.espacioVerdePcapita).toBe(12.5);
    expect(result.coberturaArbolado).toBe(18.0);
    expect(result.separacionResiduos).toBe(0.5);
  });
});
