import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllMunicipiosForMap } from "@/lib/scoring-data";
import { MapPageClient } from "./MapPageClient";

interface PageSearchParams {
  a?: string;
  b?: string;
  compare?: string;
}

interface MapaPageProps {
  searchParams: Promise<PageSearchParams>;
}

/**
 * Sprint 39 — OG image dinámica que refleja el state del comparador
 * via URL params. Renderea Twitter cards distintas según `?a=...&b=...&compare=1`.
 *
 * Hacer la página dynamic (consume `searchParams`) es trade-off aceptable:
 * `/mapa` deja de prerenderizarse estático, pero ganamos previews
 * compartibles en redes. El render del HTML sigue siendo trivial porque
 * el contenido pesado (mapa interactivo) ya era client-side dinámico.
 */
export async function generateMetadata(
  { searchParams }: MapaPageProps,
): Promise<Metadata> {
  const { a, b, compare } = await searchParams;

  // Serializa sólo los params no-default para mantener canonical URLs
  // alineadas con el sync que hace MapPageClient.
  const ogParams = new URLSearchParams();
  if (a && a !== "scoreTotal") ogParams.set("a", a);
  if (compare === "1") {
    ogParams.set("compare", "1");
    if (b && b !== "scoreFiscal") ogParams.set("b", b);
  }
  const qs = ogParams.toString();
  const ogImageUrl = qs ? `/api/og/mapa?${qs}` : "/api/og/mapa";

  return {
    title: "Mapa Provincial",
    description:
      "Mapa interactivo de los 135 municipios de la Provincia de Buenos Aires coloreados por score.",
    openGraph: {
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImageUrl],
    },
  };
}

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

export default function MapaPage(_props: MapaPageProps) {
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
