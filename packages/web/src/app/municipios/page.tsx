import type { Metadata } from "next";
import { MUNICIPIOS } from "@radar-municipal/core";
import { FilterableMunicipios } from "@/components/FilterableMunicipios";

export const metadata: Metadata = {
  title: "Municipios",
};

export default function MunicipiosPage() {
  const pilotos = MUNICIPIOS.filter((m) => m.esPiloto);
  const otros = MUNICIPIOS.filter((m) => !m.esPiloto);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Municipios</h1>
        <p className="mt-2 text-muted-foreground">
          Los 135 partidos de la Provincia de Buenos Aires. Los municipios
          piloto cuentan con datos detallados; el resto se completa
          progresivamente con fuentes nacionales y provinciales.
        </p>
      </div>

      <FilterableMunicipios pilotos={pilotos} otros={otros} />
    </div>
  );
}
