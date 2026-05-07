import { describe, it, expect } from "vitest";
import {
  scoreEconomiaLocal,
  type EconomiaLocalInput,
} from "../dimensions/economia-local";

describe("scoreEconomiaLocal", () => {
  it("municipio con economía fuerte tiene score alto", () => {
    const input: EconomiaLocalInput = {
      empleoPcapita: 0.35,
      variacionEmpleo: 5,
      empresasPer1000: 35,
      construccion: 1.0,
      recaudacionPcapita: 250000,
    };
    const result = scoreEconomiaLocal(input);
    expect(result.scoreTotal).toBeGreaterThan(90);
    expect(result.criterios).toHaveLength(5);
  });

  it("municipio con economía débil tiene score bajo", () => {
    const input: EconomiaLocalInput = {
      empleoPcapita: 0.08,
      variacionEmpleo: -6,
      empresasPer1000: 5,
      construccion: 0,
      recaudacionPcapita: 20000,
    };
    const result = scoreEconomiaLocal(input);
    expect(result.scoreTotal).toBeLessThan(25);
  });

  it("sin datos da score neutro bajo (~30)", () => {
    const input: EconomiaLocalInput = {
      empleoPcapita: null,
      variacionEmpleo: null,
      empresasPer1000: null,
      construccion: null,
      recaudacionPcapita: null,
    };
    const result = scoreEconomiaLocal(input);
    expect(result.scoreTotal).toBeGreaterThan(25);
    expect(result.scoreTotal).toBeLessThan(35);
  });

  it("score total está entre 0 y 100", () => {
    const input: EconomiaLocalInput = {
      empleoPcapita: 0.20,
      variacionEmpleo: 1.5,
      empresasPer1000: 15,
      construccion: 0.5,
      recaudacionPcapita: 80000,
    };
    const result = scoreEconomiaLocal(input);
    expect(result.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
  });

  it("pesos suman 1.0", () => {
    const input: EconomiaLocalInput = {
      empleoPcapita: 0.22,
      variacionEmpleo: 2.0,
      empresasPer1000: 18,
      construccion: 0.5,
      recaudacionPcapita: 100000,
    };
    const result = scoreEconomiaLocal(input);
    const totalPeso = result.criterios.reduce((s, c) => s + c.peso, 0);
    expect(totalPeso).toBeCloseTo(1.0, 5);
  });

  it("retorna valores raw correctos", () => {
    const input: EconomiaLocalInput = {
      empleoPcapita: 0.25,
      variacionEmpleo: 2.1,
      empresasPer1000: 22.0,
      construccion: 0.5,
      recaudacionPcapita: 150000,
    };
    const result = scoreEconomiaLocal(input);
    expect(result.empleoPcapita).toBe(0.25);
    expect(result.variacionEmpleo).toBe(2.1);
    expect(result.empresasPer1000).toBe(22.0);
  });
});
