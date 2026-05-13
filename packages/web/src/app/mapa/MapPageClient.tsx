"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  getAllMunicipiosForMap,
  getAllMunicipiosForVialDensity,
  getAllMunicipiosForPesosPorKm,
  type RankingEntry,
} from "@/lib/scoring-data";

// El JSON de partidos pesa ~2.7 MB; el SSR del componente con esa data
// degradaba la hidratación de toda la página. Cargamos `ProvinceMap`
// solo client-side con un placeholder mientras tanto.
const ProvinceMap = dynamic(
  () => import("@/components/ProvinceMap").then((m) => ({ default: m.ProvinceMap })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-border bg-card p-4">
        <div
          className="flex w-full items-center justify-center rounded-md bg-muted/30"
          style={{ height: 520 }}
          aria-busy="true"
          aria-label="Cargando mapa..."
        >
          <span className="text-sm text-muted-foreground">Cargando mapa…</span>
        </div>
      </div>
    ),
  },
);

// Sprint 42A — defaults + métricas movidos a `./constants` (pure module)
// para que el server-side (canonicalize) y los tests los importen sin
// arrastrar el árbol "use client". Re-export para back-compat.
import {
  DEFAULT_METRIC_A,
  DEFAULT_METRIC_B,
  VIAL_DENSITY_KEY,
  PESOS_POR_KM_KEY,
  METRIC_OPTIONS,
  VALID_METRIC_KEYS,
} from "./constants";

export {
  DEFAULT_METRIC_A,
  DEFAULT_METRIC_B,
  VALID_METRIC_KEYS,
};

type MetricKind = "score" | "vialDensity" | "pesosPorKm";

type MapEntry = {
  id: string;
  nombre: string;
  score: number | null;
  region: string;
  esPiloto: boolean;
};

/**
 * Resuelve la métrica seleccionada al par (entries, metricKind). Centralizado
 * para que ambos slots del split-screen Sprint 37 usen exactamente la misma
 * lógica de carga.
 */
function resolveMetric(
  metricKey: string,
  initialEntries: MapEntry[],
): { entries: MapEntry[]; metricKind: MetricKind } {
  if (metricKey === PESOS_POR_KM_KEY) {
    return { entries: getAllMunicipiosForPesosPorKm(), metricKind: "pesosPorKm" };
  }
  if (metricKey === VIAL_DENSITY_KEY) {
    return {
      entries: getAllMunicipiosForVialDensity(),
      metricKind: "vialDensity",
    };
  }
  if (metricKey === "scoreTotal") {
    return { entries: initialEntries, metricKind: "score" };
  }
  return {
    entries: getAllMunicipiosForMap(metricKey as keyof RankingEntry),
    metricKind: "score",
  };
}

function formatAvg(metricKind: MetricKind, avg: number): string {
  if (metricKind === "pesosPorKm") return `$${(avg / 1e6).toFixed(2)}M / km`;
  if (metricKind === "vialDensity") return `${avg.toFixed(2)} km/km²`;
  return avg.toFixed(1);
}

interface MapPageClientProps {
  initialEntries: MapEntry[];
}

export function MapPageClient({ initialEntries }: MapPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Lazy initializers: leen del URL una sola vez al mount. Después de eso
  // el state es source of truth y syncha al URL via useEffect.
  const [selectedMetric, setSelectedMetric] = useState<string>(() => {
    const a = searchParams.get("a");
    return a && VALID_METRIC_KEYS.has(a) ? a : DEFAULT_METRIC_A;
  });
  const [compareMode, setCompareMode] = useState<boolean>(
    () => searchParams.get("compare") === "1",
  );
  const [compareMetric, setCompareMetric] = useState<string>(() => {
    const b = searchParams.get("b");
    return b && VALID_METRIC_KEYS.has(b) ? b : DEFAULT_METRIC_B;
  });

  // Sync state → URL. router.replace evita pollución del history con
  // cada cambio de métrica (back button salta a la página anterior, no
  // a la métrica anterior). Sólo serializamos lo que difiere del default.
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedMetric !== DEFAULT_METRIC_A) params.set("a", selectedMetric);
    if (compareMode) {
      params.set("compare", "1");
      if (compareMetric !== DEFAULT_METRIC_B) params.set("b", compareMetric);
    }
    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [selectedMetric, compareMode, compareMetric, pathname, router]);

  const slotA = useMemo(
    () => resolveMetric(selectedMetric, initialEntries),
    [selectedMetric, initialEntries],
  );
  const slotB = useMemo(
    () => resolveMetric(compareMetric, initialEntries),
    [compareMetric, initialEntries],
  );

  // Stats — sólo para el modo single. En split el foco es la comparación.
  const withData = slotA.entries.filter((e) => e.score != null);
  const avgScore =
    withData.length > 0
      ? withData.reduce((sum, e) => sum + (e.score ?? 0), 0) / withData.length
      : 0;
  const avgLabel = formatAvg(slotA.metricKind, avgScore);

  return (
    <div className="space-y-6">
      {/* Compare toggle */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {compareMode
            ? "Comparando dos métricas — cada mapa tiene su propio selector, zoom y pan."
            : "Activá comparación para ver dos métricas lado a lado."}
        </p>
        <button
          type="button"
          onClick={() => setCompareMode((v) => !v)}
          aria-pressed={compareMode}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          {compareMode ? "✕ Cerrar comparación" : "⇆ Comparar 2 métricas"}
        </button>
      </div>

      {!compareMode && (
        <>
          {/* Stats bar (solo single mode) */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{slotA.entries.length}</p>
              <p className="text-xs text-muted-foreground">Municipios totales</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">{withData.length}</p>
              <p className="text-xs text-muted-foreground">Con datos</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{avgLabel}</p>
              <p className="text-xs text-muted-foreground">Promedio</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">
                {slotA.entries.length - withData.length}
              </p>
              <p className="text-xs text-muted-foreground">Sin datos</p>
            </div>
          </div>

          <ProvinceMap
            entries={slotA.entries}
            metrics={METRIC_OPTIONS}
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
            metricKind={slotA.metricKind}
          />
        </>
      )}

      {compareMode && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ProvinceMap
            entries={slotA.entries}
            metrics={METRIC_OPTIONS}
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
            metricKind={slotA.metricKind}
            mapHeight={360}
          />
          <ProvinceMap
            entries={slotB.entries}
            metrics={METRIC_OPTIONS}
            selectedMetric={compareMetric}
            onMetricChange={setCompareMetric}
            metricKind={slotB.metricKind}
            mapHeight={360}
          />
        </div>
      )}
    </div>
  );
}
