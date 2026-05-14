import type { NextConfig } from "next";

/**
 * Sprint 51 — Bundle optimization.
 *
 * El script `build` corre `next build --webpack` (no Turbopack) porque
 * Turbopack en Next 16.2 todavía no extrae shared chunks: nuestras 3
 * rutas con Cartesian charts (panorama, dimensiones/[slug], economia)
 * duplicaban ~720 KB de Recharts (3 chunks × 360 KB idénticos). Webpack
 * extrae correctamente y baja el bundle total de 2830 KB → 2186 KB
 * (-23%). Trade-off: build dura ~64s vs ~9s de Turbopack — acceptable
 * para CI/produccion, dev sigue con Turbopack (next dev usa Turbopack
 * default; HMR rápido).
 *
 * Cuando Turbopack soporte shared chunks (probable en Next 17+), volver
 * a `build`: `next build --turbopack` (o sin flag, se pone default).
 * Tracking issue: vercel/turbo (no link estable).
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@radar-municipal/core", "@radar-municipal/scoring"],
  output: "standalone",
  /**
   * Sprint 45C — Embed widgets.
   *
   * /embed/* debe ser iframe-eable desde sitios externos (medios, blogs).
   * Defaults de Next.js no setean X-Frame-Options, pero blindar
   * explícitamente con CSP frame-ancestors=* hace al embed más previsible
   * frente a proxies/CDN que injectan headers protectivos.
   *
   * El resto del sitio NO está en esta rule — si Vercel/Cloudflare ponen
   * X-Frame-Options DENY por default, no rompe (intencional: el sitio
   * principal NO se debe embedear, solo /embed/*).
   */
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
