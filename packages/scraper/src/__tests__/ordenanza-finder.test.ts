/**
 * Tests del `ordenanza-finder` — módulo puro que rankea candidatos a
 * Ordenanza Impositiva desde el HTML de un portal municipal.
 *
 * Filosofía:
 *   - Fixtures son HTMLs sintéticos pero representativos de lo que vemos
 *     en los portales reales (menús con links, listas de docs, wiki
 *     con cuadros).
 *   - Validamos scoring + ranking + dedupe, no parseo HTML exacto.
 */

import { describe, it, expect } from "vitest";
import {
  extractOrdenanzaCandidates,
  scoreCandidate,
} from "../url-resolver/ordenanza-finder";

describe("scoreCandidate", () => {
  it("premia 'impositiva' en filename", () => {
    const { score, reasons } = scoreCandidate(
      "Descargar",
      "https://muni.gob.ar/docs/ordenanza-impositiva-2025.pdf",
    );
    // +5 impositiva + 1 ordenanza + 2 año 2025 = 8
    expect(score).toBe(8);
    expect(reasons).toContain("+5 impositiva/tarifaria");
    expect(reasons).toContain("+2 año 2025");
  });

  it("premia 'tarifaria' como alias", () => {
    const { score } = scoreCandidate(
      "Ordenanza Tarifaria 2026",
      "https://muni.gob.ar/tarifaria-2026.pdf",
    );
    expect(score).toBe(8); // +5 tarifaria + 1 ordenanza + 2 año 2026
  });

  it("penaliza 'fiscal' sin 'impositiv'", () => {
    const { score, reasons } = scoreCandidate(
      "Código Fiscal",
      "https://muni.gob.ar/codigo-fiscal-2025.pdf",
    );
    // +1 ordenanza? No, no tiene. +2 año 2025 - 3 fiscal = -1
    expect(score).toBe(-1);
    expect(reasons).toContain("-3 fiscal sin impositiva");
  });

  it("NO penaliza 'fiscal' si también aparece 'impositiva'", () => {
    const { score } = scoreCandidate(
      "Ordenanza Fiscal e Impositiva 2025",
      "https://muni.gob.ar/fiscal-impositiva-2025.pdf",
    );
    // +5 impositiva + 1 ordenanza + 2 año 2025 (sin penalización fiscal)
    expect(score).toBe(8);
  });

  it("penaliza años viejos", () => {
    const { score, reasons } = scoreCandidate(
      "Ordenanza Impositiva 2018",
      "https://muni.gob.ar/impositiva-2018.pdf",
    );
    // +5 impositiva + 1 ordenanza - 1 año viejo = 5
    expect(score).toBe(5);
    expect(reasons).toContain("-1 año viejo 2018");
  });

  it("suma 'tasas' / 'tributaria' como señal secundaria", () => {
    const { score } = scoreCandidate(
      "Tasas y Derechos 2025",
      "https://muni.gob.ar/tasas-2025.pdf",
    );
    // +1 tasa + 2 año = 3 (sin 'ordenanza' ni 'impositiva')
    expect(score).toBe(3);
  });

  it("score neutro para links sin señales", () => {
    const { score } = scoreCandidate(
      "Noticias",
      "https://muni.gob.ar/noticias",
    );
    expect(score).toBe(0);
  });
});

