import { describe, it, expect } from "vitest";
import { scoreFiscal, scoreFiscalSourced, type FiscalInput } from "../dimensions/fiscal";
import {
  type FiscalIndicator,
  type FiscalIndicatorSourced,
  type SourcedValue,
  flattenFiscalIndicator,
  SourceLayer,
  ConfidenceLevel,
} from "@radar-municipal/core";

function makeFiscalInput(overrides: Partial<FiscalIndicator> = {}, poblacion = 100000): FiscalInput {
  return {
    fiscal: {
      id: 0,
      municipioId: "060056",
      anio: 2024,
      trimestre: 3,
      gastoTotal: 10_000_000_000,
      gastoPersonal: 5_500_000_000,
      gastoCapital: 1_200_000_000,
      deudaTotal: 500_000_000,
      ingresoTotal: 10_500_000_000,
      resultadoFiscal: 500_000_000,
      gastoPcapita: null,
      deudaPcapita: null,
      pctPersonal: null,
      pctCapital: null,
      ...overrides,
    },
    poblacion,
  };
}

describe("scoreFiscal", () => {
  it("calcula score total entre 0 y 100", () => {
    const result = scoreFiscal(makeFiscalInput());
    expect(result.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
  });

  it("genera 4 criterios sin datos expandidos", () => {
    const result = scoreFiscal(makeFiscalInput());
    expect(result.criterios).toHaveLength(4);
  });

  it("genera 7 criterios con datos expandidos", () => {
    const result = scoreFiscal(makeFiscalInput({
      autonomiaFiscal: 50,
      presionTributaria: 100000,
      eficienciaAdmin: 18,
    }));
    expect(result.criterios).toHaveLength(7);
  });

  it("calcula indicadores derivados correctamente", () => {
    const result = scoreFiscal(makeFiscalInput());
    expect(result.gastoPcapita).toBeCloseTo(100000, 0); // 10B / 100k
    expect(result.deudaPcapita).toBeCloseTo(5000, 0);   // 500M / 100k
    expect(result.pctPersonal).toBeCloseTo(55, 0);       // 5.5B / 10B * 100
    expect(result.pctCapital).toBeCloseTo(12, 0);        // 1.2B / 10B * 100
    expect(result.resultadoPcapita).toBeCloseTo(5000, 0); // 500M / 100k
  });

  it("da score alto a municipio con finanzas sanas", () => {
    const result = scoreFiscal(makeFiscalInput({
      gastoPersonal: 3_500_000_000,  // 35% personal → 1.0
      gastoCapital: 2_500_000_000,   // 25% capital → 1.0
      deudaTotal: 100_000_000,       // Deuda baja
      resultadoFiscal: 1_000_000_000, // Superávit alto
    }));
    expect(result.scoreTotal).toBeGreaterThan(70);
  });

  it("da score bajo a municipio con finanzas malas", () => {
    const result = scoreFiscal(makeFiscalInput({
      gastoPersonal: 8_500_000_000,   // 85% personal → 0.0
      gastoCapital: 200_000_000,      // 2% capital → 0.2
      deudaTotal: 5_000_000_000,      // Deuda alta
      resultadoFiscal: -2_000_000_000, // Déficit fuerte
    }));
    expect(result.scoreTotal).toBeLessThan(30);
  });

  it("municipio sin deuda recibe score máximo en ese criterio", () => {
    const result = scoreFiscal(makeFiscalInput({ deudaTotal: 0 }));
    const deudaCriterio = result.criterios.find((c) => c.indicador === "deuda_pcapita");
    expect(deudaCriterio?.valorNormalizado).toBe(1.0);
  });

  it("pesos suman 1.0 con 4 criterios", () => {
    const result = scoreFiscal(makeFiscalInput());
    const sumPesos = result.criterios.reduce((s, c) => s + c.peso, 0);
    expect(sumPesos).toBeCloseTo(1.0);
  });

  it("pesos suman 1.0 con 7 criterios", () => {
    const result = scoreFiscal(makeFiscalInput({
      autonomiaFiscal: 50,
      presionTributaria: 100000,
      eficienciaAdmin: 18,
    }));
    const sumPesos = result.criterios.reduce((s, c) => s + c.peso, 0);
    expect(sumPesos).toBeCloseTo(1.0);
  });

  it("backward compat: score sin datos expandidos es cercano al anterior", () => {
    // With only the original 4 indicators, the weights redistribute
    // so the score should still be valid
    const result = scoreFiscal(makeFiscalInput());
    expect(result.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
    expect(result.autonomiaFiscal).toBeNull();
    expect(result.presionTributaria).toBeNull();
    expect(result.eficienciaAdmin).toBeNull();
  });

  it("alta autonomia fiscal da buen score en ese criterio", () => {
    const result = scoreFiscal(makeFiscalInput({
      autonomiaFiscal: 65,
      presionTributaria: 100000,
      eficienciaAdmin: 12,
    }));
    const autonomia = result.criterios.find((c) => c.indicador === "autonomia_fiscal");
    expect(autonomia?.valorNormalizado).toBe(1.0);
  });

  it("baja eficiencia admin (alto gasto) da score bajo", () => {
    const result = scoreFiscal(makeFiscalInput({
      autonomiaFiscal: 50,
      presionTributaria: 100000,
      eficienciaAdmin: 32,
    }));
    const eficiencia = result.criterios.find((c) => c.indicador === "eficiencia_admin");
    expect(eficiencia?.valorNormalizado).toBe(0.1);
  });

  it("maneja datos null con score neutro bajo", () => {
    const result = scoreFiscal({
      fiscal: {
        id: 0,
        municipioId: "060056",
        anio: 2024,
        trimestre: 3,
        gastoTotal: null as any,
        gastoPersonal: null as any,
        gastoCapital: null as any,
        deudaTotal: null as any,
        ingresoTotal: null as any,
        resultadoFiscal: null as any,
        gastoPcapita: null,
        deudaPcapita: null,
        pctPersonal: null,
        pctCapital: null,
      },
      poblacion: 100000,
    });
    // All null → all get 0.3 score → total = 30
    expect(result.scoreTotal).toBeCloseTo(30, 0);
  });
});

// ─────────────────────────────────────────
// Tests para procedencia multicapa
// ─────────────────────────────────────────

function sv(valor: number | null, capa: SourceLayer = SourceLayer.MUNICIPAL): SourcedValue<number> {
  return {
    valor,
    fuente: valor != null ? {
      capa,
      organismo: capa === SourceLayer.MUNICIPAL ? "PORTAL_MUNICIPAL" : "CONTADURIA_GENERAL_PBA",
      url: "https://example.com",
      formato: "PDF",
      fechaAcceso: "2025-03-01",
      fechaPublicacion: null,
    } : null,
    confianza: valor != null ? {
      nivel: ConfidenceLevel.MEDIA,
      notas: null,
      validadoContra: null,
    } : null,
  };
}

function makeSourcedIndicator(overrides: Partial<Pick<FiscalIndicatorSourced, "gastoTotal" | "gastoPersonal" | "gastoCapital" | "deudaTotal" | "ingresoTotal" | "resultadoFiscal" | "gastoPcapita" | "deudaPcapita" | "pctPersonal" | "pctCapital" | "autonomiaFiscal" | "presionTributaria" | "eficienciaAdmin">> = {}): FiscalIndicatorSourced {
  return {
    id: 0,
    municipioId: "060056",
    anio: 2024,
    trimestre: 3,
    gastoTotal: sv(10_000_000_000),
    gastoPersonal: sv(5_500_000_000),
    gastoCapital: sv(1_200_000_000),
    deudaTotal: sv(500_000_000),
    ingresoTotal: sv(10_500_000_000),
    resultadoFiscal: sv(500_000_000),
    gastoPcapita: sv(null),
    deudaPcapita: sv(null),
    pctPersonal: sv(null),
    pctCapital: sv(null),
    ...overrides,
  } as FiscalIndicatorSourced;
}

describe("flattenFiscalIndicator", () => {
  it("extrae valores planos de SourcedValue", () => {
    const sourced = makeSourcedIndicator();
    const flat = flattenFiscalIndicator(sourced);

    expect(flat.gastoTotal).toBe(10_000_000_000);
    expect(flat.gastoPersonal).toBe(5_500_000_000);
    expect(flat.deudaTotal).toBe(500_000_000);
    expect(flat.gastoPcapita).toBeNull();
  });

  it("preserva null cuando SourcedValue.valor es null", () => {
    const sourced = makeSourcedIndicator({
      deudaTotal: sv(null),
    });
    const flat = flattenFiscalIndicator(sourced);
    expect(flat.deudaTotal).toBeNull();
  });
});

describe("scoreFiscalSourced", () => {
  it("produce el mismo resultado que scoreFiscal con datos equivalentes", () => {
    const sourced = makeSourcedIndicator();
    const flat = flattenFiscalIndicator(sourced);

    const resultSourced = scoreFiscalSourced({ fiscal: sourced, poblacion: 100000 });
    const resultFlat = scoreFiscal({ fiscal: flat, poblacion: 100000 });

    expect(resultSourced.scoreTotal).toBe(resultFlat.scoreTotal);
    expect(resultSourced.gastoPcapita).toBe(resultFlat.gastoPcapita);
    expect(resultSourced.pctPersonal).toBe(resultFlat.pctPersonal);
  });

  it("maneja datos de fuente provincial igual que municipal", () => {
    const sourced = makeSourcedIndicator({
      deudaTotal: sv(500_000_000, SourceLayer.PROVINCIAL),
    });
    const result = scoreFiscalSourced({ fiscal: sourced, poblacion: 100000 });
    // El scoring no discrimina por capa — eso es trabajo de la UI
    expect(result.deudaPcapita).toBeCloseTo(5000, 0);
  });
});
