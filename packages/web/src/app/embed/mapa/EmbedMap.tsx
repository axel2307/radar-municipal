"use client";

import dynamic from "next/dynamic";

/**
 * Sprint 45C — Wrapper client de ProvinceMap para el embed.
 *
 * Mismo patrón que HomeMapPreview pero con `mapHeight=420` (un poco
 * más bajo que el default 520 para dejar espacio al header del embed +
 * footer del layout en un iframe de 500px). Click en partido navega
 * dentro de la ventana padre del iframe (Next router lo respeta).
 */
const ProvinceMap = dynamic(
  () =>
    import("@/components/ProvinceMap").then((m) => ({
      default: m.ProvinceMap,
    })),
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

interface EmbedMapProps {
  entries: {
    id: string;
    nombre: string;
    score: number | null;
    region: string;
    esPiloto: boolean;
  }[];
}

export function EmbedMap({ entries }: EmbedMapProps) {
  return <ProvinceMap entries={entries} mapHeight={420} />;
}
