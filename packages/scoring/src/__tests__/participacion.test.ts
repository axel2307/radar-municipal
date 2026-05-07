import { describe, it, expect } from "vitest";
import {
  scoreParticipacion,
  type ParticipacionInput,
} from "../dimensions/participacion-ciudadana";

describe("scoreParticipacion", () => {
  it("municipio con todos los mecanismos activos tiene score alto", () => {
    const input: ParticipacionInput = {
      presupuestoParticipativo: 1.0,
      audienciasPublicas: 1.0,
      sistemaReclamos: 1.0,
      transparenciaHcd: 1.0,
      evidenciaPresupuesto: "Programa activo",
      evidenciaAudiencias: "Audiencias periódicas",
      urlReclamos: "https://reclamos.municipio.gob.ar",
      urlHcd: "https://hcd.municipio.gob.ar",
    };
    const result = scoreParticipacion(input);
    expect(result.scoreTotal).toBe(100);
    expect(result.criterios).toHaveLength(4);
  });

  it("municipio sin participación tiene score 0", () => {
    const input: ParticipacionInput = {
      presupuestoParticipativo: 0,
      audienciasPublicas: 0,
      sistemaReclamos: 0,
      transparenciaHcd: 0,
      evidenciaPresupuesto: null,
      evidenciaAudiencias: null,
      urlReclamos: null,
      urlHcd: null,
    };
    const result = scoreParticipacion(input);
    expect(result.scoreTotal).toBe(0);
  });

  it("mecanismos parciales dan score intermedio", () => {
    const input: ParticipacionInput = {
      presupuestoParticipativo: 0.5,
      audienciasPublicas: 0.5,
      sistemaReclamos: 0.5,
      transparenciaHcd: 0,
      evidenciaPresupuesto: null,
      evidenciaAudiencias: null,
      urlReclamos: null,
      urlHcd: null,
    };
    const result = scoreParticipacion(input);
    expect(result.scoreTotal).toBeGreaterThan(30);
    expect(result.scoreTotal).toBeLessThan(50);
  });

  it("pesos suman 1.0", () => {
    const input: ParticipacionInput = {
      presupuestoParticipativo: 1.0,
      audienciasPublicas: 0.5,
      sistemaReclamos: 1.0,
      transparenciaHcd: 0.5,
      evidenciaPresupuesto: null,
      evidenciaAudiencias: null,
      urlReclamos: null,
      urlHcd: null,
    };
    const result = scoreParticipacion(input);
    const totalPeso = result.criterios.reduce((s, c) => s + c.peso, 0);
    expect(totalPeso).toBeCloseTo(1.0, 5);
  });

  it("evidencia incluye URLs cuando están presentes", () => {
    const input: ParticipacionInput = {
      presupuestoParticipativo: 1.0,
      audienciasPublicas: 0,
      sistemaReclamos: 1.0,
      transparenciaHcd: 0.5,
      evidenciaPresupuesto: null,
      evidenciaAudiencias: null,
      urlReclamos: "https://reclamos.test.gob.ar",
      urlHcd: "https://hcd.test.gob.ar",
    };
    const result = scoreParticipacion(input);
    const reclamos = result.criterios.find((c) => c.indicador === "sistema_reclamos");
    expect(reclamos?.evidencia).toContain("https://reclamos.test.gob.ar");
    const hcd = result.criterios.find((c) => c.indicador === "transparencia_hcd");
    expect(hcd?.evidencia).toContain("https://hcd.test.gob.ar");
  });

  it("null en indicadores se trata como 0", () => {
    const input: ParticipacionInput = {
      presupuestoParticipativo: null,
      audienciasPublicas: null,
      sistemaReclamos: null,
      transparenciaHcd: null,
      evidenciaPresupuesto: null,
      evidenciaAudiencias: null,
      urlReclamos: null,
      urlHcd: null,
    };
    const result = scoreParticipacion(input);
    expect(result.scoreTotal).toBe(0);
  });
});
