import { describe, it, expect } from "vitest";
import { scoreNormativa, type NormativaInput } from "../dimensions/normativa";
import type { NormativaData, ComprasData } from "@radar-municipal/core";

function makeInput(
  normOverrides: Partial<NormativaData> = {},
  comprasOverrides: Partial<ComprasData> = {}
): NormativaInput {
  return {
    normativa: {
      municipioId: "060056",
      nombre: "Bahía Blanca",
      fechaScrape: "2025-03-01",
      normasEncontradas: 50,
      normas: [],
      ordenanzaFiscalVigente: null,
      tieneBoletinSibom: false,
      boletinesPublicados: 0,
      ultimoBoletinAnio: null,
      ...normOverrides,
    },
    compras: {
      municipioId: "060056",
      publicaLicitaciones: false,
      urlPortalCompras: null,
      publicaAdjudicaciones: false,
      licitacionesDetectadas: 0,
      plataforma: null,
      notas: null,
      ...comprasOverrides,
    },
  };
}

describe("scoreNormativa", () => {
  it("calcula score total entre 0 y 100", () => {
    const result = scoreNormativa(makeInput());
    expect(result.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(result.scoreTotal).toBeLessThanOrEqual(100);
  });

  it("genera 4 criterios", () => {
    const result = scoreNormativa(makeInput());
    expect(result.criterios).toHaveLength(4);
  });

  it("municipio sin nada score 0", () => {
    const result = scoreNormativa(makeInput());
    expect(result.scoreTotal).toBe(0);
  });

  it("municipio con todo perfecto score alto", () => {
    const result = scoreNormativa(
      makeInput(
        {
          tieneBoletinSibom: true,
          boletinesPublicados: 150,
          ultimoBoletinAnio: 2025,
          ordenanzaFiscalVigente: {
            municipioId: "060056",
            tipo: "ORDENANZA",
            numero: "1234",
            anio: 2024,
            fecha: "2024-01-15",
            titulo: "Ordenanza Fiscal",
            urlPdf: null,
          },
        },
        {
          publicaLicitaciones: true,
          urlPortalCompras: "https://compras.bahiablanca.gov.ar",
          publicaAdjudicaciones: true,
          licitacionesDetectadas: 25,
        }
      )
    );
    expect(result.scoreTotal).toBe(100);
  });

  it("boletín SIBOM con pocos boletines da 0.5", () => {
    const result = scoreNormativa(
      makeInput({
        tieneBoletinSibom: true,
        boletinesPublicados: 10,
        ultimoBoletinAnio: 2020,
      })
    );
    const boletin = result.criterios.find((c) => c.indicador === "boletin_sibom");
    expect(boletin?.valor).toBe(0.5);
  });

  it("boletín SIBOM reciente da 0.8", () => {
    const result = scoreNormativa(
      makeInput({
        tieneBoletinSibom: true,
        boletinesPublicados: 50,
        ultimoBoletinAnio: 2025,
      })
    );
    const boletin = result.criterios.find((c) => c.indicador === "boletin_sibom");
    expect(boletin?.valor).toBe(0.8);
  });

  it("boletín SIBOM con historial amplio da 1.0", () => {
    const result = scoreNormativa(
      makeInput({
        tieneBoletinSibom: true,
        boletinesPublicados: 200,
        ultimoBoletinAnio: 2025,
      })
    );
    const boletin = result.criterios.find((c) => c.indicador === "boletin_sibom");
    expect(boletin?.valor).toBe(1.0);
  });

  it("licitaciones con portal dedicado da 0.8", () => {
    const result = scoreNormativa(
      makeInput({}, {
        publicaLicitaciones: true,
        urlPortalCompras: "https://compras.example.gov.ar",
        licitacionesDetectadas: 5,
      })
    );
    const licit = result.criterios.find((c) => c.indicador === "licitaciones");
    expect(licit?.valor).toBe(0.8);
  });

  it("licitaciones con volumen alto da 1.0", () => {
    const result = scoreNormativa(
      makeInput({}, {
        publicaLicitaciones: true,
        licitacionesDetectadas: 15,
      })
    );
    const licit = result.criterios.find((c) => c.indicador === "licitaciones");
    expect(licit?.valor).toBe(1.0);
  });

  it("pesos suman 1.0", () => {
    const result = scoreNormativa(makeInput());
    const sumPesos = result.criterios.reduce((s, c) => s + c.peso, 0);
    expect(sumPesos).toBeCloseTo(1.0);
  });
});
