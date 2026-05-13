import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  getMunicipioDetail,
  type MunicipioDetail,
} from "@/lib/scoring-data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ShareButton } from "@/components/ShareButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { cn } from "@/lib/utils";
import { ComparadorSelectors } from "./ComparadorSelectors";
import { ComparadorRadar } from "./ComparadorRadar";
import { buildRadarDimensions } from "./comparador-helpers";
import { RADAR_COLORS } from "./constants";
import {
  canonicalizeComparadorSearchParams,
  type ComparadorSearchParams,
} from "./canonicalize";

interface ComparadorPageProps {
  searchParams: Promise<ComparadorSearchParams>;
}

/**
 * Sprint 44A — Rewrite del comparador.
 *
 * El archivo original era 559 LOC, todo "use client", con
 * `window.history.replaceState` en lugar del patrón Next router.
 *
 * Ahora:
 *   - Page = server component que consume searchParams + computa detalles
 *   - ComparadorSelectors (client) = 3 dropdowns con router.replace
 *   - ComparadorRadar (client) = wrapper Recharts
 *   - canonicalize + redirect (patrón Sprint 40)
 *   - generateMetadata con OG image dinámica (patrón Sprint 39)
 *   - Breadcrumbs (patrón Sprint 41E)
 */
export async function generateMetadata({
  searchParams,
}: ComparadorPageProps): Promise<Metadata> {
  const { a, b, c } = await searchParams;
  const ogParams = new URLSearchParams();
  if (a) ogParams.set("a", a);
  if (b) ogParams.set("b", b);
  if (c) ogParams.set("c", c);
  const qs = ogParams.toString();
  const ogImageUrl = qs ? `/api/og/comparador?${qs}` : "/api/og/comparador";

  return {
    title: "Comparador",
    description:
      "Compará dos o tres municipios de la Provincia de Buenos Aires lado a lado en las 12 dimensiones de Radar Municipal.",
    openGraph: {
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImageUrl],
    },
  };
}

// ─── Comparison tables: server-rendered sub-components ─────────────────

function ScoreOrEmpty({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return <span className="text-xs text-muted-foreground">Sin datos</span>;
  }
  return <ScoreBadge score={score} size="sm" />;
}

