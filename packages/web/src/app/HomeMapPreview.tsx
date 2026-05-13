"use client";

import dynamic from "next/dynamic";

/**
 * Sprint 41A — Home as showcase + Sprint 47F mejor aspect ratio.
 *
 * Wrapper client-island para meter `ProvinceMap` en la home (server
 * component). Usa `dynamic({ ssr: false })` porque `ProvinceMap` importa
 * `partidos.topo.json` y necesita DOM para el zoom/pan.
 *
 * Decisión Sprint 47F: no más `compact={true}` (que limitaba a 240px y
 * dejaba dead-space). En su lugar:
 *   - `mapHeight={320}`: balance entre prominencia y compacto. El SVG
 *     aspect 800/520=1.54 se aprovecha mejor sin desbordar verticalmente.
 *   - `hideLegend + hideAttribution`: el caller (la home) los renderea
 *     afuera del card del ProvinceMap, recuperando ~50px verticales para
 *     el SVG y eliminando el "double-card" feel que tenía el layout.
 */
const ProvinceMap = dynamic(
  () =>
    import("@/components/ProvinceMap").then((m) => ({ default: m.ProvinceMap })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex w-full items-center justify-center rounded-md bg-muted/30"
        style={{ height: 320 }}
        aria-busy="true"
        aria-label="Cargando mapa..."
      >
        <span className="text-sm text-muted-foreground">Cargando mapa…</span>
      </div>
    ),
  },
);

interface HomeMapPreviewProps {
  entries: {
    id: string;
    nombre: string;
    score: number | null;
    region: string;
    esPiloto: boolean;
  }[];
}

/**
 * Paleta de score (debe coincidir con `SCORE_LEGEND` en ProvinceMap).
 * Inline acá porque el callsite quiere render local sin importar nada
 * de ProvinceMap (que es dynamic lazy).
 */
const HOME_LEGEND = [
  { color: "#ef4444", label: "<25" },
  { color: "#f97316", label: "25-40" },
  { color: "#f59e0b", label: "40-50" },
  { color: "#84cc16", label: "50-70" },
  { color: "#22c55e", label: "70+" },
  { color: "#e2e8f0", label: "Sin datos" },
];

export function HomeMapPreview({ entries }: HomeMapPreviewProps) {
  return (
    <>
      <ProvinceMap
        entries={entries}
        mapHeight={320}
        hideLegend
        hideAttribution
      />

      {/* Legend + atribución afuera del card, una sola línea responsive */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span className="font-medium">Score:</span>
        {HOME_LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            {item.label}
          </span>
        ))}
        <span className="ml-auto text-[11px]">
          Geometría:{" "}
          <a
            href="https://catalogo.datos.gba.gob.ar/dataset/partidos"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Datos Abiertos PBA / ARBA
          </a>{" "}
          · CC-BY 4.0
        </span>
      </div>
    </>
  );
}
