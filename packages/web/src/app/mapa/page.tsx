import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllMunicipiosForMap } from "@/lib/scoring-data";
import { MapPageClient } from "./MapPageClient";

export const metadata: Metadata = {
  title: "Mapa Provincial",
  description: "Mapa interactivo de los 135 municipios de la Provincia de Buenos Aires coloreados por score.",
};

/**
 * Sprint 38 — Suspense boundary necesario porque `MapPageClient` lee
 * `useSearchParams` para inicializar state desde URL (?a=...&b=...&compare=1).
 * Sin esto, el build de producción falla con "Missing Suspense boundary".
 */
function MapFallback() {
  return (
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
  );
}

export default function MapaPage() {
  const entries = getAllMunicipiosForMap("scoreTotal");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Mapa de municipios</h1>
        <p className="mt-2 text-muted-foreground">
          Vista geográfica de los 135 partidos de la Provincia de Buenos Aires,
          agrupados por región y coloreados según el score seleccionado.
          Hacé click en un municipio para ver su ficha completa.
        </p>
      </div>

      <Suspense fallback={<MapFallback />}>
        <MapPageClient initialEntries={entries} />
      </Suspense>
    </div>
  );
}
