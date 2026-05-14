import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDimensionSlugs, getDimensionBySlug } from "@/lib/scoring-data";
import { DimensionBarChart } from "@/components/DimensionBarChart";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ShareButton } from "@/components/ShareButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getDimensionSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = getDimensionBySlug(slug);
  if (!data) return { title: "Dimensión no encontrada" };
  return {
    title: `${data.label} — Ranking por dimensión`,
    description: `Ranking de municipios de la Provincia de Buenos Aires en la dimensión ${data.label}.`,
  };
}

// Cuando el ranking tiene más de TOP_CHART_LIMIT entradas, el bar chart
// se limita a los top N para que no crezca a miles de pixeles de alto
// (cada entrada ocupa ~50px). La tabla debajo sigue mostrando todos.
const TOP_CHART_LIMIT = 30;

export default async function DimensionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = getDimensionBySlug(slug);
  if (!data) notFound();

  const { label, ranking } = data;

  // Find best and worst with non-null scores for comparator link
  const withScores = ranking.filter((r) => r.score != null);
  const best = withScores[0];
  const worst = withScores[withScores.length - 1];

  // Sprint 52 — para transparencia el ranking abarca 122 municipios
  // (13 piloto + 109 auto-detectados). Para el resto siguen siendo 13.
  const piloto = ranking.filter((r) => r.esPiloto !== false);
  const auto = ranking.filter((r) => r.esPiloto === false);
  const isExpandedDimension = auto.length > 0;

  // Recortar bar chart si es grande. Si es chico (piloto = 13), mostrar todo.
  const chartData =
    ranking.length > TOP_CHART_LIMIT
      ? ranking.slice(0, TOP_CHART_LIMIT)
      : ranking;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Inicio" },
          { href: "/dimensiones", label: "Dimensiones" },
          { label },
        ]}
        className="mb-6"
      />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{label}</h1>
        <ShareButton title={`${label} - Radar Municipal`} />
      </div>
      <p className="mt-2 text-muted-foreground">
        {isExpandedDimension ? (
          <>
            Ranking de los <strong>{ranking.length}</strong> municipios con
            datos en la dimensión {label}.
          </>
        ) : (
          <>
            Ranking de los {ranking.length} municipios piloto en la dimensión
            {" "}
            {label}.
          </>
        )}
      </p>

      {/* Sprint 52 — banner explicando la mezcla de fuentes cuando aplica */}
      {isExpandedDimension && (
        <div
          role="note"
          className="mt-4 rounded-md border border-blue-200 bg-blue-50/50 p-3 text-sm text-blue-900"
        >
          <strong>{piloto.length}</strong> auditados manualmente (piloto, datos
          profundos) ·{" "}
          <strong>{auto.length}</strong> detectados automáticamente por crawler
          (existencia de documentos clave, sin validación humana profunda).
        </div>
      )}

      {/* Bar chart — recortado a top N cuando el ranking es grande */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4">
        <DimensionBarChart data={chartData} />
        {ranking.length > TOP_CHART_LIMIT && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Top {TOP_CHART_LIMIT} de {ranking.length}. Tabla completa abajo.
          </p>
        )}
      </div>

      {/* Comparator shortcut */}
      {best && worst && best.municipioId !== worst.municipioId && (
        <div className="mt-6 flex justify-center">
          <Link
            href={`/comparador?a=${best.municipioId}&b=${worst.municipioId}`}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Comparar mejor vs peor
          </Link>
        </div>
      )}

      {/* Table */}
      <div className="mt-10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 pr-4 font-medium w-12">#</th>
              <th className="pb-3 pr-4 font-medium">Municipio</th>
              <th className="pb-3 font-medium text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r) => (
              <tr key={r.municipioId} className="border-b last:border-0">
                <td className="py-3 pr-4 text-muted-foreground">{r.posicion}</td>
                <td className="py-3 pr-4">
                  <Link
                    href={`/municipios/${r.municipioId}`}
                    className="font-medium hover:text-primary transition-colors"
                  >
                    {r.nombre}
                  </Link>
                  {/* Sprint 52 — chip "auto" para entries no-piloto. Solo
                      aparece cuando la dimensión esta expandida (transparencia). */}
                  {r.esPiloto === false && (
                    <span
                      title="Detectado automáticamente por crawler — sin auditoría manual profunda"
                      className="ml-2 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800"
                    >
                      auto
                    </span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <ScoreBadge score={r.score} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Back link */}
      <div className="mt-8">
        <Link
          href="/dimensiones"
          className="text-sm font-medium text-primary hover:underline"
        >
          &larr; Volver a dimensiones
        </Link>
      </div>
    </div>
  );
}
