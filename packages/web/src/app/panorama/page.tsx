import type { Metadata } from "next";
import Link from "next/link";
import {
  getRanking,
  getScoreDistribution,
  getRegionalAverages,
  getDataCoverage,
  getVialCrossCoverage,
  getVialCrossMetrics,
} from "@/lib/scoring-data";
import { MUNICIPIOS } from "@radar-municipal/core";
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

  // Sprint 41C — Pilar 5 outliers (cross fiscal × vial OSM)
  const vialCov = getVialCrossCoverage();
  const byId = new Map(MUNICIPIOS.map((m) => [m.id, m]));
  const vialRows = vialCov.ids
    .map((id) => {
      const m = getVialCrossMetrics(id);
      const muni = byId.get(id);
      if (!m || !muni) return null;
      return { id, nombre: muni.nombre, pesosPorKm: m.pesosPorKm };
    })
    .filter((x): x is { id: string; nombre: string; pesosPorKm: number } => x !== null)
    .sort((a, b) => b.pesosPorKm - a.pesosPorKm);
  const vialTop3 = vialRows.slice(0, 3);
  const vialBottom3 = vialRows.slice(-3).reverse();
  const vialRatio =
    vialRows.length >= 2
      ? Math.round(vialRows[0].pesosPorKm / vialRows[vialRows.length - 1].pesosPorKm)
      : null;

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

      {/* Section 4: Pilar 5 — Pesos por km (Sprint 41C) */}
      {vialRows.length > 0 && (
        <section className="mb-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <h2 className="text-lg font-semibold">
              Pilar 5 — Pesos por km de red vial
            </h2>
            <Link
              href="/dimensiones/red-vial"
              className="text-sm font-medium text-violet-700 hover:underline"
            >
              Ver ranking completo →
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Cross fiscal × OSM. {vialRows.length} partidos con datos completos
            {vialRatio && (
              <>
                {" "}· variance <strong>{vialRatio}×</strong> entre el mayor y el menor
              </>
            )}.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-700 mb-2">
                Mayor gasto / km
              </h3>
              <div className="flex flex-col gap-1.5">
                {vialTop3.map((r) => (
                  <Link
                    key={r.id}
                    href={`/municipios/${r.id}/economia`}
                    className="flex items-center justify-between rounded-md border border-violet-200 bg-violet-50/40 px-3 py-2 hover:bg-violet-50 transition-colors"
                  >
                    <span className="font-medium text-sm">{r.nombre}</span>
                    <span className="text-sm font-bold text-violet-700 tabular-nums">
                      ${(r.pesosPorKm / 1e6).toFixed(2)}M / km
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-pink-700 mb-2">
                Menor gasto / km
              </h3>
              <div className="flex flex-col gap-1.5">
                {vialBottom3.map((r) => (
                  <Link
                    key={r.id}
                    href={`/municipios/${r.id}/economia`}
                    className="flex items-center justify-between rounded-md border border-pink-200 bg-pink-50/40 px-3 py-2 hover:bg-pink-50 transition-colors"
                  >
                    <span className="font-medium text-sm">{r.nombre}</span>
                    <span className="text-sm font-bold text-pink-700 tabular-nums">
                      ${(r.pesosPorKm / 1e6).toFixed(2)}M / km
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section 5: Data Coverage Heatmap */}
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
