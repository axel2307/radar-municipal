/**
 * Sprint 47C — RSS feed de Radar Municipal.
 *
 * Disponible en `/feed.xml`. RSS 2.0 spec (mejor soporte que Atom para
 * herramientas como Slack/IFTTT/etc.).
 *
 * Items emitidos:
 *   1. Cada `run` del manifest del cron (compras, deuda, vial) con info de
 *      cobertura: "Refresh de X — N municipios actualizados".
 *   2. Hitos del proyecto hardcodeados (nuevos features publicados):
 *      `/dimensiones/red-vial`, `/dimensiones/normativa`, `/embed`, `/comparador`
 *      con dynamic OG, etc. — sirven como "qué hay nuevo en el sitio".
 *
 * Esto NO es un feed cronológico de cambios (no persistimos manifests
 * previos). Es un "snapshot del estado actual" + "feed de novedades del
 * sitio". Suficiente para que periodistas/auditores se suscriban y vean
 * cuando algo cambia.
 */
import {
  getGlobalRefreshManifest,
  getRefreshAge,
} from "@/lib/scoring-data";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://radarmunicipal.ar";

interface FeedItem {
  title: string;
  description: string;
  link: string;
  /** ISO timestamp. */
  pubDate: string;
  /** GUID estable; permite a clientes detectar dedupes. */
  guid: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(iso: string): string {
  // RSS spec: RFC 822 format (e.g. "Mon, 12 May 2026 22:00:00 GMT")
  return new Date(iso).toUTCString();
}

/**
 * Hitos hardcodeados del sitio. Cuando se publica una feature nueva,
 * agregar acá con `pubDate` real. Estos NO se sobrescriben en cada
 * refresh — son la historia de "qué hay nuevo en el sitio".
 */
const SITE_MILESTONES: FeedItem[] = [
  {
    title: "Nuevo: heatmap de pesos por km de red vial",
    description:
      "Cruce fiscal × OSM para 13 municipios piloto. Mar del Plata gasta 60× más por km que Lobería. Indicador comparativo del Pilar 5.",
    link: `${BASE_URL}/dimensiones/red-vial`,
    pubDate: "2026-05-09T12:00:00Z",
    guid: `${BASE_URL}/dimensiones/red-vial#sprint-32`,
  },
  {
    title: "Nuevo: vista profunda de Normativa & SIBOM",
    description:
      "Cobertura boletín SIBOM, ordenanzas fiscales vigentes y publicación de adjudicaciones. 5,520+ normas agregadas en los 13 piloto.",
    link: `${BASE_URL}/dimensiones/normativa`,
    pubDate: "2026-05-12T12:00:00Z",
    guid: `${BASE_URL}/dimensiones/normativa#sprint-44b`,
  },
  {
    title: "Nuevo: embed widgets para medios y blogs",
    description:
      "Iframes copy-paste de ranking + mapa interactivo. Snippets HTML con preview en vivo. Licencia CC BY 4.0.",
    link: `${BASE_URL}/embed`,
    pubDate: "2026-05-12T18:00:00Z",
    guid: `${BASE_URL}/embed#sprint-45c`,
  },
  {
    title: "Nuevo: comparador multi-municipio + OG dinámicas",
    description:
      "Compará 2 ó 3 municipios piloto lado a lado. URL state para compartir + Twitter card que refleja la selección.",
    link: `${BASE_URL}/comparador`,
    pubDate: "2026-05-12T15:00:00Z",
    guid: `${BASE_URL}/comparador#sprint-44a`,
  },
  {
    title: "Nuevo: command palette (⌘K / Ctrl+K)",
    description:
      "Búsqueda rápida a cualquier municipio, dimensión, página o métrica del mapa. 176 items indexados.",
    link: BASE_URL,
    pubDate: "2026-05-12T20:00:00Z",
    guid: `${BASE_URL}#cmdk-sprint-45a`,
  },
];

function buildRunItems(): FeedItem[] {
  let manifest;
  try {
    manifest = getGlobalRefreshManifest();
  } catch {
    return [];
  }

  return manifest.runs
    .filter((r) => r.status === "success")
    .map((run) => {
      const ageText = (() => {
        try {
          return getRefreshAge(manifest).humanAR;
        } catch {
          return "recientemente";
        }
      })();
      return {
        title: `Refresh de ${run.target} — ${run.municipiosConDatos} municipios`,
        description: `El cron mensual completó la ingesta de ${run.target} (${run.script}). ${run.municipiosConDatos} municipios con datos actualizados. Último refresh: ${ageText}.`,
        link: `${BASE_URL}/datos-abiertos#frescura`,
        pubDate: manifest.refreshedAt,
        guid: `${BASE_URL}/refresh/${run.target}#${manifest.refreshedAt}`,
      };
    });
}

export function GET() {
  const runItems = buildRunItems();
  const allItems = [...runItems, ...SITE_MILESTONES].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );

  const itemsXml = allItems
    .map(
      (it) => `    <item>
      <title>${escapeXml(it.title)}</title>
      <link>${escapeXml(it.link)}</link>
      <guid isPermaLink="false">${escapeXml(it.guid)}</guid>
      <pubDate>${rfc822(it.pubDate)}</pubDate>
      <description>${escapeXml(it.description)}</description>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Radar Municipal — Novedades</title>
    <link>${BASE_URL}</link>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Refresh del cron mensual + hitos del proyecto. Datos públicos de los 135 municipios de la Provincia de Buenos Aires.</description>
    <language>es-AR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Cache 1 hora — el cron es mensual, no necesita freshness aggressive
      "Cache-Control": "public, max-age=3600",
    },
  });
}
