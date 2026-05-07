import { describe, it, expect } from "vitest";
import { calculateTransparencyScore, getScoreBreakdown } from "../engine/calculator";
import { scorePublication } from "../dimensions/publication";
import { scoreTimeliness } from "../dimensions/timeliness";
import { scoreAccessibility } from "../dimensions/accessibility";
import { DocumentCategory, DocumentFormat, type PilotAuditEntry } from "@radar-municipal/core";

function makeAudit(overrides: Partial<PilotAuditEntry> = {}): PilotAuditEntry {
  return {
    municipioId: "060056",
    auditor: "sistema",
    fechaAuditoria: "2025-03-01",
    accesibilidad: {
      urlPortal: "https://transparencia.bahiablanca.gov.ar",
      portalAccesible: true,
      clicksDesdeHome: 2,
      menuTransparenciaVisible: true,
    },
    documentos: [
      {
        categoria: DocumentCategory.PRESUPUESTO,
        publicado: true,
        formato: DocumentFormat.PDF,
        anio: 2024,
        trimestre: null,
        url: "https://example.com/presupuesto.pdf",
        fechaPublicacion: "2024-07-15",
        fechaCorte: "2024-06-30",
        esParseable: true,
        notas: null,
      },
      {
        categoria: DocumentCategory.EJECUCION,
        publicado: true,
        formato: DocumentFormat.PDF,
        anio: 2024,
        trimestre: 2,
        url: "https://example.com/ejecucion.pdf",
        fechaPublicacion: "2024-08-15",
        fechaCorte: "2024-06-30",
        esParseable: true,
        notas: null,
      },
      {
        categoria: DocumentCategory.FINALIDAD_FUNCION,
        publicado: true,
        formato: DocumentFormat.CSV,
        anio: 2024,
        trimestre: null,
        url: "https://example.com/finalidad.csv",
        fechaPublicacion: null,
        fechaCorte: null,
        esParseable: true,
        notas: null,
      },
      {
        categoria: DocumentCategory.DEUDA,
        publicado: false,
        formato: null,
        anio: null,
        trimestre: null,
        url: null,
        fechaPublicacion: null,
        fechaCorte: null,
        esParseable: false,
        notas: "No publica deuda",
      },
    ],
    ...overrides,
  };
}

describe("scorePublication", () => {
  it("da 1.0 a documentos publicados y 0.0 a no publicados", () => {
    const audit = makeAudit();
    const results = scorePublication(audit.documentos);
    expect(results).toHaveLength(4);

    const presupuesto = results.find((r) => r.criterio === "presupuesto_publicado");
    const ejecucion = results.find((r) => r.criterio === "ejecucion_publicada");
    const finalidad = results.find((r) => r.criterio === "finalidad_funcion");
    const deuda = results.find((r) => r.criterio === "deuda_publicada");

    expect(presupuesto?.valor).toBe(1);
    expect(ejecucion?.valor).toBe(1);
    expect(finalidad?.valor).toBe(1);
    expect(deuda?.valor).toBe(0);
  });

  it("retorna 0 para todos si no hay documentos", () => {
    const results = scorePublication([]);
    expect(results.every((r) => r.valor === 0)).toBe(true);
  });
});

describe("scoreTimeliness", () => {
  it("calcula rezago correctamente", () => {
    const audit = makeAudit();
    const result = scoreTimeliness(audit.documentos);
    // 46 días de rezago (2024-06-30 → 2024-08-15)
    expect(result.rezagoDias).toBe(46);
    // Score: max(0, 1 - 46/180) ≈ 0.744
    expect(result.valor).toBeCloseTo(0.744, 2);
  });

  it("da score 0 si no hay ejecución publicada", () => {
    const audit = makeAudit({
      documentos: makeAudit().documentos.map((d) =>
        d.categoria === DocumentCategory.EJECUCION
          ? { ...d, publicado: false }
          : d
      ),
    });
    const result = scoreTimeliness(audit.documentos);
    expect(result.valor).toBe(0);
    expect(result.rezagoDias).toBeNull();
  });

  it("da score 1.0 con 0 días de rezago", () => {
    const audit = makeAudit({
      documentos: makeAudit().documentos.map((d) =>
        d.categoria === DocumentCategory.EJECUCION
          ? { ...d, fechaPublicacion: "2024-06-30", fechaCorte: "2024-06-30" }
          : d
      ),
    });
    const result = scoreTimeliness(audit.documentos);
    expect(result.valor).toBe(1.0);
    expect(result.rezagoDias).toBe(0);
  });

  it("da score 0.0 con 180+ días de rezago", () => {
    const audit = makeAudit({
      documentos: makeAudit().documentos.map((d) =>
        d.categoria === DocumentCategory.EJECUCION
          ? { ...d, fechaPublicacion: "2025-03-01", fechaCorte: "2024-06-30" }
          : d
      ),
    });
    const result = scoreTimeliness(audit.documentos);
    expect(result.valor).toBe(0);
  });
});

