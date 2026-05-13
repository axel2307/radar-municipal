import type { Metadata } from "next";
import Link from "next/link";
import { MUNICIPIOS } from "@radar-municipal/core";
import {
  getVialCrossCoverage,
  getVialCrossMetrics,
  getAllMunicipiosForPesosPorKm,
} from "@/lib/scoring-data";
import { PesosPorKmHeatmap } from "./PesosPorKmHeatmap";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Red Vial — Pesos por km",
  description:
    "Cruce de gasto fiscal en servicios económicos × kilómetros de red vial OSM. Indicador comparativo del Pilar 5 (Inteligencia Territorial) de Radar Municipal.",
};

function formatArs(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCompactArs(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${n}`;
}

export default function RedVialDimensionPage() {
  const coverage = getVialCrossCoverage();
  const mapEntries = getAllMunicipiosForPesosPorKm();
  const byId = new Map(MUNICIPIOS.map((m) => [m.id, m]));

  // Tabla ordenada por pesosPorKm desc.
  const rows = coverage.ids
    .map((id) => {
      const m = getVialCrossMetrics(id);
      const muni = byId.get(id);
      if (!m || !muni) return null;
      return { id, nombre: muni.nombre, region: muni.region, ...m };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.pesosPorKm - a.pesosPorKm);

  // Stats
  const ratio =
    rows.length >= 2
      ? Math.round(rows[0].pesosPorKm / rows[rows.length - 1].pesosPorKm)
      : null;
  const median =
    rows.length > 0 ? rows[Math.floor(rows.length / 2)].pesosPorKm : 0;
  const avg =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.pesosPorKm, 0) / rows.length)
      : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Inicio" },
          { href: "/dimensiones", label: "Dimensiones" },
          { label: "Red vial" },
        ]}
        className="mb-6"
      />

      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">
          Pesos por km de red vial
        </h1>
        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 uppercase tracking-wide">
          Pilar 5
        </span>
      </div>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Indicador cross-dimensional que aproxima cuántos pesos del gasto en{" "}
        <em>servicios económicos</em> ejecuta cada municipio por kilómetro de
        red vial. Combina datos fiscales RAFAM curados manualmente (13 piloto)
        con extracción automática de red vial desde OpenStreetMap (105
        partidos). La intersección de los 3 datasets da{" "}
        <strong>{coverage.withCross} partidos con cross completo</strong>.
      </p>

      {/* Hero stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border-2 border-violet-200 bg-violet-50/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Mayor
          </p>
          {rows[0] && (
            <>
              <p className="mt-1 text-lg font-bold">{rows[0].nombre}</p>
              <p className="text-2xl font-bold text-violet-700 tabular-nums">
                {formatCompactArs(rows[0].pesosPorKm)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / km
                </span>
              </p>
            </>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Mediana
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {formatCompactArs(median)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              / km
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            promedio {formatCompactArs(avg)} / km
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Menor
          </p>
          {rows[rows.length - 1] && (
            <>
              <p className="mt-1 text-lg font-bold">
                {rows[rows.length - 1].nombre}
              </p>
              <p className="text-2xl font-bold text-pink-700 tabular-nums">
                {formatCompactArs(rows[rows.length - 1].pesosPorKm)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / km
                </span>
              </p>
            </>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Variance
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {ratio ?? "—"}×
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            entre mayor y menor
          </p>
        </div>
      </div>

      {/* Heatmap */}
      <section className="mt-12">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Distribución geográfica</h2>
          <Link
            href="/mapa?a=pesosPorKm"
            className="text-sm font-medium text-primary hover:underline"
          >
            Abrir en mapa interactivo →
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <PesosPorKmHeatmap entries={mapEntries} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground max-w-3xl">
          {coverage.withCross} partidos con cross completo se pintan con paleta
          PuRd (rosa → púrpura). Los {135 - coverage.withCross} sin
          intersección de los 3 datasets aparecen grises. Click en cualquier
          partido para ver su ficha completa.
        </p>
      </section>

      {/* Ranking table */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Ranking</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground w-12">
                  #
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Municipio
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                  Pesos por km
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-center hidden sm:table-cell">
                  Denominador
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right hidden md:table-cell">
                  Gasto serv. ec.
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right hidden lg:table-cell">
                  km
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isOutlier = i === 0 || i === rows.length - 1;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/municipios/${r.id}/economia`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {r.nombre}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {r.region.replace(/_/g, " ").toLowerCase()}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={cn(
                          "font-semibold",
                          isOutlier && i === 0 && "text-violet-700",
                          isOutlier && i === rows.length - 1 && "text-pink-700",
                        )}
                      >
                        {formatCompactArs(r.pesosPorKm)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        / km
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span
                        className={cn(
                          "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          r.denominador === "rural"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700",
                        )}
                        title={
                          r.denominador === "rural"
                            ? "track + unclassified (≥100 km)"
                            : "track..primary (red rural <100 km, usa total)"
                        }
                      >
                        {r.denominador}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                      {formatArs(r.gastoServiciosEconomicos)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                      {Math.round(r.kmDenominador).toLocaleString("es-AR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Metodología / disclaimer */}
      <section className="mt-12 rounded-lg border border-amber-200 bg-amber-50/40 p-5 text-sm">
        <h3 className="font-semibold text-amber-900 mb-2">
          Notas metodológicas
        </h3>
        <ul className="space-y-2 text-amber-900/90 leading-relaxed">
          <li>
            <strong>Numerador (gasto):</strong>{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">
              gastoTotal × pctServiciosEconomicos / 100
            </code>
            . Servicios económicos en RAFAM incluye vialidad pero también obra
            pública, agro, comercio. <strong>Sobre-estima</strong> el gasto
            vial puro.
          </li>
          <li>
            <strong>Denominador (km):</strong> para partidos con red rural
            significativa (≥100 km de <code>track + unclassified</code>) se
            usa esa medida (<em>rural</em>). Para conurbano donde la red rural
            es residual (Vicente López, San Isidro), se usa la red total
            (<em>total</em>) — track + unclassified + tertiary + secondary +
            primary. La columna &quot;Denominador&quot; lo aclara fila por
            fila.
          </li>
          <li>
            <strong>Cobertura:</strong> {coverage.withCross}/{coverage.total}{" "}
            partidos con red vial automatizada tienen también gasto-función
            curado en el piloto. Para extender más, hay que curar más entradas
            en <code>pilot-fiscal.json</code> y{" "}
            <code>pilot-gasto-funcion.json</code>.
          </li>
        </ul>
        <p className="mt-3 text-xs text-amber-900/70">
          Sprint 32 introdujo el cross. Sprint 33 destrabó cobertura via fix
          de IDs canónicos. Sprint 36 extendió a conurbano. Ver{" "}
          <Link href="/metodologia" className="underline">
            metodología completa
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
