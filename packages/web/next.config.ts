import type { NextConfig } from "next";

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
