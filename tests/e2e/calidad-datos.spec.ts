import { test, expect } from "@playwright/test";

test.describe("Calidad de datos", () => {
  test("renders stats header and full 135-row table", async ({ page }) => {
    const response = await page.goto("/calidad-datos");
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { level: 1, name: /Calidad de datos/i }),
    ).toBeVisible();

    // KPI labels that should always be visible
    await expect(page.getByText(/Municipios con datos/i)).toBeVisible();
    await expect(page.getByText(/Cobertura promedio/i)).toBeVisible();

    // The table renders all 135 municipios. We assert on the link count: each
    // row links to /municipios/:id.
    const municipioLinks = page.locator('a[href^="/municipios/"]');
    await expect
      .poll(async () => municipioLinks.count(), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(135);
  });

  test("data-status filter narrows rows to pilots with data", async ({ page }) => {
    await page.goto("/calidad-datos");

    // Toggle the "Con datos (piloto)" chip
    await page.getByRole("button", { name: /Con datos \(piloto\)/i }).click();

    // Counter should now show "Mostrando 13 de 135 municipios"
    await expect(
      page.getByText(/Mostrando\s+13\s+de\s+135\s+municipios/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("exposes Dataset JSON-LD", async ({ page }) => {
    await page.goto("/calidad-datos");

    const payloads = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(payloads.length).toBeGreaterThan(0);

    const hasDataset = payloads.some((raw) => {
      try {
        const obj = JSON.parse(raw);
        const t = obj?.["@type"];
        return Array.isArray(t) ? t.includes("Dataset") : t === "Dataset";
      } catch {
        return false;
      }
    });
    expect(hasDataset, "Expected a Dataset JSON-LD on /calidad-datos").toBeTruthy();
  });
});
