/**
 * Sprint 45A — Index para el global command palette (⌘K).
 *
 * Items indexados:
 *   - 135 municipios → /municipios/[id]
 *   - 12 dimensiones activas → /dimensiones/<slug>
 *   - 14 páginas top (las del nav primary + secondary + algunas deep)
 *   - 15 métricas del mapa → /mapa?a=<key>
 *
 * Pure module — no React, importable desde server o client. Permite:
 *   - Tests unitarios del filter sin levantar React
 *   - Build at module load (cero costo runtime al abrir el palette)
 */
import {
  MUNICIPIOS,
  ACTIVE_DIMENSIONS,
  SCORING_DIMENSION_LABELS,
  type ScoringDimension,
} from "@radar-municipal/core";

export type CommandItemKind =
  | "municipio"
  | "dimension"
  | "page"
  | "metric";

export interface CommandItem {
  kind: CommandItemKind;
  /** Texto principal (lo que se ve). */
  label: string;
  /** Texto secundario / contexto (e.g. región, descripción). */
  subtitle: string;
  /** URL destino. */
  href: string;
  /** Texto adicional para search (keywords, sinónimos, etc.). */
  keywords?: string;
}

// ─── Páginas top: trips a sitios específicos ─────────────────────────────

const PAGE_ITEMS: CommandItem[] = [
  { kind: "page", label: "Inicio", subtitle: "Home + stats", href: "/" },
  { kind: "page", label: "Ranking", subtitle: "Tabla de los 13 piloto", href: "/ranking" },
  { kind: "page", label: "Mapa", subtitle: "Vista geográfica + comparador", href: "/mapa" },
  { kind: "page", label: "Comparador", subtitle: "Compará 2-3 municipios", href: "/comparador" },
  { kind: "page", label: "Panorama", subtitle: "Vista agregada provincial", href: "/panorama" },
  { kind: "page", label: "Municipios", subtitle: "Los 135 partidos", href: "/municipios" },
  { kind: "page", label: "Dimensiones", subtitle: "12 dimensiones de scoring", href: "/dimensiones" },
  { kind: "page", label: "Datos abiertos", subtitle: "Descargas CSV/JSON + API", href: "/datos-abiertos" },
  { kind: "page", label: "Metodología", subtitle: "Cómo se calculan los scores", href: "/metodologia" },
  { kind: "page", label: "Acerca de", subtitle: "Sobre el proyecto", href: "/acerca-de" },
  { kind: "page", label: "Calidad de datos", subtitle: "Cobertura por dimensión", href: "/calidad-datos" },
  { kind: "page", label: "Presión impositiva", subtitle: "Casos testigo ABL/TSG/TISH", href: "/presion-impositiva" },
  { kind: "page", label: "Compras", subtitle: "Licitaciones y HHI", href: "/compras" },
  {
    kind: "page",
    label: "Red vial",
    subtitle: "Pilar 5 — pesos por km",
    href: "/dimensiones/red-vial",
    keywords: "vial caminos pesos km cross",
  },
  {
    kind: "page",
    label: "Normativa",
    subtitle: "SIBOM, ordenanzas, compras",
    href: "/dimensiones/normativa",
    keywords: "sibom boletin ordenanza fiscal",
  },
];

// ─── Dimensiones (slug genérico) ──────────────────────────────────────────

const DIMENSION_SLUGS: Record<ScoringDimension, string> = {
  TRANSPARENCIA: "transparencia",
  FISCAL: "fiscal",
  NORMATIVA: "normativa",
  PARTICIPACION_CIUDADANA: "participacion-ciudadana",
  GASTO_POR_FUNCION: "gasto-por-funcion",
  ECONOMIA_LOCAL: "economia-local",
  PRESION_IMPOSITIVA: "presion-impositiva",
  SERVICIOS_BASICOS: "servicios-basicos",
  EDUCACION_SALUD: "educacion-salud",
  CONECTIVIDAD_DIGITAL: "conectividad-digital",
  ESPACIO_PUBLICO: "espacio-publico",
  SEGURIDAD_VIAL: "seguridad-vial",
  COMPRAS: "compras",
  CALIDAD_DATOS: "calidad-datos",
} as Record<ScoringDimension, string>;

const DIMENSION_ITEMS: CommandItem[] = ACTIVE_DIMENSIONS.map((d) => ({
  kind: "dimension" as const,
  label: SCORING_DIMENSION_LABELS[d],
  subtitle: "Ranking dimensional",
  href: `/dimensiones/${DIMENSION_SLUGS[d]}`,
}));

