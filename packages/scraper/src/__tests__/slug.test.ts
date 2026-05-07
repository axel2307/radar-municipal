/**
 * Tests de generación de slugs y URLs candidatas.
 * Todo es puro — no hay red, no hay fixtures.
 */

import { describe, it, expect } from "vitest";
import { slugify, generateSlugs, generateUrlsFromSlug, generateCandidateUrls } from "../url-resolver/slug";

describe("slugify", () => {
  it("baja caso y quita acentos", () => {
    expect(slugify("Bahía Blanca")).toBe("bahiablanca");
    expect(slugify("Benito Juárez")).toBe("benitojuarez");
    expect(slugify("Colón")).toBe("colon");
    expect(slugify("Chascomús")).toBe("chascomus");
    expect(slugify("Coronel Suárez")).toBe("coronelsuarez");
  });

  it("reemplaza ñ por n", () => {
    expect(slugify("Cañuelas")).toBe("canuelas");
  });

  it("quita espacios y puntuación", () => {
    expect(slugify("San Antonio de Areco")).toBe("sanantoniodeareco");
    expect(slugify("Gral. San Martín")).toBe("gralsanmartin");
  });

  it("maneja strings vacíos", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
  });
});

describe("generateSlugs", () => {
  it("primera candidata es siempre el nombre completo concatenado", () => {
    const slugs = generateSlugs("Bahía Blanca");
    expect(slugs[0]).toBe("bahiablanca");
  });

  it("genera variante sin honorífico para 'General/Coronel/Almirante'", () => {
    expect(generateSlugs("Almirante Brown")).toContain("brown");
    expect(generateSlugs("Coronel Dorrego")).toContain("dorrego");
    expect(generateSlugs("General Alvarado")).toContain("alvarado");
    expect(generateSlugs("Capitán Sarmiento")).toContain("sarmiento");
  });

  it("genera variante sin stopwords", () => {
    const slugs = generateSlugs("Carmen de Areco");
    expect(slugs).toContain("carmendeareco"); // slug completo
    expect(slugs).toContain("carmenareco"); // sin "de"
  });

  it("nombre de una sola palabra genera 1 slug (no duplica)", () => {
    const slugs = generateSlugs("Tandil");
    expect(slugs).toEqual(["tandil"]);
  });

  it("triple palabra genera variante primera+última", () => {
    const slugs = generateSlugs("Adolfo Gonzales Chaves");
    expect(slugs).toContain("adolfogonzaleschaves");
    expect(slugs).toContain("adolfochaves");
  });

  it("todos los slugs tienen longitud ≥ 3", () => {
    const slugs = generateSlugs("La Plata");
    expect(slugs.every((s) => s.length >= 3)).toBe(true);
  });

  it("no genera duplicados", () => {
    const slugs = generateSlugs("Tandil");
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("generateUrlsFromSlug", () => {
  it("genera 6 URLs (3 TLD × con/sin www)", () => {
    const urls = generateUrlsFromSlug("tandil");
    expect(urls).toHaveLength(6);
    expect(urls[0]).toBe("https://www.tandil.gob.ar");
    expect(urls).toContain("https://tandil.gov.ar");
    expect(urls).toContain("https://www.tandil.com.ar");
  });

  it("slug vacío retorna array vacío", () => {
    expect(generateUrlsFromSlug("")).toEqual([]);
  });

  it("prioriza gob.ar sobre gov.ar sobre com.ar", () => {
    const urls = generateUrlsFromSlug("x");
    expect(urls[0]).toContain(".gob.ar");
    expect(urls[urls.length - 1]).toContain(".com.ar");
  });
});

describe("generateCandidateUrls", () => {
  it("combina slugs × URLs sin duplicados", () => {
    const urls = generateCandidateUrls("Almirante Brown");
    // 2 slugs (almirantebrown, brown) × 6 URLs c/u = 12
    expect(urls.length).toBe(12);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain("https://www.almirantebrown.gob.ar");
    expect(urls).toContain("https://www.brown.gob.ar");
  });

  it("retorna URLs en orden: mejor slug × mejor TLD primero", () => {
    const urls = generateCandidateUrls("Bahía Blanca");
    expect(urls[0]).toBe("https://www.bahiablanca.gob.ar");
  });
});
