import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDimensionSlugs, getDimensionBySlug } from "@/lib/scoring-data";
import { DimensionBarChart } from "@/components/DimensionBarChart";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ShareButton } from "@/components/ShareButton";

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

export default async function DimensionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = getDimensionBySlug(slug);
  if (!data) notFound();

  const { label, ranking } = data;

  // Find best and worst with non-null scores for comparator link
  const withScores = ranking.filter((r) => r.score != null);
  const best = withScores[0];
  const worst = withScores[withScores.length - 1];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/dimensiones" className="hover:text-primary transition-colors">
          Dimensiones
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground font-medium">{label}</span>
      </nav>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{label}</h1>
        <ShareButton title={`${label} - Radar Municipal`} />
      </div>
      <p className="mt-2 text-muted-foreground">
        Ranking de los municipios piloto en la dimensión {label}.
      </p>

      {/* Bar chart */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4">
        <DimensionBarChart data={ranking} />
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
