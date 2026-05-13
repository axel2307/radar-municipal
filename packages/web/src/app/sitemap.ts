import type { MetadataRoute } from "next";
import { MUNICIPIOS, MUNICIPIOS_PILOTO } from "@radar-municipal/core";

/**
 * Sprint 47C — Sitemap expandido.
 *
 * Antes: 9 páginas estáticas + 13 piloto = 22 URLs.
 * Ahora: ~180 URLs (135 municipios + 13 fichas /economia + 14 dimensiones +
 * embeds + páginas top).
 *
 * Convenciones:
 *   - changeFrequency: refleja realmente cuándo cambia. Las páginas top
 *     dependen del cron mensual → "monthly". Stats agregados → "weekly".
 *   - priority: 1.0 home, 0.9 ranking/mapa, 0.8 fichas piloto, 0.7
 *     análisis profundo, 0.6 docs, 0.4 acerca, 0.3 embed.
 *   - lastModified: now() para todas. Una mejora futura sería leer fechas
 *     reales del manifest del cron.
 */
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://radarmunicipal.ar";

const ACTIVE_DIMENSION_SLUGS = [
  "transparencia",
  "fiscal",
  "normativa",
  "participacion-ciudadana",
  "gasto-por-funcion",
  "economia-local",
  "presion-impositiva",
  "servicios-basicos",
  "educacion-salud",
  "conectividad-digital",
  "espacio-publico",
  "seguridad-vial",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const top: MetadataRoute.Sitemap = [
    // Tier 1: home + main exploration
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/ranking`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/mapa`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/comparador`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/panorama`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },

    // Tier 2: listings
    { url: `${BASE_URL}/municipios`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/dimensiones`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },

    // Tier 3: análisis profundo
    { url: `${BASE_URL}/calidad-datos`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/presion-impositiva`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/compras`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },

    // Tier 4: docs + about
    { url: `${BASE_URL}/metodologia`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/datos-abiertos`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/acerca-de`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },

    // Tier 5: embeds (no para usuarios finales pero sí indexables)
    { url: `${BASE_URL}/embed`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/embed/ranking`, lastModified: now, changeFrequency: "weekly", priority: 0.3 },
    { url: `${BASE_URL}/embed/mapa`, lastModified: now, changeFrequency: "weekly", priority: 0.3 },
  ];

  const dimensiones: MetadataRoute.Sitemap = ACTIVE_DIMENSION_SLUGS.map(
    (slug) => ({
      url: `${BASE_URL}/dimensiones/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }),
  );

  // Deep dives (no en el slug genérico)
  const deepDives: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/dimensiones/red-vial`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Los 135 municipios (no solo 13 piloto). Los no-piloto tienen contenido
  // stub pero igual son páginas válidas — el crawler las debe indexar
  // para que se descubran cuando se agregue cobertura.
  const municipios: MetadataRoute.Sitemap = MUNICIPIOS.map((m) => ({
    url: `${BASE_URL}/municipios/${m.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: m.esPiloto ? 0.8 : 0.5,
  }));

  // /economia detail por piloto (los no-piloto no tienen data fiscal
  // suficiente para que valga la pena indexar el detalle)
  const economiaPaginas: MetadataRoute.Sitemap = MUNICIPIOS_PILOTO.map((m) => ({
    url: `${BASE_URL}/municipios/${m.id}/economia`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...top,
    ...dimensiones,
    ...deepDives,
    ...municipios,
    ...economiaPaginas,
  ];
}
