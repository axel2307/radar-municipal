import { test, expect } from "@playwright/test";

// Bahía Blanca es uno de los 13 pilotos y siempre está cargado con datos reales,
// por eso lo elegimos como canary de la ficha municipal.
const BAHIA_ID = "060056";

test.describe("Ficha municipal", () => {
  test("renders heading and scores for Bahía Blanca", async ({ page }) => {
    const response = await page.goto(`/municipios/${BAHIA_ID}`);
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { level: 1, name: /Bahía Blanca/i }),
    ).toBeVisible();

    // Al menos un score agregado debe aparecer en la página
    // (valor numérico entre 0 y 100, típico de ScoreBadge).
    const hasScore = await page
      .locator("body")
      .textContent()
      .then((txt) => /\b\d{1,3}\b/.test(txt ?? ""));
    expect(hasScore).toBeTruthy();
  });

  test("exposes Schema.org JSON-LD as GovernmentOrganization", async ({ page }) => {
    await page.goto(`/municipios/${BAHIA_ID}`);

    const jsonLdHandles = await page.locator('script[type="application/ld+json"]').all();
    expect(jsonLdHandles.length).toBeGreaterThan(0);

    const payloads = await Promise.all(
      jsonLdHandles.map((h) => h.textContent()),
    );
    const parsed = payloads
      .filter((t): t is string => typeof t === "string" && t.length > 0)
      .map((t) => {
        try {
          return JSON.parse(t);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // At least one block should declare a GovernmentOrganization type
    const hasGovOrg = parsed.some((obj) => {
      const type = obj?.["@type"];
      return Array.isArray(type) ? type.includes("GovernmentOrganization") : type === "GovernmentOrganization";
    });
    expect(
      hasGovOrg,
      "Expected at least one JSON-LD with @type GovernmentOrganization on the municipio detail page",
    ).toBeTruthy();
  });

  // Next.js 16 returns HTTP 200 for streamed not-found responses and inyecta
  // <meta name="robots" content="noindex"> automáticamente para proteger SEO.
  // Por eso chequeamos la UI dedicada + el meta noindex, no el status code.
  test("unknown id renders dedicated not-found UI with noindex meta", async ({ page }) => {
    await page.goto("/municipios/999999");
    await expect(
      page.getByRole("heading", { name: /Municipio no encontrado/i }),
    ).toBeVisible();
    const noindexCount = await page
      .locator('meta[name="robots"][content*="noindex"]')
      .count();
    expect(noindexCount).toBeGreaterThan(0);
  });

  test("unknown id on /economia sub-route also renders not-found with noindex", async ({ page }) => {
    await page.goto("/municipios/999999/economia");
    await expect(
      page.getByRole("heading", { name: /Municipio no encontrado/i }),
    ).toBeVisible();
    const noindexCount = await page
      .locator('meta[name="robots"][content*="noindex"]')
      .count();
    expect(noindexCount).toBeGreaterThan(0);
  });
});
