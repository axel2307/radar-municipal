import { defineConfig, devices } from "@playwright/test";

/**
 * Radar Municipal — E2E test configuration (H1.2).
 *
 * Tests live in `tests/e2e/` at workspace root and target the Next.js web app
 * built from `packages/web`. We boot a production server via `next start`
 * because dev mode behaves differently (HMR, delayed hydration) and we want
 * the suite to resemble how users hit the deployed build.
 *
 * Browsers: only Chromium for now. Firefox/WebKit can be enabled later once
 * the suite is stable. CI defaults to headless; locally you can pass --headed.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: isCI ? "retain-on-failure" : "off",
    // Use Spanish locale since UI is es-AR
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      // Sprint 50 — el spec de visual regression vive en un project propio
      // (`visual`) porque (a) sus baselines son platform-specific y tienen
      // que regenerarse en Linux/CI, (b) no queremos que la e2e job lo
      // corra automáticamente hasta tener baselines committeadas.
      testIgnore: [/.*\.mobile\.spec\.ts$/, /visual\.spec\.ts$/],
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
      testMatch: /.*\.mobile\.spec\.ts$/,
    },
    {
      name: "visual",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /visual\.spec\.ts$/,
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // We rely on `next start` against a prebuilt `.next/`. The `test:e2e`
        // script at workspace root runs `next build` first, so this command
        // only needs to boot the prebuilt server. We invoke `next` via the
        // web package's local binary to stay PATH-independent (works in both
        // pnpm/npm/yarn shells and on CI).
        command: `node packages/web/node_modules/next/dist/bin/next start packages/web --port ${PORT} --hostname 127.0.0.1`,
        url: BASE_URL,
        reuseExistingServer: !isCI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