// ─── Métricas del mapa ────────────────────────────────────────────────────

const MAP_METRICS: { key: string; label: string; subtitle: string }[] = [
  { key: "scoreTotal", label: "Mapa — Score total", subtitle: "Score divergente rojo→verde" },
  { key: "scoreTransparencia", label: "Mapa — Transparencia", subtitle: "Score por dimensión" },
  { key: "scoreFiscal", label: "Mapa — Fiscal", subtitle: "Score por dimensión" },
  { key: "scoreNormativa", label: "Mapa — Normativa", subtitle: "Score por dimensión" },
  { key: "scoreParticipacion", label: "Mapa — Participación", subtitle: "Score por dimensión" },
  { key: "scoreGastoFuncion", label: "Mapa — Gasto por función", subtitle: "Score por dimensión" },
  { key: "scoreEconomiaLocal", label: "Mapa — Economía local", subtitle: "Score por dimensión" },
  { key: "scorePresionImpositiva", label: "Mapa — Presión impositiva", subtitle: "Score por dimensión" },
  { key: "scoreServiciosBasicos", label: "Mapa — Servicios básicos", subtitle: "Score por dimensión" },
  { key: "scoreEducacionSalud", label: "Mapa — Educación y salud", subtitle: "Score por dimensión" },
  { key: "scoreConectividad", label: "Mapa — Conectividad", subtitle: "Score por dimensión" },
  { key: "scoreEspacioPublico", label: "Mapa — Espacio público", subtitle: "Score por dimensión" },
  { key: "scoreSeguridadVial", label: "Mapa — Seguridad vial", subtitle: "Score por dimensión" },
  { key: "vialDensity", label: "Mapa — Densidad vial rural (km/km²)", subtitle: "Heatmap YlOrBr" },
  { key: "pesosPorKm", label: "Mapa — Pesos por km de red vial", subtitle: "Heatmap PuRd" },
];

const METRIC_ITEMS: CommandItem[] = MAP_METRICS.map((m) => ({
  kind: "metric" as const,
  label: m.label,
  subtitle: m.subtitle,
  href: m.key === "scoreTotal" ? "/mapa" : `/mapa?a=${m.key}`,
}));

// ─── Municipios ───────────────────────────────────────────────────────────

const MUNICIPIO_ITEMS: CommandItem[] = MUNICIPIOS.map((m) => ({
  kind: "municipio" as const,
  label: m.nombre,
  subtitle: m.partido !== m.nombre
    ? `Partido de ${m.partido} · ${m.region.replace(/_/g, " ")}`
    : m.region.replace(/_/g, " "),
  href: `/municipios/${m.id}`,
  keywords: m.esPiloto ? "piloto" : undefined,
}));

// ─── Index completo ───────────────────────────────────────────────────────

export const COMMAND_INDEX: CommandItem[] = [
  ...PAGE_ITEMS,
  ...DIMENSION_ITEMS,
  ...METRIC_ITEMS,
  ...MUNICIPIO_ITEMS,
];

// ─── Fuzzy filter ─────────────────────────────────────────────────────────

/**
 * Normaliza para search: lowercase + sin acentos. Permite que "Bahia" matchee
 * "Bahía Blanca", "presion impositiva" matchee "Presión impositiva", etc.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Filtro simple sustring + score por prefix. No usa lib externa
 * (fuse.js, fuzzysort) para evitar dep nueva. Para 170 items es
 * más que suficiente.
 *
 * Score:
 *   3 — label empieza con query (prefix match)
 *   2 — label contiene query (substring)
 *   1 — keywords/subtitle contiene query
 *   0 — no match (descartado)
 */
export function searchCommandIndex(
  query: string,
  index: CommandItem[] = COMMAND_INDEX,
  limit = 30,
): CommandItem[] {
  const q = normalize(query.trim());
  if (!q) return index.slice(0, limit);

  const scored = index
    .map((item) => {
      const label = normalize(item.label);
      const sub = normalize(item.subtitle);
      const kw = item.keywords ? normalize(item.keywords) : "";

      let score = 0;
      if (label.startsWith(q)) score = 3;
      else if (label.includes(q)) score = 2;
      else if (sub.includes(q) || kw.includes(q)) score = 1;
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.item);
}
