import { describe, it, expect } from "vitest";
import {
  scoreEducacionSalud,
  type EducacionSaludInput,
} from "../dimensions/educacion-salud";

describe("scoreEducacionSalud", () => {
  it("municipio con buena infraestructura tiene score alto", () => {
    const input: EducacionSaludInput = {
      escuelasPer10k: 25,
      centrosSaludPer10k: 8,
      camasPer10k: 30,
      jardinesPerNinos: 5,
    };
    const result = scoreEducacionSalud(input);
    expect(result.scoreTotal).toBeGreaterThan(90);
    expect(result.criterios).toHaveLength(4);
  });

  it("municipio con baja infraestructura tiene score bajo", () => {
    const input: EducacionSaludInput = {
      escuelasPer10k: 4,
      centrosSaludPer10k: 1,
      camasPer10k: 3,
      jardinesPerNinos: 0.5,
    };
    const result = scoreEducacionSalud(input);
    expect(result.scoreTotal).toBeLessThan(25);
  });

  it("sin datos da score neutro bajo (~30)", () => {
    const input: EducacionSaludInput = {
      escuelasPer10k: null,
      centrosSaludPer10k: null,
      camasPer10k: null,
      jardinesPerNinos: null,
    };
    const result = scoreEducacionSalud(input);
    expect(result.scoreTotal).toBeGreaterThan(25);
    expect(result.scoreTotal).toBeLessThan(35);
  });

  it("score total está entre 0 y 100", () => {
    const input: EducacionSaludInput = {
      escuelasPer10k: 15,
      centrosSaludPer10k: 4,
      camasPer10k: 12,
      jardinesPerNinos: 2,
    };
    const result = scoreEducacionSalud(input);
    expect(result.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
  });

  it("pesos suman 1.0", () => {
    const input: EducacionSaludInput = {
      escuelasPer10k: 20,
      centrosSaludPer10k: 5,
      camasPer10k: 20,
      jardinesPerNinos: 3,
    };
    const result = scoreEducacionSalud(input);
    const totalPeso = result.criterios.reduce((s, c) => s + c.peso, 0);
    expect(totalPeso).toBeCloseTo(1.0, 5);
  });

  it("retorna valores raw correctos", () => {
    const input: EducacionSaludInput = {
      escuelasPer10k: 18.5,
      centrosSaludPer10k: 5.2,
      camasPer10k: 22.0,
      jardinesPerNinos: 3.1,
    };
    const result = scoreEducacionSalud(input);
    expect(result.escuelasPer10k).toBe(18.5);
    expect(result.centrosSaludPer10k).toBe(5.2);
    expect(result.camasPer10k).toBe(22.0);
  });
});
