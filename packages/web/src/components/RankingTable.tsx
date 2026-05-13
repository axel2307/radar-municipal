"use client";

import { useState } from "react";
import Link from "next/link";
import { ScoringCategory } from "@radar-municipal/core";
import { ScoreBadge } from "@/components/ScoreBadge";
import { formatNumber } from "@/lib/utils";
import { CATEGORY_BADGE } from "@/lib/colors";

interface RankingRow {
  posicion: number;
  municipio: {
    id: string;
    nombre: string;
    partido: string;
    poblacion: number | null;
  };
  scoreTransparencia: number;
  scoreNormativa: number | null;
  scoreParticipacion: number | null;
  scoreFiscal: number | null;
  scoreGastoFuncion: number | null;
  scoreEconomiaLocal: number | null;
  scorePresionImpositiva: number | null;
  scoreServiciosBasicos: number | null;
  scoreEducacionSalud: number | null;
  scoreConectividad: number | null;
  scoreEspacioPublico: number | null;
  scoreSeguridadVial: number | null;
  scoreTotal: number;
  categoryScores: Record<ScoringCategory, number | null>;
}

interface RankingTableProps {
  ranking: RankingRow[];
}

type CategoryKey = "gobierno" | "economia" | "calidad" | "infra";

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  shortLabel: string;
  color: string;
  textColor: string;
  bgColor: string;
  scoringCategory: ScoringCategory;
  columns: { label: string; field: keyof RankingRow }[];
}[] = [
  // Sprint 41D — colores generados desde CATEGORY_BADGE (source of truth).
  // Bug histórico fixeado: "infra" usaba `purple` cuando home/dimensiones
  // usan `violet`. Ahora todas las consumers comparten el mismo violet.
  {
    key: "gobierno",
    label: "Gobierno Abierto",
    shortLabel: "Gob.",
    color: CATEGORY_BADGE[ScoringCategory.GOBIERNO_ABIERTO].borderStrong,
    textColor: "text-blue-600",
    bgColor: CATEGORY_BADGE[ScoringCategory.GOBIERNO_ABIERTO].bg,
    scoringCategory: ScoringCategory.GOBIERNO_ABIERTO,
    columns: [
      { label: "Transp.", field: "scoreTransparencia" },
      { label: "Normat.", field: "scoreNormativa" },
      { label: "Partic.", field: "scoreParticipacion" },
    ],
  },
  {
    key: "economia",
    label: "Economía y Finanzas",
    shortLabel: "Econ.",
    color: CATEGORY_BADGE[ScoringCategory.ECONOMIA_FINANZAS].borderStrong,
    textColor: "text-amber-600",
    bgColor: CATEGORY_BADGE[ScoringCategory.ECONOMIA_FINANZAS].bg,
    scoringCategory: ScoringCategory.ECONOMIA_FINANZAS,
    columns: [
      { label: "Fiscal", field: "scoreFiscal" },
      { label: "Gasto Fn.", field: "scoreGastoFuncion" },
      { label: "Economía", field: "scoreEconomiaLocal" },
      { label: "Pres.Imp.", field: "scorePresionImpositiva" },
    ],
  },
  {
    key: "calidad",
    label: "Calidad de Vida",
    shortLabel: "Cal.",
    color: CATEGORY_BADGE[ScoringCategory.CALIDAD_DE_VIDA].borderStrong,
    textColor: "text-green-600",
    bgColor: CATEGORY_BADGE[ScoringCategory.CALIDAD_DE_VIDA].bg,
    scoringCategory: ScoringCategory.CALIDAD_DE_VIDA,
    columns: [
      { label: "Servicios", field: "scoreServiciosBasicos" },
      { label: "Educ.", field: "scoreEducacionSalud" },
      { label: "Conect.", field: "scoreConectividad" },
      { label: "Esp.Púb.", field: "scoreEspacioPublico" },
    ],
  },
  {
    key: "infra",
    label: "Infraestructura",
    shortLabel: "Infra.",
    color: CATEGORY_BADGE[ScoringCategory.INFRAESTRUCTURA_MOVILIDAD].borderStrong,
    textColor: "text-violet-600",
    bgColor: CATEGORY_BADGE[ScoringCategory.INFRAESTRUCTURA_MOVILIDAD].bg,
    scoringCategory: ScoringCategory.INFRAESTRUCTURA_MOVILIDAD,
    columns: [
      { label: "Seg.Vial", field: "scoreSeguridadVial" },
    ],
  },
];

export function RankingTable({ ranking }: RankingTableProps) {
  const [expanded, setExpanded] = useState<Set<CategoryKey>>(new Set(["gobierno"]));

  function toggleCategory(key: CategoryKey) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-3 text-left font-semibold text-muted-foreground w-10">#</th>
            <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Municipio</th>
            <th className="px-3 py-3 text-left font-semibold text-muted-foreground hidden sm:table-cell">Población</th>

            {CATEGORIES.map((cat) => {
              const isExpanded = expanded.has(cat.key);
              return isExpanded ? (
                cat.columns.map((col) => (
                  <th
                    key={`${cat.key}-${col.field}`}
                    className={`px-2 py-3 text-center font-semibold text-xs ${cat.textColor} cursor-pointer hover:underline`}
                    onClick={() => toggleCategory(cat.key)}
                    title={`Click para colapsar ${cat.label}`}
                  >
                    {col.label}
                  </th>
                ))
              ) : (
                <th
                  key={cat.key}
                  className={`px-2 py-3 text-center font-semibold text-xs ${cat.textColor} cursor-pointer hover:underline`}
                  onClick={() => toggleCategory(cat.key)}
                  title={`Click para expandir ${cat.label}`}
                >
                  <span className={`inline-flex items-center gap-1 rounded-full ${cat.bgColor} px-2 py-0.5`}>
                    {cat.shortLabel}
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </span>
                </th>
              );
            })}

            <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Total</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((entry) => (
            <tr
              key={entry.municipio.id}
              className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="px-3 py-3 font-medium text-muted-foreground">{entry.posicion}</td>
              <td className="px-3 py-3">
                <Link
                  href={`/municipios/${entry.municipio.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {entry.municipio.nombre}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">
                  {entry.municipio.partido}
                </span>
              </td>
              <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell">
                {formatNumber(entry.municipio.poblacion)}
              </td>

              {CATEGORIES.map((cat) => {
                const isExpanded = expanded.has(cat.key);
                if (isExpanded) {
                  return cat.columns.map((col) => (
                    <td key={`${cat.key}-${col.field}`} className="px-2 py-3 text-center">
                      <ScoreBadge score={entry[col.field] as number | null} size="sm" />
                    </td>
                  ));
                } else {
                  const catScore = entry.categoryScores[cat.scoringCategory];
                  return (
                    <td key={cat.key} className="px-2 py-3 text-center">
                      <ScoreBadge score={catScore} size="sm" />
                    </td>
                  );
                }
              })}

              <td className="px-3 py-3 text-center">
                <ScoreBadge score={entry.scoreTotal} size="md" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
