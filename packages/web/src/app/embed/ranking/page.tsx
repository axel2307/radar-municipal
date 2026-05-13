import type { Metadata } from "next";
import Link from "next/link";
import { getRanking } from "@/lib/scoring-data";
import { ScoreBadge } from "@/components/ScoreBadge";

export const metadata: Metadata = {
  title: "Top ranking (embed)",
  robots: { index: false, follow: false },
};

interface EmbedRankingPageProps {
  searchParams: Promise<{ top?: string }>;
}

/**
 * Sprint 45C — Embed compacto del top N del ranking.
 *
 * URL params:
 *   ?top=5     (default) tabla compacta de los mejores 5
 *   ?top=10    versión más alta con 10
 *   ?top=20    máximo 20 (capped server-side)
 *
 * Cada fila linkea a la ficha completa con target="_top" para abrir en
 * la ventana padre del iframe (NO dentro del iframe, lo cual sería
 * confuso para el lector).
 */
export default async function EmbedRankingPage({
  searchParams,
}: EmbedRankingPageProps) {
  const { top } = await searchParams;
  const parsedTop = top ? parseInt(top, 10) : 5;
  const n = Math.min(Math.max(Number.isFinite(parsedTop) ? parsedTop : 5, 1), 20);

  const ranking = getRanking().slice(0, n);

  return (
    <div>
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h1 className="text-lg font-bold">
          Top {n} · Ranking Radar Municipal
        </h1>
        <Link
          href="/ranking"
          target="_top"
          className="text-xs font-medium text-primary hover:underline"
        >
          Ver completo →
        </Link>
      </header>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium w-10">#</th>
              <th className="px-3 py-2 font-medium">Municipio</th>
              <th className="px-3 py-2 font-medium text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r) => (
              <tr
                key={r.municipio.id}
                className="border-b border-border last:border-0"
              >
                <td className="px-3 py-2 font-medium text-muted-foreground tabular-nums">
                  {r.posicion}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/municipios/${r.municipio.id}`}
                    target="_top"
                    className="font-medium text-primary hover:underline"
                  >
                    {r.municipio.nombre}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right">
                  <ScoreBadge score={r.scoreTotal} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
