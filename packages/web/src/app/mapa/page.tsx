import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAllMunicipiosForMap } from "@/lib/scoring-data";
import {
  MapPageClient,
  DEFAULT_METRIC_A,
  DEFAULT_METRIC_B,
  VALID_METRIC_KEYS,
} from "./MapPageClient";

interface PageSearchParams {
  a?: string;
  b?: string;
  compare?: string;
}

interface MapaPageProps {
  searchParams: Promise<PageSearchParams>;
}

/**
 * Sprint 40 — canonicaliza los search params. Si la URL entrante difiere
 * del canónico (e.g. `?a=scoreTotal` redundante, `?a=invalidMetric` mal,
 * `?compare=true` no-1, `?b=scoreFiscal&compare=0` con b sobrante), devuelve
 * el query string canónico para redirect. Si ya es canónica, devuelve null.
 *
 * Evita que URLs malformadas vivan en redes sociales y que dos URLs distintas
 * (e.g. `/mapa` y `/mapa?a=scoreTotal`) indexen como duplicados en buscadores.
 */
function canonicalizeMapaSearchParams(
  raw: PageSearchParams,
): string | null {
  const a = raw.a && VALID_METRIC_KEYS.has(raw.a) ? raw.a : null;
  const compareOn = raw.compare === "1";
  const b = raw.b && VALID_METRIC_KEYS.has(raw.b) ? raw.b : null;

  const out = new URLSearchParams();
  if (a && a !== DEFAULT_METRIC_A) out.set("a", a);
  if (compareOn) {
    out.set("compare", "1");
    if (b && b !== DEFAULT_METRIC_B) out.set("b", b);
  }

  // Reconstruimos los params entrantes en el mismo orden canónico (a, compare, b)
  // para que la comparación de toString() sea robusta. Si el cliente mandó
  // `?b=...&a=...` (orden distinto) lo redirigimos al orden canónico también.
  const incoming = new URLSearchParams();
  if (raw.a !== undefined) incoming.set("a", raw.a);
  if (raw.compare !== undefined) incoming.set("compare", raw.compare);
  if (raw.b !== undefined) incoming.set("b", raw.b);

  if (out.toString() === incoming.toString()) return null;
  const qs = out.toString();
  return qs ? `?${qs}` : "";
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

export default async function MapaPage({ searchParams }: MapaPageProps) {
  const raw = await searchParams;
  const canonical = canonicalizeMapaSearchParams(raw);
  if (canonical !== null) {
    redirect(`/mapa${canonical}`);
  }

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
