"use client";

import dynamic from "next/dynamic";

/**
 * Sprint 41C — Heatmap embebido en `/dimensiones/red-vial`.
 *
 * Wrapper client-island del ProvinceMap configurado a `metricKind="pesosPorKm"`
 * sin dropdown (solo lectura). Mismo patrón que HomeMapPreview pero con
 * altura completa y la métrica fija. Click en partido sigue navegando a la
 * ficha (handler del propio ProvinceMap).
 */
const ProvinceMap = dynamic(
  () =>
    import("@/components/ProvinceMap").then((m) => ({ default: m.ProvinceMap })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex w-full items-center justify-center rounded-md bg-muted/30"
        style={{ height: 420 }}
        aria-busy="true"
        aria-label="Cargando mapa..."
      >
        <span className="text-sm text-muted-foreground">Cargando mapa…</span>
      </div>
    ),
  },
);

interface PesosPorKmHeatmapProps {
  entries: {
    id: string;
    nombre: string;
    score: number | null;
    region: string;
    esPiloto: boolean;
  }[];
}

export function PesosPorKmHeatmap({ entries }: PesosPorKmHeatmapProps) {
  return (
    <ProvinceMap entries={entries} metricKind="pesosPorKm" mapHeight={420} />
  );
}
