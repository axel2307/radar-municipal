"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  getAllMunicipiosForMap,
  getAllMunicipiosForVialDensity,
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

// Sprint 34 — la opción "vialDensity" no es un score normalizado 0-100,
// sino km/km² (~0.2-2.0). Se trata como un kind aparte para que ProvinceMap
// elija paleta + tooltip + leyenda apropiados.
const VIAL_DENSITY_KEY = "vialDensity";

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
];

interface MapPageClientProps {
  initialEntries: {
    id: string;
    nombre: string;
    score: number | null;
    region: string;
    esPiloto: boolean;
  }[];
}

export function MapPageClient({ initialEntries }: MapPageClientProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>("scoreTotal");

  const isVialDensity = selectedMetric === VIAL_DENSITY_KEY;

  const entries = useMemo(() => {
    if (isVialDensity) return getAllMunicipiosForVialDensity();
    if (selectedMetric === "scoreTotal") return initialEntries;
    return getAllMunicipiosForMap(selectedMetric as keyof RankingEntry);
  }, [selectedMetric, initialEntries, isVialDensity]);

  // Stats
  const withData = entries.filter((e) => e.score != null);
  const avgScore = withData.length > 0
    ? withData.reduce((sum, e) => sum + (e.score ?? 0), 0) / withData.length
    : 0;
  const avgLabel = isVialDensity
    ? avgScore.toFixed(2) + " km/km²"
    : avgScore.toFixed(1);

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{entries.length}</p>
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
          <p className="text-2xl font-bold text-muted-foreground">{entries.length - withData.length}</p>
          <p className="text-xs text-muted-foreground">Sin datos</p>
        </div>
      </div>

      <ProvinceMap
        entries={entries}
        metrics={METRIC_OPTIONS}
        selectedMetric={selectedMetric}
        onMetricChange={setSelectedMetric}
        metricKind={isVialDensity ? "vialDensity" : "score"}
      />
    </div>
  );
}
