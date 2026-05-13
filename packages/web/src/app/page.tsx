import Link from "next/link";
import {
  MUNICIPIOS,
  SCORING_CATEGORIES,
  ScoringCategory,
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

      {/* ─── Cómo funciona ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-8">Cómo funciona</h2>
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
              1
            </div>
            <h3 className="text-lg font-semibold">Agrega</h3>
            <p className="mt-2 text-muted-foreground">
              Recopila información pública dispersa de portales municipales,
              SIBOM, datos abiertos y fuentes oficiales de la Provincia.
            </p>
          </div>
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
              2
            </div>
            <h3 className="text-lg font-semibold">Normaliza y compara</h3>
            <p className="mt-2 text-muted-foreground">
              Transforma datos heterogéneos en indicadores homogéneos: per
              cápita, por km², con trazabilidad completa.
            </p>
          </div>
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
              3
            </div>
            <h3 className="text-lg font-semibold">Rankea y alerta</h3>
            <p className="mt-2 text-muted-foreground">
              Rankings por dimensión, comparador entre municipios y heatmap
              geográfico. Refresh automático mensual vía GitHub Actions.
            </p>
          </div>
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_ORDER.map((cat) => {
              const cfg = SCORING_CATEGORIES[cat];
              const badge = CATEGORY_BADGE[cat];
              return (
                <Link
                  key={cat}
                  href="/dimensiones"
                  className={cn(
                    "rounded-lg border-2 bg-card p-5 hover:shadow-sm transition-all",
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
                    {cfg.dimensions.map(({ dimension }) => (
                      <li
                        key={dimension}
                        className="text-muted-foreground flex items-start gap-1.5"
                      >
                        <span className="text-primary/40 mt-0.5">•</span>
                        <span>{SCORING_DIMENSION_LABELS[dimension]}</span>
                      </li>
                    ))}
                  </ul>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Datos abiertos / API ───────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold">Datos abiertos</h2>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Toda la información de Radar Municipal es libre y reutilizable bajo
          licencia CC BY 4.0. Descargá los datos o usá nuestra API.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href={`${API_BASE_URL}/api/export/ranking.csv`}
            className="rounded-lg border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold">Ranking CSV</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranking completo con scores en formato CSV.
            </p>
          </a>
          <a
            href={`${API_BASE_URL}/api/export/ranking.json`}
            className="rounded-lg border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold">Ranking JSON</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranking con metadatos para integración.
            </p>
          </a>
          <a
            href={`${API_BASE_URL}/api/export/municipios.csv`}
            className="rounded-lg border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold">Municipios CSV</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Los 135 municipios con datos base.
            </p>
          </a>
          <a
            href={`${API_BASE_URL}/api/docs/explorer`}
            className="rounded-lg border border-primary/20 bg-primary/5 p-5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold text-primary">API Pública</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Documentación interactiva con spec OpenAPI.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
