"use client";

import { useMemo, useState } from "react";
import {
  SearchFilter,
  createEmptyFilterState,
  matchesPoblacion,
  matchesScoreTier,
  type FilterState,
} from "@/components/SearchFilter";
import { RankingTable } from "@/components/RankingTable";
import type { RankingEntry } from "@/lib/scoring-data";

interface FilterableRankingProps {
  ranking: RankingEntry[];
}

export function FilterableRanking({ ranking }: FilterableRankingProps) {
  const [filters, setFilters] = useState<FilterState>(createEmptyFilterState);

  const filtered = useMemo(() => {
    const q = filters.query.toLowerCase().trim();

    const result = ranking.filter((entry) => {
      // Text search
      if (q && !entry.municipio.nombre.toLowerCase().includes(q)) {
        return false;
      }

      // Region filter
      if (filters.regions.size > 0 && !filters.regions.has(entry.municipio.region)) {
        return false;
      }

      // Population filter
      if (!matchesPoblacion(entry.municipio.poblacion, filters.poblacion)) {
        return false;
      }

      // Score tier filter
      if (!matchesScoreTier(entry.scoreTotal, filters.scoreTier)) {
        return false;
      }

      return true;
    });

    // Re-number positions
    return result.map((entry, i) => ({
      ...entry,
      posicion: i + 1,
    }));
  }, [ranking, filters]);

  const isFiltered = filters.query || filters.regions.size > 0 || filters.poblacion.size > 0 || filters.scoreTier.size > 0;

  return (
    <>
      <SearchFilter onChange={setFilters} showScoreFilter />

      {isFiltered && (
        <p className="mb-3 text-sm text-muted-foreground">
          Mostrando {filtered.length} de {ranking.length} municipios
        </p>
      )}

      <RankingTable ranking={filtered} />
    </>
  );
}
