import type { Metadata } from "next";
import Link from "next/link";
import {
  getRanking,
  getScoreDistribution,
  getRegionalAverages,
  getDataCoverage,
} from "@/lib/scoring-data";
import { ScoreDistribution } from "@/components/ScoreDistribution";
import { DataCoverageHeatmap } from "@/components/DataCoverageHeatmap";
import { ScoreBadge } from "@/components/ScoreBadge";

export const metadata: Metadata = {
  title: "Panorama Provincial",
};

export default function PanoramaPage() {
  const ranking = getRanking();
  const distribution = getScoreDistribution();
  const regionalAvgs = getRegionalAverages();
  const coverage = getDataCoverage();

  const above60 = ranking.filter((r) => r.scoreTotal >= 60).length;
  const below40 = ranking.filter((r) => r.scoreTotal < 40).length;

  const top5 = ranking.slice(0, 5);
  const bottom5 = ranking.slice(-5).reverse();

  // Coverage summary
  const totalCells = coverage.reduce(
    (acc, row) => acc + Object.keys(row.dimensions).length,
    0,
  );
  const filledCells = coverage.reduce(
    (acc, row) =>
      acc + Object.values(row.dimensions).filter(Boolean).length,
    0,
  );
  const coveragePct = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Panorama Provincial</h1>
        <p className="mt-2 text-muted-foreground">
          Vista agregada del estado de los {ranking.length} municipios piloto
          de la Provincia de Buenos Aires.
        </p>
      </div>

      {/* Section 1: Score Distribution */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-1">
          Distribucion de scores
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Cuantos municipios caen en cada rango de score total
        </p>
        <div className="rounded-lg border p-4">
          <ScoreDistribution data={distribution} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {above60} municipio{above60 !== 1 ? "s" : ""} por encima de 60
          {" / "}
          {below40} municipio{below40 !== 1 ? "s" : ""} por debajo de 40
        </p>
      </section>

      {/* Section 2: Regional Averages */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-1">Promedio por region</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Score total promedio agrupado por region geografica
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {regionalAvgs.map((r) => (
            <div
              key={r.region}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{r.region}</p>
                <p className="text-xs text-muted-foreground">
                  {r.count} municipio{r.count !== 1 ? "s" : ""}
                </p>
              </div>
              <ScoreBadge score={Math.round(r.avgTotal)} size="lg" />
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Top 5 / Bottom 5 */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">Mejores y peores 5</h2>

        {/* Top 5 */}
        <h3 className="text-sm font-medium text-green-700 mb-2">
          Mejores 5
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
          {top5.map((entry) => (
            <Link
              key={entry.municipio.id}
              href={`/municipios/${entry.municipio.id}`}
              className="flex-none w-48 rounded-lg border-2 border-green-200 hover:border-green-400 p-4 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-green-700">
                  #{entry.posicion}
                </span>
                <ScoreBadge score={entry.scoreTotal} size="sm" />
              </div>
              <p className="font-medium text-sm truncate">
                {entry.municipio.nombre}
              </p>
            </Link>
          ))}
        </div>

        {/* Bottom 5 */}
        <h3 className="text-sm font-medium text-red-700 mb-2">Peores 5</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {bottom5.map((entry) => (
            <Link
              key={entry.municipio.id}
              href={`/municipios/${entry.municipio.id}`}
              className="flex-none w-48 rounded-lg border-2 border-red-200 hover:border-red-400 p-4 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-red-700">
                  #{entry.posicion}
                </span>
                <ScoreBadge score={entry.scoreTotal} size="sm" />
              </div>
              <p className="font-medium text-sm truncate">
                {entry.municipio.nombre}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 4: Data Coverage Heatmap */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-1">Cobertura de datos</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Que dimensiones tienen datos para cada municipio piloto
        </p>
        <div className="rounded-lg border p-4">
          <DataCoverageHeatmap data={coverage} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {filledCells} de {totalCells} celdas tienen datos ({coveragePct}%)
        </p>
      </section>
    </div>
  );
}
