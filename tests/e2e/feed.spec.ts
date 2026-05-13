import { test, expect } from "@playwright/test";

/**
 * Sprint 47E — Tests del feed.xml y sitemap.xml (Sprint 47C).
 */

test.describe("RSS feed", () => {
  test("/feed.xml responde con XML válido", async ({ request }) => {
    const res = await request.get("/feed.xml");
    expect(res.ok()).toBeTruthy();
    const contentType = res.headers()["content-type"] ?? "";
    expect(contentType).toContain("application/rss+xml");

    const body = await res.text();
    expect(body).toContain("<?xml");
    expect(body).toContain('<rss version="2.0"');
    expect(body).toContain("<title>Radar Municipal");
    expect(body).toContain("<channel>");
    // Al menos un item
    expect(body).toContain("<item>");
  });

  test("RSS link discoverable desde home (alternate)", async ({ page }) => {
    await page.goto("/");
    const rssLink = page.locator(
      'link[rel="alternate"][type="application/rss+xml"]',
    );
    await expect(rssLink).toHaveCount(1);
    const href = await rssLink.getAttribute("href");
    expect(href).toMatch(/\/feed\.xml$/);
  });
});

test.describe("Sitemap", () => {
  test("/sitemap.xml lista todas las páginas top + 135 municipios", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();

    // Top pages
    for (const path of [
      "/ranking",
      "/mapa",
      "/comparador",
      "/panorama",
      "/dimensiones",
      "/calidad-datos",
      "/presion-impositiva",
      "/compras",
      "/datos-abiertos",
      "/metodologia",
      "/embed",
    ]) {
      expect(body, `should contain ${path}`).toContain(path);
    }

    // Sample dimensión slugs
    expect(body).toContain("/dimensiones/transparencia");
    expect(body).toContain("/dimensiones/red-vial");

    // Sample municipios — Bahía Blanca (piloto) + algún no-piloto
    expect(body).toContain("/municipios/060056");
    // Sprint 47C: ahora se incluyen los 135, no solo 13 piloto
    expect(body).toContain("/municipios/060007"); // Adolfo Alsina (no-piloto)
  });
});
