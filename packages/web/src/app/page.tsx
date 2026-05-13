import Link from "next/link";
import {
  MUNICIPIOS,
  SCORING_CATEGORIES,
  ScoringCategory,
  ScoringDimension,
  SCORING_DIMENSION_LABELS,
  ACTIVE_DIMENSIONS,
} from "@radar-municipal/core";
import {
  getRanking,
  getAllMunicipiosForMap,
  getGlobalRefreshManifest,
  getRefreshAge,
  getRefreshHealth,
  getVialCrossCoverage,
  getVialCrossMetrics,
} from "@/lib/scoring-data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { HomeMapPreview } from "./HomeMapPreview";
import { API_BASE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";
import { CATEGORY_BADGE } from "@/lib/colors";

// ─── Sprint 41A — Categorías reusables (alineadas con /dimensiones) ──────
// Sprint 41D — colores movidos a `@/lib/colors` (source of truth única).

const CATEGORY_ORDER: ScoringCategory[] = [
  ScoringCategory.GOBIERNO_ABIERTO,
  ScoringCategory.ECONOMIA_FINANZAS,
  ScoringCategory.CALIDAD_DE_VIDA,
  ScoringCategory.INFRAESTRUCTURA_MOVILIDAD,
];

/**
 * Sprint 46 — slugs por dimensión para linkear granular. Sincronizado con
 * /dimensiones/[slug]/page.tsx. Las dimensiones con deep dive dedicado
 * (red vial, normativa) se marcan con `hasDeepDive` para mostrar ★.
 */
const DIMENSION_SLUG: Record<ScoringDimension, string> = {
  [ScoringDimension.TRANSPARENCIA]: "transparencia",
  [ScoringDimension.FISCAL]: "fiscal",
  [ScoringDimension.NORMATIVA]: "normativa",
  [ScoringDimension.PARTICIPACION_CIUDADANA]: "participacion-ciudadana",
  [ScoringDimension.GASTO_POR_FUNCION]: "gasto-por-funcion",
  [ScoringDimension.ECONOMIA_LOCAL]: "economia-local",
  [ScoringDimension.PRESION_IMPOSITIVA]: "presion-impositiva",
  [ScoringDimension.SERVICIOS_BASICOS]: "servicios-basicos",
  [ScoringDimension.EDUCACION_SALUD]: "educacion-salud",
  [ScoringDimension.CONECTIVIDAD_DIGITAL]: "conectividad-digital",
  [ScoringDimension.ESPACIO_PUBLICO]: "espacio-publico",
  [ScoringDimension.SEGURIDAD_VIAL]: "seguridad-vial",
  [ScoringDimension.COMPRAS]: "compras",
  [ScoringDimension.CALIDAD_DATOS]: "calidad-datos",
};

const DIMENSIONS_WITH_DEEP_DIVE = new Set<ScoringDimension>([
  ScoringDimension.NORMATIVA,
]);

/** Slugs custom: Pilar 5 (red-vial) vive fuera del enum estándar. */
const EXTRA_DEEP_DIVE_AFTER_CATEGORY: Partial<
  Record<ScoringCategory, { slug: string; label: string }[]>
> = {
  [ScoringCategory.INFRAESTRUCTURA_MOVILIDAD]: [
    { slug: "red-vial", label: "Red vial (cross fiscal × OSM)" },
  ],
};

const HEALTH_DOT: Record<"healthy" | "degraded" | "stale", string> = {
  healthy: "bg-green-500",
  degraded: "bg-amber-500",
  stale: "bg-red-500",
};

export default function HomePage() {
  // ─── Data fetching (server-side) ────────────────────────────────────────
  const totalMunicipios = MUNICIPIOS.length;
  const pilotoCount = MUNICIPIOS.filter((m) => m.esPiloto).length;
  const dimensionCount = ACTIVE_DIMENSIONS.length;

  const ranking = getRanking();
  const top3 = ranking.slice(0, 3);
  const bottom3 = ranking.slice(-3).reverse();

  const mapEntries = getAllMunicipiosForMap("scoreTotal");

  // Freshness — el try/catch evita romper la home si el manifest no existe
  // todavía (build sin cron previo). Mismo patrón que el Footer.
  let manifest = null as ReturnType<typeof getGlobalRefreshManifest> | null;
  let freshness:
    | { humanAR: string; health: "healthy" | "degraded" | "stale"; cubiertos: number }
    | null = null;
  try {
    manifest = getGlobalRefreshManifest();
    const { humanAR } = getRefreshAge(manifest);
    const health = getRefreshHealth(manifest);
    freshness = {
      humanAR,
      health,
      cubiertos: manifest.totalMunicipiosCubiertos,
    };
  } catch {
    // Manifest faltante — la home no rompe.
  }

  // Vial cross outliers — el "killer insight" del Pilar 5.
  const crossCov = getVialCrossCoverage();
  const crossRows = crossCov.ids
    .map((id) => {
      const m = getVialCrossMetrics(id);
      const muni = MUNICIPIOS.find((x) => x.id === id);
      if (!m || !muni) return null;
      return { id, nombre: muni.nombre, pesosPorKm: m.pesosPorKm };
    })
    .filter(
      (x): x is { id: string; nombre: string; pesosPorKm: number } =>
        x !== null,
    )
    .sort((a, b) => b.pesosPorKm - a.pesosPorKm);
  const crossMax = crossRows[0];
  const crossMin = crossRows[crossRows.length - 1];
  const crossRatio =
    crossMax && crossMin && crossMin.pesosPorKm > 0
      ? Math.round(crossMax.pesosPorKm / crossMin.pesosPorKm)
      : null;

  return (
    <div>
      {/* ─── Hero con stats ─────────────────────────────────────────────── */}
      <section className="bg-primary text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Radar Municipal
            </h1>
            <p className="mt-4 text-xl text-white/80">
              El estándar de comparación municipal que Argentina necesita.
              Datos públicos de los 135 municipios de la Provincia de Buenos
              Aires, comparables, rankeables y auditables.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/ranking"
                className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-primary shadow-sm hover:bg-white/90 transition-colors"
              >
                Ver ranking
              </Link>
              <Link
                href="/mapa"
                className="rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Explorar mapa
              </Link>
              <Link
                href="/metodologia"
                className="rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Metodología
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-3xl font-bold tabular-nums">
                {totalMunicipios}
              </p>
              <p className="mt-1 text-sm text-white/70">
                Municipios bonaerenses
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-3xl font-bold tabular-nums">{pilotoCount}</p>
              <p className="mt-1 text-sm text-white/70">
                Piloto con scoring completo
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-3xl font-bold tabular-nums">
                {freshness?.cubiertos ?? "—"}
              </p>
              <p className="mt-1 text-sm text-white/70">
                Cubiertos automáticamente
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-3xl font-bold tabular-nums">
                {dimensionCount}
              </p>
              <p className="mt-1 text-sm text-white/70">
                Dimensiones de análisis
              </p>
            </div>
          </div>

          {/* Freshness mini-line */}
          {freshness && (
            <Link
              href="/datos-abiertos#frescura"
              className="mt-6 inline-flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors"
              title="Ver detalle del último refresh"
            >
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  HEALTH_DOT[freshness.health],
                )}
                aria-hidden
              />
              Datos actualizados {freshness.humanAR}
            </Link>
          )}
        </div>
      </section>

      {/* ─── Mapa preview + Top/Bottom 3 ────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Mapa */}
          <div className="lg:col-span-3">
            <h2 className="text-2xl font-bold">Vista geográfica</h2>
            <p className="mt-2 mb-4 text-muted-foreground">
              Click en cualquier partido para abrir su ficha completa.
            </p>
            <div className="rounded-lg border border-border bg-card p-3">
              <HomeMapPreview entries={mapEntries} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Coloreado por score total · 13 piloto con datos completos · 122
              sin datos (gris).{" "}
              <Link
                href="/mapa"
                className="text-primary hover:underline font-medium"
              >
                Abrir mapa interactivo →
              </Link>
            </p>
          </div>

          {/* Top / Bottom 3 */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold text-score-high mb-3 uppercase tracking-wide">
                Mejores 3
              </h3>
              <div className="flex flex-col gap-2">
                {top3.map((entry) => (
                  <Link
                    key={entry.municipio.id}
                    href={`/municipios/${entry.municipio.id}`}
                    className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50/50 px-4 py-3 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-score-high tabular-nums w-6">
                        #{entry.posicion}
                      </span>
                      <span className="font-medium">
                        {entry.municipio.nombre}
                      </span>
                    </div>
                    <ScoreBadge score={entry.scoreTotal} size="sm" />
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-score-low mb-3 uppercase tracking-wide">
                Últimos 3
              </h3>
              <div className="flex flex-col gap-2">
                {bottom3.map((entry) => (
                  <Link
                    key={entry.municipio.id}
                    href={`/municipios/${entry.municipio.id}`}
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 hover:bg-red-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-score-low tabular-nums w-6">
                        #{entry.posicion}
                      </span>
                      <span className="font-medium">
                        {entry.municipio.nombre}
                      </span>
                    </div>
                    <ScoreBadge score={entry.scoreTotal} size="sm" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Killer insight: vial cross ────────────────────────────────── */}
      {crossMax && crossMin && crossRatio && (
        <section className="bg-gradient-to-br from-violet-50 to-pink-50 border-y border-violet-100">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 mb-2">
                  Descubrí · Pilar 5
                </p>
                <h2 className="text-2xl font-bold">
                  ¿Cuánto gasta tu municipio por km de red rural?
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Cruce de RAFAM (gasto en servicios económicos) con red vial
                  OSM en {crossCov.withCross} partidos del piloto. Variance
                  observada: <strong>{crossRatio}×</strong> entre el mayor y el
                  menor.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/dimensiones/red-vial"
                    className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
                  >
                    Ver ranking →
                  </Link>
                  <Link
                    href="/mapa?a=pesosPorKm"
                    className="inline-flex items-center gap-1.5 rounded-md border border-violet-300 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-colors"
                  >
                    Heatmap interactivo →
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 min-w-[280px]">
                <div className="rounded-lg border-2 border-violet-300 bg-white p-4">
                  <p className="text-xs text-muted-foreground">Mayor</p>
                  <p className="text-lg font-bold">{crossMax.nombre}</p>
                  <p className="text-2xl font-bold text-violet-700 tabular-nums">
                    ${(crossMax.pesosPorKm / 1e6).toFixed(2)}M
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / km
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border border-violet-200 bg-white p-4">
                  <p className="text-xs text-muted-foreground">Menor</p>
                  <p className="text-lg font-bold">{crossMin.nombre}</p>
                  <p className="text-2xl font-bold text-pink-700 tabular-nums">
                    ${(crossMin.pesosPorKm / 1e6).toFixed(2)}M
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / km
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── ¿Qué buscás? — wayfinding task-oriented (Sprint 46) ────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-2">¿Qué buscás?</h2>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          Elegí tu camino según el tipo de información que necesitás.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Row 1 — audience general */}
          <Link
            href="/municipios"
            className="group rounded-lg border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                />
              </svg>
            </div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              Tu municipio
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Explorá los 135 partidos. Buscá por nombre o filtrá por región.
            </p>
          </Link>

          <Link
            href="/comparador"
            className="group rounded-lg border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                />
              </svg>
            </div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              Comparar 2-3 municipios
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Lado a lado en las 12 dimensiones + radar visual.
            </p>
          </Link>

          <Link
            href="/panorama"
            className="group rounded-lg border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              Mirada provincial
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Distribución, top/bottom, outliers del Pilar 3 y 5, coverage.
            </p>
          </Link>

          {/* Row 2 — audiences específicas */}
          <Link
            href="/presion-impositiva"
            className="group rounded-lg border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4M9 6v12M3 12a9 9 0 1018 0 9 9 0 00-18 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              ¿Cuánto pago de impuestos?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              ABL, TSG, TISH, vial rural y derechos de construcción con casos
              testigo comparables.
            </p>
          </Link>

          <Link
            href="/compras"
            className="group rounded-lg border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                />
              </svg>
            </div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              Licitaciones públicas
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Compras, adjudicaciones, HHI de concentración por municipio.
            </p>
          </Link>

          <Link
            href="/embed"
            className="group rounded-lg border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                />
              </svg>
            </div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              Para tu blog o medio
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Widgets iframe-eables + CSV/JSON descargables + API REST.
            </p>
          </Link>
        </div>

        {/* Tip card ⌘K */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <svg
            className="h-4 w-4 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
            />
          </svg>
          <span>
            Atajo:{" "}
            <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono">
              ⌘K
            </kbd>{" "}
            (o{" "}
            <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono">
              Ctrl+K
            </kbd>
            ) abre búsqueda rápida a cualquier municipio o página
          </span>
        </div>
      </section>

      {/* ─── Dimensiones: 4 categorías × 12 dimensiones ─────────────────── */}
      <section className="bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h2 className="text-2xl font-bold">Dimensiones de análisis</h2>
            <Link
              href="/dimensiones"
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            12 dimensiones agrupadas en 4 categorías ponderadas. Cada una con
            ranking propio y metodología trazable.
          </p>

          {/* Sprint 46 — Header de categoría NO clickable. Cada dimensión
              individual linkea a /dimensiones/<slug>. Las que tienen deep
              dive dedicado llevan ★. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_ORDER.map((cat) => {
              const cfg = SCORING_CATEGORIES[cat];
              const badge = CATEGORY_BADGE[cat];
              const extras = EXTRA_DEEP_DIVE_AFTER_CATEGORY[cat] ?? [];
              return (
                <div
                  key={cat}
                  className={cn(
                    "rounded-lg border-2 bg-card p-5",
                    badge.border,
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                        badge.bg,
                        badge.text,
                      )}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {Math.round(cfg.peso * 100)}%
                    </span>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {cfg.dimensions.map(({ dimension }) => {
                      const slug = DIMENSION_SLUG[dimension];
                      const hasDeepDive = DIMENSIONS_WITH_DEEP_DIVE.has(dimension);
                      return (
                        <li key={dimension}>
                          <Link
                            href={`/dimensiones/${slug}`}
                            className="group flex items-start gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <span className="text-primary/40 group-hover:text-primary mt-0.5">
                              ›
                            </span>
                            <span>
                              {SCORING_DIMENSION_LABELS[dimension]}
                              {hasDeepDive && (
                                <span
                                  className="ml-1.5 text-amber-600"
                                  title="Vista profunda dedicada"
                                  aria-label="Vista profunda dedicada"
                                >
                                  ★
                                </span>
                              )}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                    {extras.map((extra) => (
                      <li key={extra.slug}>
                        <Link
                          href={`/dimensiones/${extra.slug}`}
                          className="group flex items-start gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <span className="text-primary/40 group-hover:text-primary mt-0.5">
                            ›
                          </span>
                          <span>
                            {extra.label}
                            <span
                              className="ml-1.5 text-amber-600"
                              title="Vista profunda dedicada"
                              aria-label="Vista profunda dedicada"
                            >
                              ★
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            <span className="text-amber-600">★</span> = dimensión con vista
            profunda dedicada (no solo ranking, también KPIs concretos).
          </p>
        </div>
      </section>

      {/* ─── Para periodistas y devs (densificado, Sprint 46) ───────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 to-primary/10 p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h2 className="text-2xl font-bold">
              Para periodistas y desarrolladores
            </h2>
            <span className="text-xs text-muted-foreground">
              Licencia CC BY 4.0
            </span>
          </div>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            Toda la información es libre y reutilizable. Citá Radar Municipal
            como fuente.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/datos-abiertos"
              className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  Datos CSV/JSON
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Descargas directas + frescura del cron mensual
                </p>
              </div>
            </Link>
            <Link
              href="/embed"
              className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  Embed widgets
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Iframes con preview en vivo y snippet copy-paste
                </p>
              </div>
            </Link>
            <a
              href={`${API_BASE_URL}/api/docs/explorer`}
              className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  API REST
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Documentación OpenAPI 3.0 + explorador interactivo
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ─── Otras páginas (Sprint 46, discreto) ─────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <p className="text-center text-xs text-muted-foreground">
          También podés explorar:{" "}
          <Link
            href="/calidad-datos"
            className="hover:text-primary hover:underline"
          >
            Calidad de datos
          </Link>{" "}
          ·{" "}
          <Link
            href="/metodologia"
            className="hover:text-primary hover:underline"
          >
            Metodología completa
          </Link>{" "}
          ·{" "}
          <Link href="/acerca-de" className="hover:text-primary hover:underline">
            Acerca del proyecto
          </Link>
        </p>
      </section>
    </div>
  );
}
