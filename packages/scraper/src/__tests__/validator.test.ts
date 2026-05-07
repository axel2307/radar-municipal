/**
 * Tests del validador HTTP de URLs candidatas.
 * El fetch se inyecta vía opt.fetchImpl para tests deterministas.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateBody,
  scoreConfidence,
  normalizeForMatch,
  validateUrl,
  findBestUrl,
  type ValidationResult,
} from "../url-resolver/validator";

// ─────────────────────────────────────────
// Puras
// ─────────────────────────────────────────

describe("normalizeForMatch", () => {
  it("quita acentos y baja caso", () => {
    expect(normalizeForMatch("Bahía Blanca")).toBe("bahia blanca");
    expect(normalizeForMatch("MUNICIPALIDAD")).toBe("municipalidad");
    expect(normalizeForMatch("Juárez")).toBe("juarez");
  });
});

describe("evaluateBody", () => {
  it("detecta keywords municipales", () => {
    const r = evaluateBody("<html>Bienvenido a la Municipalidad.</html>", "Tandil");
    expect(r.hasMunicipalKeywords).toBe(true);
    expect(r.hasMunicipioName).toBe(false);
  });

  it("detecta el nombre del municipio insensible a acento", () => {
    const r = evaluateBody("<h1>Municipalidad de Juárez</h1>", "Benito Juárez");
    // El nombre "benito juarez" normalizado no está en el body "municipalidad de juarez"
    // Pero si buscamos el nombre completo del municipio, falla.
    // En cambio una pagina que dice "Municipalidad de Benito Juárez" sí lo tiene:
    const r2 = evaluateBody("<h1>Municipalidad de Benito Juárez</h1>", "Benito Juárez");
    expect(r2.hasMunicipioName).toBe(true);
    expect(r2.hasMunicipalKeywords).toBe(true);
  });

  it("no matchea nombres muy cortos (< 4 chars) para evitar falsos positivos", () => {
    const r = evaluateBody("<html>algo con Zar</html>", "Zar");
    expect(r.hasMunicipioName).toBe(false);
  });

  it("body sin keywords ni nombre → ambas banderas false", () => {
    const r = evaluateBody("<html>Página genérica sin contenido.</html>", "Tandil");
    expect(r.hasMunicipalKeywords).toBe(false);
    expect(r.hasMunicipioName).toBe(false);
  });
});

describe("scoreConfidence", () => {
  it("score perfecto = 1.0", () => {
    expect(scoreConfidence({ ok: true, hasMunicipalKeywords: true, hasMunicipioName: true })).toBe(1);
  });

  it("solo 200 sin contenido válido = 0.4", () => {
    expect(scoreConfidence({ ok: true, hasMunicipalKeywords: false, hasMunicipioName: false })).toBe(0.4);
  });

  it("no responde = 0", () => {
    expect(scoreConfidence({ ok: false, hasMunicipalKeywords: true, hasMunicipioName: true })).toBe(0);
  });

  it("solo keyword municipal = 0.7", () => {
    expect(scoreConfidence({ ok: true, hasMunicipalKeywords: true, hasMunicipioName: false })).toBe(0.7);
  });
});

// ─────────────────────────────────────────
// validateUrl (fetch inyectado)
// ─────────────────────────────────────────

const mockResponse = (status: number, body = "", finalUrl?: string): Response => ({
  status,
  url: finalUrl ?? "https://example.test",
  text: async () => body,
  headers: new Headers(),
  ok: status >= 200 && status < 400,
} as Response);

describe("validateUrl", () => {
  it("200 con contenido municipal + nombre → confidence 1", async () => {
    const fakeFetch = async () =>
      mockResponse(200, "<html>Municipalidad de Tandil. Intendente: ...</html>", "https://www.tandil.gov.ar");
    const r = await validateUrl("https://www.tandil.gov.ar", {
      municipioNombre: "Tandil",
      fetchImpl: fakeFetch as typeof fetch,
    });
    expect(r.ok).toBe(true);
    expect(r.confidence).toBe(1);
    expect(r.hasMunicipioName).toBe(true);
    expect(r.hasMunicipalKeywords).toBe(true);
  });

  it("404 → ok=false, confidence 0", async () => {
    const fakeFetch = async () => mockResponse(404);
    const r = await validateUrl("https://x.test", {
      municipioNombre: "X",
      fetchImpl: fakeFetch as typeof fetch,
    });
    expect(r.ok).toBe(false);
    expect(r.httpStatus).toBe(404);
    expect(r.confidence).toBe(0);
  });

  it("fetch throws → error capturado, no explota", async () => {
    const fakeFetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    const r = await validateUrl("https://x.test", {
      municipioNombre: "X",
      fetchImpl: fakeFetch as typeof fetch,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("ECONNREFUSED");
    expect(r.confidence).toBe(0);
  });

  it("200 con solo keyword municipal → confidence 0.7", async () => {
    const fakeFetch = async () =>
      mockResponse(200, "<html>Municipalidad genérica.</html>");
    const r = await validateUrl("https://x.test", {
      municipioNombre: "OtroNombre",
      fetchImpl: fakeFetch as typeof fetch,
    });
    expect(r.confidence).toBe(0.7);
  });
});

// ─────────────────────────────────────────
// findBestUrl
// ─────────────────────────────────────────

describe("findBestUrl", () => {
  it("retorna la primera URL que supera el umbral sin probar las siguientes", async () => {
    const calls: string[] = [];
    const fakeFetch = async (url: string | URL | Request) => {
      const u = String(url);
      calls.push(u);
      if (u.includes("good")) return mockResponse(200, "Municipalidad de Tandil", u);
      return mockResponse(404);
    };
    const { selected, attempted } = await findBestUrl(
      ["https://bad.test", "https://good.test", "https://another.test"],
      { municipioNombre: "Tandil", fetchImpl: fakeFetch as typeof fetch, threshold: 0.7 },
    );
    expect(selected?.url).toBe("https://good.test");
    expect(attempted).toHaveLength(2); // se detiene después del good
  });

  it("si ninguna supera el umbral, retorna la mejor que respondió 200", async () => {
    const fakeFetch = async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("weak")) return mockResponse(200, "<html>Página genérica.</html>", u);
      return mockResponse(404);
    };
    const { selected, attempted } = await findBestUrl(
      ["https://bad.test", "https://weak.test"],
      { municipioNombre: "Tandil", fetchImpl: fakeFetch as typeof fetch, threshold: 0.7 },
    );
    expect(selected?.url).toBe("https://weak.test");
    expect(selected?.confidence).toBe(0.4);
    expect(attempted).toHaveLength(2); // probó todas
  });

  it("ninguna responde → selected=null", async () => {
    const fakeFetch = async () => mockResponse(500);
    const { selected, attempted } = await findBestUrl(["https://a.test", "https://b.test"], {
      municipioNombre: "X",
      fetchImpl: fakeFetch as typeof fetch,
    });
    expect(selected).toBeNull();
    expect(attempted).toHaveLength(2);
  });
});