describe("extractOrdenanzaCandidates", () => {
  const base = "https://muni.gob.ar/";

  it("extrae anchors que mencionan 'ordenanza' y los rankea", () => {
    const html = `
      <html><body>
        <ul>
          <li><a href="/docs/ordenanza-impositiva-2025.pdf">Ordenanza Impositiva 2025</a></li>
          <li><a href="/docs/codigo-fiscal-2025.pdf">Código Fiscal</a></li>
          <li><a href="/noticias">Noticias</a></li>
        </ul>
      </body></html>
    `;
    const candidates = extractOrdenanzaCandidates(html, base);
    expect(candidates).toHaveLength(2); // /noticias descartado
    expect(candidates[0].url).toContain("ordenanza-impositiva-2025.pdf");
    expect(candidates[0].score).toBeGreaterThan(candidates[1].score);
  });

  it("resuelve URLs relativas contra baseUrl", () => {
    const html = `<a href="docs/impositiva.pdf">Ver</a>`;
    const candidates = extractOrdenanzaCandidates(html, "https://muni.gob.ar/transparencia/");
    expect(candidates[0].url).toBe("https://muni.gob.ar/transparencia/docs/impositiva.pdf");
  });

  it("dedupe: misma URL distinto anchor → conserva el de mejor score", () => {
    const html = `
      <a href="/ord.pdf">Descargar</a>
      <a href="/ord.pdf">Ordenanza Impositiva 2026</a>
    `;
    const candidates = extractOrdenanzaCandidates(html, base);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].anchorText).toBe("Ordenanza Impositiva 2026");
    expect(candidates[0].score).toBeGreaterThan(0);
  });

  it("descarta anchors a assets (png, css, js)", () => {
    const html = `
      <a href="/ordenanza.pdf">Ordenanza Impositiva</a>
      <a href="/logo.png">Ordenanza</a>
      <a href="/style.css">Ordenanza</a>
    `;
    const candidates = extractOrdenanzaCandidates(html, base);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].url).toContain("ordenanza.pdf");
  });

  it("descarta hrefs no-HTTP (mailto:, javascript:)", () => {
    const html = `
      <a href="mailto:info@muni.gob.ar">Ordenanza impositiva email</a>
      <a href="javascript:void(0)">Ordenanza impositiva js</a>
      <a href="/ord.pdf">Ordenanza Impositiva</a>
    `;
    const candidates = extractOrdenanzaCandidates(html, base);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].url).toContain("/ord.pdf");
  });

  it("tolera anchors malformados sin error", () => {
    const html = `
      <a>Sin href</a>
      <a href="">Href vacío ordenanza</a>
      <a href="not a url">Ordenanza rota</a>
      <a href="/ord.pdf">Ordenanza Impositiva</a>
    `;
    expect(() => extractOrdenanzaCandidates(html, base)).not.toThrow();
    const candidates = extractOrdenanzaCandidates(html, base);
    // "not a url" se resuelve relativo a base → válido, pero no es PDF
    // por lo que "ordenanza rota" pasa igual ya que tiene "ordenanza" en texto;
    // sólo validamos que haya al menos el PDF real.
    expect(candidates.some((c) => c.url.endsWith("/ord.pdf"))).toBe(true);
  });

  it("devuelve array vacío si el HTML no tiene ordenanzas", () => {
    const html = `<p>Sitio del municipio. Noticias, eventos.</p>`;
    expect(extractOrdenanzaCandidates(html, base)).toEqual([]);
  });

  it("strip HTML tags internos del anchor text", () => {
    const html = `<a href="/imp.pdf"><strong>Ordenanza</strong> Impositiva <em>2026</em></a>`;
    const candidates = extractOrdenanzaCandidates(html, base);
    expect(candidates[0].anchorText).toBe("Ordenanza Impositiva 2026");
    // +5 impositiva + 1 ordenanza + 2 año 2026 = 8
    expect(candidates[0].score).toBe(8);
  });

  it("ranking completo: fixture realista con múltiples candidatos", () => {
    // Imitando el menú típico de un portal: 1 código fiscal viejo, 1 impositiva
    // nueva, 1 boletín genérico, 1 ordenanza tarifaria de años pasados.
    const html = `
      <nav>
        <a href="/transparencia/ordenanza-fiscal-2009.pdf">Ordenanza Fiscal 2009</a>
        <a href="/transparencia/ordenanza-impositiva-2026.pdf">Ordenanza Impositiva 2026</a>
        <a href="/transparencia/boletin-oficial.pdf">Boletín Oficial</a>
        <a href="/transparencia/ordenanza-tarifaria-2018.pdf">Ordenanza Tarifaria 2018</a>
      </nav>
    `;
    const candidates = extractOrdenanzaCandidates(html, base);
    expect(candidates[0].url).toContain("impositiva-2026.pdf");
    // Boletín Oficial no debería tener score positivo — no hay "ordenanza" ni keyword fuerte
    const boletin = candidates.find((c) => c.url.includes("boletin"));
    // 'boletín-oficial' no tiene "ordenanza" así que no pasa el filtro
    expect(boletin).toBeUndefined();
  });
});