describe("scoreAccessibility", () => {
  it("evalúa clicks, menú y machine readability", () => {
    const audit = makeAudit();
    const results = scoreAccessibility(audit.accesibilidad, audit.documentos);
    expect(results).toHaveLength(3);

    const clicks = results.find((r) => r.criterio === "accesibilidad_clicks");
    const menu = results.find((r) => r.criterio === "menu_transparencia");
    const mr = results.find((r) => r.criterio === "machine_readability");

    expect(clicks?.valor).toBe(1.0); // 2 clicks
    expect(menu?.valor).toBe(1);     // menú visible
    expect(mr?.valor).toBe(1.0);     // 3/3 published docs are readable (PDF parseable + CSV)
  });

  it("da score bajo con muchos clicks y portal no accesible", () => {
    const results = scoreAccessibility(
      {
        urlPortal: null,
        portalAccesible: false,
        clicksDesdeHome: null,
        menuTransparenciaVisible: false,
      },
      []
    );

    const clicks = results.find((r) => r.criterio === "accesibilidad_clicks");
    const menu = results.find((r) => r.criterio === "menu_transparencia");
    expect(clicks?.valor).toBe(0);
    expect(menu?.valor).toBe(0);
  });

  it("clicks scoring: 3 clicks = 0.7", () => {
    const results = scoreAccessibility(
      {
        urlPortal: "https://example.com",
        portalAccesible: true,
        clicksDesdeHome: 3,
        menuTransparenciaVisible: true,
      },
      []
    );
    const clicks = results.find((r) => r.criterio === "accesibilidad_clicks");
    expect(clicks?.valor).toBe(0.7);
  });
});

describe("calculateTransparencyScore", () => {
  it("calcula score total entre 0 y 100", () => {
    const result = calculateTransparencyScore(makeAudit());
    expect(result.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
  });

  it("genera evidencia para cada criterio", () => {
    const result = calculateTransparencyScore(makeAudit());
    // 4 publication + 1 timeliness + 3 accessibility = 8
    expect(result.evidencia).toHaveLength(8);
  });

  it("score total es consistente con pesos", () => {
    const result = calculateTransparencyScore(makeAudit());
    // Los pesos suman 1.0, score está en 0-100
    const manualTotal = result.evidencia.reduce(
      (sum, e) => sum + e.valor * e.peso * 100,
      0
    );
    expect(result.scoreTotal).toBeCloseTo(manualTotal, 1);
  });

  it("municipio que no publica nada tiene score bajo", () => {
    const audit = makeAudit({
      documentos: makeAudit().documentos.map((d) => ({
        ...d,
        publicado: false,
        formato: null,
        url: null,
        esParseable: false,
      })),
      accesibilidad: {
        urlPortal: null,
        portalAccesible: false,
        clicksDesdeHome: null,
        menuTransparenciaVisible: false,
      },
    });
    const result = calculateTransparencyScore(audit);
    expect(result.scoreTotal).toBe(0);
  });
});

describe("getScoreBreakdown", () => {
  it("retorna breakdown con 8 criterios", () => {
    const breakdown = getScoreBreakdown(makeAudit());
    expect(breakdown).toHaveLength(8);
  });

  it("cada criterio tiene contribución = valor * peso * 100", () => {
    const breakdown = getScoreBreakdown(makeAudit());
    for (const row of breakdown) {
      const expected = Math.round(row.valor * row.peso * 100 * 10) / 10;
      expect(row.contribucion).toBeCloseTo(expected, 1);
    }
  });

  it("pesos suman 1.0", () => {
    const breakdown = getScoreBreakdown(makeAudit());
    const sumPesos = breakdown.reduce((s, b) => s + b.peso, 0);
    expect(sumPesos).toBeCloseTo(1.0);
  });
});
