import type { Metadata } from "next";
import { getCoverageReport, getCoverageStats } from "@/lib/scoring-data";
import { CoverageStats } from "@/components/CoverageStats";
import { CoveragePanel } from "@/components/CoveragePanel";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Calidad de datos",
  description:
    "Cobertura por dimensión y fecha de última actualización de los 135 municipios de la Provincia de Buenos Aires.",
  openGraph: {
    title: "Calidad de datos — Radar Municipal",
    description:
      "Cuánta data tenemos cargada por municipio y cuándo fue la última actualización.",
  },
};

export default function Page() {
  const stats = getCoverageStats();
  const rows = getCoverageReport();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Cobertura y calidad de datos — Radar Municipal",
          description:
            "Porcentaje de dimensiones cubiertas y fecha de última actualización por municipio bonaerense.",
          url: "https://radarmunicipal.ar/calidad-datos",
          creator: {
            "@type": "Organization",
            name: "Radar Municipal",
            url: "https://radarmunicipal.ar",
          },
          license: "https://creativecommons.org/licenses/by/4.0/",
          ...(stats.ultimaActualizacionGlobal
            ? { dateModified: stats.ultimaActualizacionGlobal }
            : {}),
          spatialCoverage: {
            "@type": "Place",
            name: "Provincia de Buenos Aires, Argentina",
          },
        }}
      />
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Calidad de datos</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Cobertura por dimensión y fecha de última actualización de los{" "}
          {stats.totalMunicipios} municipios de la Provincia de Buenos Aires.
          Los {stats.conDatos} municipios piloto muestran datos reales; los
          restantes aparecen en 0% hasta que se automatice el scraping.
        </p>
      </header>

      <CoverageStats stats={stats} />

      <CoveragePanel rows={rows} />

      <p className="mt-8 text-xs text-muted-foreground">
        Expandí una fila de un municipio piloto para ver la última fecha por
        dimensión y el origen de cada fecha (publicación, auditoría o scrape).
        Los datos se actualizan manualmente en la fase piloto; el pipeline
        automatizado se activa en la próxima fase.
      </p>
    </div>
  );
}
