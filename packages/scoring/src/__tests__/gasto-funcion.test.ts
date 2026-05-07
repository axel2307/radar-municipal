import { describe, it, expect } from "vitest";
import {
  scoreGastoFuncion,
  type GastoFuncionInput,
} from "../dimensions/gasto-por-funcion";

describe("scoreGastoFuncion", () => {
  it("municipio con buena distribución tiene score alto", () => {
    const input: GastoFuncionInput = {
      pctServiciosSociales: 52,
      pctServiciosEconomicos: 18,
      pctAdminGubernamental: 20,
      pctDeudaPublica: 1.5,
    };
    const result = scoreGastoFuncion(input);
    expect(result.scoreTotal).toBeGreaterThan(70);
    expect(result.criterios).toHaveLength(5);
  });

  it("municipio con mala distribución tiene score bajo", () => {
    const input: GastoFuncionInput = {
      pctServiciosSociales: 15,
      pctServiciosEconomicos: 3,
      pctAdminGubernamental: 55,
      pctDeudaPublica: 20,
    };
    const result = scoreGastoFuncion(input);
    expect(result.scoreTotal).toBeLessThan(25);
  });

  it("sin datos da score neutro bajo (~30)", () => {
    const input: GastoFuncionInput = {
      pctServiciosSociales: null,
      pctServiciosEconomicos: null,
      pctAdminGubernamental: null,
      pctDeudaPublica: null,
    };
    const result = scoreGastoFuncion(input);
    expect(result.scoreTotal).toBeGreaterThan(25);
    expect(result.scoreTotal).toBeLessThan(35);
  });

  it("score total está entre 0 y 100", () => {
    const input: GastoFuncionInput = {
      pctServiciosSociales: 40,
      pctServiciosEconomicos: 15,
      pctAdminGubernamental: 30,
      pctDeudaPublica: 5,
    };
    const result = scoreGastoFuncion(input);
    expect(result.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
  });

  it("pesos suman 1.0", () => {
    const input: GastoFuncionInput = {
      pctServiciosSociales: 45,
      pctServiciosEconomicos: 20,
      pctAdminGubernamental: 25,
      pctDeudaPublica: 3,
    };
    const result = scoreGastoFuncion(input);
    const totalPeso = result.criterios.reduce((s, c) => s + c.peso, 0);
    expect(totalPeso).toBeCloseTo(1.0, 5);
  });

  it("calcula HHI de diversificación", () => {
    const input: GastoFuncionInput = {
      pctServiciosSociales: 25,
      pctServiciosEconomicos: 25,
      pctAdminGubernamental: 25,
      pctDeudaPublica: 25,
    };
    const result = scoreGastoFuncion(input);
    // Distribución perfectamente equitativa → HHI = 0.25
    expect(result.diversificacionHhi).toBeCloseTo(0.25, 2);
  });
});
