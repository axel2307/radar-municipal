"use client";

import dynamic from "next/dynamic";

/**
 * Sprint 41A — Home as showcase.
 *
 * Wrapper client-island para meter `ProvinceMap` en la home (server component).
 * `ProvinceMap` es "use client" + importa `partidos.json` (~2.7 MB), así que
 * lo cargamos solo client-side con `ssr: false`. Mismo patrón que MapPageClient.
 *
 * En home queremos un mapa pequeño (compact=true → height 240px) que invite a
 * profundizar — sin dropdown de métricas, sin zoom controls. Click en partido
 * navega a su ficha (handler en el propio ProvinceMap).
 */
const ProvinceMap = dynamic(
  () =>
    import("@/components/ProvinceMap").then((m) => ({ default: m.ProvinceMap })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex w-full items-center justify-center rounded-md bg-muted/30"
        style={{ height: 240 }}
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

export function HomeMapPreview({ entries }: HomeMapPreviewProps) {
  return <ProvinceMap entries={entries} compact />;
}