function GeneralTable({
  details,
}: {
  details: MunicipioDetail[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
              Indicador
            </th>
            {details.map((d) => (
              <th
                key={d.municipio.id}
                className="px-4 py-3 text-center font-semibold text-primary"
              >
                {d.municipio.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="px-4 py-3 text-muted-foreground">Población</td>
            {details.map((d) => (
              <td key={d.municipio.id} className="px-4 py-3 text-center">
                {d.municipio.poblacion?.toLocaleString("es-AR") ?? "—"}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border">
            <td className="px-4 py-3 text-muted-foreground">Superficie</td>
            {details.map((d) => (
              <td key={d.municipio.id} className="px-4 py-3 text-center">
                {d.municipio.superficieKm2?.toLocaleString("es-AR") ?? "—"} km²
              </td>
            ))}
          </tr>
          <tr className="border-b border-border">
            <td className="px-4 py-3 text-muted-foreground">Densidad</td>
            {details.map((d) => (
              <td key={d.municipio.id} className="px-4 py-3 text-center">
                {d.municipio.densidad?.toFixed(1) ?? "—"} hab/km²
              </td>
            ))}
          </tr>
          <tr className="border-b border-border bg-muted/30">
            <td className="px-4 py-3 font-medium">Score transparencia</td>
            {details.map((d) => (
              <td key={d.municipio.id} className="px-4 py-3 text-center">
                <ScoreOrEmpty score={d.scoreTransparencia} />
              </td>
            ))}
          </tr>
          <tr className="border-b border-border bg-muted/30">
            <td className="px-4 py-3 font-medium">Score fiscal</td>
            {details.map((d) => (
              <td key={d.municipio.id} className="px-4 py-3 text-center">
                <ScoreOrEmpty score={d.scoreFiscal} />
              </td>
            ))}
          </tr>
          <tr className="border-b border-border bg-muted/30">
            <td className="px-4 py-3 font-medium">Score normativa</td>
            {details.map((d) => (
              <td key={d.municipio.id} className="px-4 py-3 text-center">
                <ScoreOrEmpty score={d.scoreNormativa} />
              </td>
            ))}
          </tr>
          <tr className="bg-muted/30">
            <td className="px-4 py-3 font-semibold">Score total</td>
            {details.map((d) => (
              <td key={d.municipio.id} className="px-4 py-3 text-center">
                <ScoreBadge score={d.scoreTotal} size="lg" />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BreakdownTable({ details }: { details: MunicipioDetail[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
              Criterio
            </th>
            <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-16">
              Peso
            </th>
            {details.map((d) => (
              <th
                key={d.municipio.id}
                className="px-4 py-2 text-center font-semibold text-primary"
              >
                {d.municipio.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {details[0].breakdown.map((rowA, i) => (
            <tr
              key={rowA.criterio}
              className="border-b border-border last:border-0"
            >
              <td className="px-4 py-2 font-medium">{rowA.descripcion}</td>
              <td className="px-4 py-2 text-center text-muted-foreground">
                {(rowA.peso * 100).toFixed(0)}%
              </td>
              {details.map((d, j) => {
                const row = j === 0 ? rowA : d.breakdown[i];
                return (
                  <td key={d.municipio.id} className="px-4 py-2 text-center">
                    {row ? (
                      <span
                        className={cn(
                          "font-medium",
                          row.valor >= 0.7
                            ? "text-score-high"
                            : row.valor >= 0.4
                              ? "text-score-mid"
                              : "text-score-low",
                        )}
                      >
                        {(row.valor * 100).toFixed(0)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentosTable({ details }: { details: MunicipioDetail[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
              Documento
            </th>
            {details.map((d) => (
              <th
                key={d.municipio.id}
                className="px-4 py-2 text-center font-semibold text-primary"
              >
                {d.municipio.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {details[0].documentos.map((docA) => (
            <tr
              key={docA.categoria}
              className="border-b border-border last:border-0"
            >
              <td className="px-4 py-2 font-medium">{docA.categoriaLabel}</td>
              {details.map((d, j) => {
                const doc =
                  j === 0
                    ? docA
                    : d.documentos.find((dd) => dd.categoria === docA.categoria);
                return (
                  <td key={d.municipio.id} className="px-4 py-2 text-center">
                    {doc?.publicado ? (
                      <span className="text-score-high font-medium">
                        {doc.formato ?? "Sí"}
                      </span>
                    ) : (
                      <span className="text-score-low font-medium">No</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FiscalTable({ details }: { details: MunicipioDetail[] }) {
  const fmt = (v: number | null | undefined) =>
    v != null ? `$${Math.round(v).toLocaleString("es-AR")}` : "—";

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
              Indicador
            </th>
            {details.map((d) => (
              <th
                key={d.municipio.id}
                className="px-4 py-2 text-center font-semibold text-primary"
              >
                {d.municipio.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="px-4 py-2 text-muted-foreground">Gasto per cápita</td>
            {details.map((d) => (
              <td
                key={d.municipio.id}
                className="px-4 py-2 text-center font-medium"
              >
                {fmt(d.fiscal?.gastoPcapita)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border">
            <td className="px-4 py-2 text-muted-foreground">Deuda per cápita</td>
            {details.map((d) => (
              <td
                key={d.municipio.id}
                className="px-4 py-2 text-center font-medium"
              >
                {fmt(d.fiscal?.deudaPcapita)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border">
            <td className="px-4 py-2 text-muted-foreground">
              % Gasto en personal
            </td>
            {details.map((d) => (
              <td
                key={d.municipio.id}
                className="px-4 py-2 text-center font-medium"
              >
                {d.fiscal?.pctPersonal != null
                  ? `${d.fiscal.pctPersonal.toFixed(1)}%`
                  : "—"}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border">
            <td className="px-4 py-2 text-muted-foreground">% Gasto de capital</td>
            {details.map((d) => (
              <td
                key={d.municipio.id}
                className="px-4 py-2 text-center font-medium"
              >
                {d.fiscal?.pctCapital != null
                  ? `${d.fiscal.pctCapital.toFixed(1)}%`
                  : "—"}
              </td>
            ))}
          </tr>
          <tr className="bg-muted/30">
            <td className="px-4 py-2 font-semibold">Score fiscal</td>
            {details.map((d) => (
              <td key={d.municipio.id} className="px-4 py-2 text-center">
                {d.fiscal ? (
                  <ScoreBadge score={d.fiscal.scoreTotal} size="sm" />
                ) : (
                  <span className="text-xs text-muted-foreground">Sin datos</span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Page (server component) ─────────────────────────────────────────────

export default async function ComparadorPage({
  searchParams,
}: ComparadorPageProps) {
  const raw = await searchParams;

  // Sprint 40 pattern: canonicalize + redirect si la URL es ruidosa
  const canonical = canonicalizeComparadorSearchParams(raw);
  if (canonical !== null) {
    redirect(`/comparador${canonical}`);
  }

  // Resolver detalles server-side
  const detailA = raw.a ? getMunicipioDetail(raw.a) : null;
  const detailB = raw.b ? getMunicipioDetail(raw.b) : null;
  const detailC = raw.c ? getMunicipioDetail(raw.c) : null;

  // Series del radar (server-computed, pasadas como props al client island)
  const radarSeries = [
    detailA && {
      name: detailA.municipio.nombre,
      color: RADAR_COLORS[0],
      fillOpacity: 0.1,
      dimensions: buildRadarDimensions(detailA),
    },
    detailB && {
      name: detailB.municipio.nombre,
      color: RADAR_COLORS[1],
      fillOpacity: 0.1,
      dimensions: buildRadarDimensions(detailB),
    },
    detailC && {
      name: detailC.municipio.nombre,
      color: RADAR_COLORS[2],
      fillOpacity: 0.1,
      dimensions: buildRadarDimensions(detailC),
    },
  ].filter((s): s is NonNullable<typeof s> => s !== null);

  const details = [detailA, detailB, detailC].filter(
    (d): d is MunicipioDetail => d !== null,
  );
  const hasMin = detailA && detailB;
  const hasFiscal = details.some((d) => d.fiscal != null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Inicio" },
          { label: "Comparador" },
        ]}
        className="mb-6"
      />

      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Comparador</h1>
          <p className="mt-2 text-muted-foreground">
            Seleccioná dos municipios piloto para compararlos lado a lado.
            Opcionalmente, agregá un tercero para análisis triangular.
          </p>
        </div>
        <ShareButton title="Comparador de Municipios - Radar Municipal" />
      </div>

      {/* Suspense necesario porque ComparadorSelectors lee useSearchParams */}
      <Suspense fallback={<div className="mb-8 h-20 animate-pulse rounded-md bg-muted/30" />}>
        <ComparadorSelectors />
      </Suspense>

      {hasMin ? (
        <div className="space-y-8">
          {/* Radar superpuesto */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-center mb-2">
              Comparación multidimensional
            </p>
            <ComparadorRadar series={radarSeries} />
          </div>

          {/* Datos generales + scores */}
          <GeneralTable details={details} />

          {/* Desglose de criterios */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Desglose por criterio</h2>
            <BreakdownTable details={details} />
          </div>

          {/* Documentos fiscales */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Documentos fiscales</h2>
            <DocumentosTable details={details} />
          </div>

          {/* Indicadores fiscales */}
          {hasFiscal && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Indicadores fiscales</h2>
              <FiscalTable details={details} />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Scores calculados a partir de auditoría manual y datos fiscales
            curados.{" "}
            <Link href="/metodologia" className="text-primary hover:underline">
              Ver metodología
            </Link>
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <p className="text-muted-foreground">
            Seleccioná dos municipios para ver la comparación.
          </p>
        </div>
      )}
    </div>
  );
}
