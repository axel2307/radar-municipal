import { test, expect } from "@playwright/test";

/**
 * Sprint 50 — Camino B · Visual regression.
 *
 * Snapshot por ruta clave, comparado contra una baseline committeada en
 * `tests/e2e/visual.spec.ts-snapshots/`. Si un cambio de CSS/layout
 * accidentalmente mueve píxeles, el diff queda visible en el PR.
 *
 * Convenciones:
 *  - Solo viewport (no fullPage) → snapshots livianos y deterministas.
 *  - Fixed viewport 1280×720 → reproducible entre runs.
 *  - `maxDiffPixelRatio: 0.02` → tolerancia para antialiasing/sub-pixel.
 *  - Animaciones congeladas con `animations: "disabled"`.
 *
 * Importante sobre baselines:
 *   Playwright genera screenshots platform-specific (Linux vs macOS vs
 *   Windows producen rendering distinto). La fuente de verdad de las
 *   baselines es Linux (CI). Si corrés esto local en Windows/macOS y
 *   ves diffs, NO los commitees — usá los snapshots que genera GHA.
 *   Workflow doc: tests/e2e/README.md sección "Visual regression".
 */

const VIEWPORT = { width: 1280, height: 720 };

// Mantener la lista corta. Solo páginas que vimos romperse antes (ej. home
// post-Sprint 41, panorama post-Sprint 48). Cada nueva entrada = ~30s extra
// en CI + más overhead de mantenimiento de baselines.
const PAGES = [
  { name: "home", path: "/" },
  { name: "ranking", path: "/ranking" },
  { name: "panorama", path: "/panorama" },
  { name: "dimensiones", path: "/dimensiones" },
  { name: "presion-impositiva", path: "/presion-impositiva" },
  { name: "calidad-datos", path: "/calidad-datos" },
];

test.describe("Visual regression (desktop viewport)", () => {
  test.use({ viewport: VIEWPORT });

  for (const { name, path } of PAGES) {
    test(`${name} — viewport snapshot`, async ({ page }) => {
      await page.goto(path);
      // `domcontentloaded` no alcanza para páginas con client-islands
      // (mapa, charts). `networkidle` evita screenshots a media hidratación.
      await page.waitForLoadState("networkidle");
      // Pequeño settle extra para Recharts/dynamic imports.
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`${name}.png`, {
        animations: "disabled",
        maxDiffPixelRatio: 0.02,
        fullPage: false,
      });
    });
  }
});
