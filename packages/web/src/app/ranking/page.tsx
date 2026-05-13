import Link from "next/link";
import type { Metadata } from "next";
import { ScoringCategory, SCORING_CATEGORIES } from "@radar-municipal/core";
import { getRanking, getAuditDate } from "@/lib/scoring-data";
import { API_BASE_URL } from "@/lib/config";
import { FilterableRanking } from "@/components/FilterableRanking";
import { ShareButton } from "@/components/ShareButton";
import { CATEGORY_BADGE } from "@/lib/colors";
import { cn } from "@/lib/utils";

// Sprint 41D — leyenda generada desde el source-of-truth (SCORING_CATEGORIES
// + CATEGORY_BADGE) en lugar de hardcoded. Si se agregan categorías nuevas
// o cambian colores, este bloque se actualiza solo.
const LEGEND_ORDER: ScoringCategory[] = [
  ScoringCategory.GOBIERNO_ABIERTO,
  ScoringCategory.ECONOMIA_FINANZAS,
  ScoringCategory.CALIDAD_DE_VIDA,
  ScoringCategory.INFRAESTRUCTURA_MOVILIDAD,
];

export const metadata: Metadata = {
  title: "Ranking",
};

export default function RankingPage() {
  const ranking = getRanking();
  const auditDate = getAuditDate();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ranking de municipios</h1>
          <p className="mt-2 text-muted-foreground">
            Comparación de los 13 municipios piloto de la Provincia de Buenos
            Aires en 11 dimensiones agrupadas en 4 categorías. Clickeá en una
            categoría para expandir o colapsar sus dimensiones.
          </p>
        </div>
        <ShareButton title="Ranking de Municipios - Radar Municipal" />
      </div>

      {/* Leyenda de categorías — Sprint 41D generada desde shared colors */}
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        {LEGEND_ORDER.map((cat) => {
          const cfg = SCORING_CATEGORIES[cat];
          const badge = CATEGORY_BADGE[cat];
          return (
            <span
              key={cat}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
                badge.bg,
                badge.text,
              )}
            >
              {cfg.label} ({Math.round(cfg.peso * 100)}%)
            </span>
          );
        })}
      </div>

      <FilterableRanking ranking={ranking} />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <p className="text-xs text-muted-foreground flex-1">
          Datos de auditoría ({auditDate}), Censo 2022 (INDEC), SIBOM,
          indicadores fiscales. Score total = promedio ponderado por categoría.{" "}
          <Link href="/metodologia" className="text-primary hover:underline">
            Ver metodología
          </Link>
        </p>
        <div className="flex gap-2">
          <a
            href={`${API_BASE_URL}/api/export/ranking.csv`}
            download
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV
          </a>
          <a
            href={`${API_BASE_URL}/api/export/ranking.json`}
            download
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            JSON
          </a>
        </div>
      </div>
    </div>
  );
}
