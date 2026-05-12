"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
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

// Sprint 34/35 — opciones que NO son scores normalizados 0-100, sino
// indicadores en su unidad natural. Se tratan como kinds aparte para que
// ProvinceMap elija paleta + tooltip + leyenda apropiados.
const VIAL_DENSITY_KEY = "vialDensity";
const PESOS_POR_KM_KEY = "pesosPorKm";

type MetricKind = "score" | "vialDensity" | "pesosPorKm";

type MetricOption = { key: string; label: string };

const METRIC_OPTIONS: MetricOption[] = [
  { key: "scoreTotal", label: "Score total" },
  { key: "scoreTransparencia", label: "Transparencia" },
  { key: "scoreFiscal", label: "Fiscal" },
  { key: "scoreNormativa", label: "Normativa" },
  { key: "scoreParticipacion", label: "Participación" },
  { key: "scoreGastoFuncion", label: "Gasto por función" },
  { key: "scoreEconomiaLocal", label: "Economía local" },
  { key: "scorePresionImpositiva", label: "Presión impositiva" },
  { key: "scoreServiciosBasicos", label: "Servicios básicos" },
  { key: "scoreEducacionSalud", label: "Educación y salud" },
  { key: "scoreConectividad", label: "Conectividad" },
  { key: "scoreEspacioPublico", label: "Espacio público" },
  { key: "scoreSeguridadVial", label: "Seguridad vial" },
  { key: VIAL_DENSITY_KEY, label: "Densidad vial rural (km/km²)" },
  { key: PESOS_POR_KM_KEY, label: "Pesos por km de red vial ($/km)" },
];

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
  const [selectedMetric, setSelectedMetric] = useState<string>("scoreTotal");
  const [compareMode, setCompareMode] = useState<boolean>(false);
  // Default secundario sugerente: scoreFiscal junto al scoreTotal abre la
  // pregunta natural "¿qué partidos suben el total a pesar de fiscal flojo?".
  const [compareMetric, setCompareMetric] = useState<string>("scoreFiscal");

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
