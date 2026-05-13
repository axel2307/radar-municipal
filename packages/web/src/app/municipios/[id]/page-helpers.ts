import type { Municipio } from "@radar-municipal/core";

/**
 * Sprint 47B — Helpers compartidos por la página de ficha municipal.
 * Extraídos del monolítico page.tsx (897 LOC → ~200 LOC orchestrator).
 */

/**
 * Tabs de navegación scroll-to-id que renderea `DetailSectionNav`.
 * Source of truth de los anchors. Si se agrega o renombra una sección,
 * cambiar acá y los `<div id="...">` correspondientes.
 */
export const SECTION_NAV = [
  { id: "resumen", label: "Resumen" },
  { id: "gobierno", label: "Gobierno Abierto", color: "blue" as const },
  { id: "economia", label: "Economía", color: "amber" as const },
  { id: "calidad", label: "Calidad de Vida", color: "green" as const },
  { id: "infra", label: "Infraestructura", color: "purple" as const },
  { id: "datos", label: "Datos y Brechas" },
];

/**
 * JSON-LD para GovernmentOrganization. Schema.org reconoce este tipo
 * para entidades públicas — útil para SEO + featured snippets en
 * buscadores.
 */
export function buildGovernmentOrgJsonLd(municipio: Municipio) {
  return {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    name: `Municipio de ${municipio.nombre}`,
    areaServed: {
      "@type": "AdministrativeArea",
      name: `Partido de ${municipio.partido}, Provincia de Buenos Aires, Argentina`,
    },
    ...(municipio.urlOficial ? { url: municipio.urlOficial } : {}),
    description: `Ficha municipal de ${municipio.nombre} con scores en 11 dimensiones de gestión pública.`,
  };
}

/**
 * JSON-LD BreadcrumbList. La página ya renderea `<Breadcrumbs>` visual,
 * pero los crawlers (Google, Bing) prefieren el structured data explícito.
 * Mismas etiquetas que el componente visual.
 */
export function buildBreadcrumbJsonLd(municipio: Municipio) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: "https://radarmunicipal.ar",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Municipios",
        item: "https://radarmunicipal.ar/municipios",
      },
      { "@type": "ListItem", position: 3, name: municipio.nombre },
    ],
  };
}
