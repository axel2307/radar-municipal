import type { Metadata } from "next";
import { getAllMunicipiosForMap } from "@/lib/scoring-data";
import { MapPageClient } from "./MapPageClient";

export const metadata: Metadata = {
  title: "Mapa Provincial",
  description: "Mapa interactivo de los 135 municipios de la Provincia de Buenos Aires coloreados por score.",
};

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

      <MapPageClient initialEntries={entries} />
    </div>
  );
}
