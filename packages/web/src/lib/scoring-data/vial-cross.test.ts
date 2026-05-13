/**
 * Sprint 42A — Tests del vial cross.
 *
 * Tests de integración (usan los JSON reales del piloto, no mocks) que
 * validan invariantes del cross post-Sprint-32/33/36:
 *   - Coverage = 13 partidos del piloto
 *   - Threshold de denominador rural ≥ 100 km
 *   - 3 conurbano (VL, SI, La Plata) tienen entry — VL y SI usan denominador
 *     "total", La Plata usa "rural" (kmRural >= 100)
 *   - pesosPorKm es positivo y finite para todos
 */
import { describe, it, expect } from "vitest";
import {
  getVialCrossCoverage,
  getVialCrossMetrics,
  getAllMunicipiosForPesosPorKm,
} from "./vial-cross";

describe("getVialCrossCoverage", () => {
  it("cubre los 13 piloto post-Sprint-36", () => {
    const cov = getVialCrossCoverage();
    expect(cov.withCross).toBe(13);
    expect(cov.ids).toHaveLength(13);
  });

  it("incluye los 3 conurbano piloto (VL, SI, La Plata)", () => {
    const cov = getVialCrossCoverage();
    expect(cov.ids).toContain("060861"); // Vicente López
    expect(cov.ids).toContain("060735"); // San Isidro
    expect(cov.ids).toContain("060441"); // La Plata
  });
});

describe("getVialCrossMetrics — invariantes por partido", () => {
  it("Vicente López usa denominador 'total' (kmRural=2 < 100)", () => {
    const m = getVialCrossMetrics("060861");
    expect(m).not.toBeNull();
    expect(m!.denominador).toBe("total");
    expect(m!.kmRuralEstimado).toBeLessThan(100);
    expect(m!.kmDenominador).toBeGreaterThan(100);
  });

  it("San Isidro usa denominador 'total' (kmRural=23 < 100)", () => {
    const m = getVialCrossMetrics("060735");
    expect(m).not.toBeNull();
    expect(m!.denominador).toBe("total");
    expect(m!.kmRuralEstimado).toBeLessThan(100);
  });

  it("La Plata usa denominador 'rural' (kmRural≈2336 ≥ 100)", () => {
    const m = getVialCrossMetrics("060441");
    expect(m).not.toBeNull();
    expect(m!.denominador).toBe("rural");
    expect(m!.kmRuralEstimado).toBeGreaterThanOrEqual(100);
    expect(m!.kmDenominador).toBe(m!.kmRuralEstimado);
  });

  it("Bahía Blanca (rural típico) — denominador rural, pesosPorKm finite", () => {
    const m = getVialCrossMetrics("060056");
    expect(m).not.toBeNull();
    expect(m!.denominador).toBe("rural");
    expect(Number.isFinite(m!.pesosPorKm)).toBe(true);
    expect(m!.pesosPorKm).toBeGreaterThan(0);
  });

  it("Municipio fuera del piloto devuelve null", () => {
    expect(getVialCrossMetrics("060007")).toBeNull(); // Adolfo Alsina
  });

  it("Municipio inexistente devuelve null", () => {
    expect(getVialCrossMetrics("999999")).toBeNull();
  });
});

describe("getAllMunicipiosForPesosPorKm", () => {
  it("devuelve los 135 municipios", () => {
    const all = getAllMunicipiosForPesosPorKm();
    expect(all).toHaveLength(135);
  });

  it("13 entries tienen score (los del cross)", () => {
    const all = getAllMunicipiosForPesosPorKm();
    const withScore = all.filter((e) => e.score != null);
    expect(withScore).toHaveLength(13);
  });

  it("122 entries tienen score null (sin cross)", () => {
    const all = getAllMunicipiosForPesosPorKm();
    const withoutScore = all.filter((e) => e.score == null);
    expect(withoutScore).toHaveLength(122);
  });
});
