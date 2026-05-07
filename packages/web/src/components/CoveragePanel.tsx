"use client";

import { useMemo, useState } from "react";
import type { MunicipioCoverage } from "@/lib/scoring-data";
import {
  SearchFilter,
  createEmptyFilterState,
  matchesDataStatus,
  type FilterState,
} from "./SearchFilter";
import { CoverageTable, type SortDir, type SortKey } from "./CoverageTable";

interface CoveragePanelProps {
  rows: MunicipioCoverage[];
}

function compareByKey(
  a: MunicipioCoverage,
  b: MunicipioCoverage,
  key: SortKey,
  dir: SortDir,
): number {
  const mult = dir === "asc" ? 1 : -1;
  switch (key) {
    case "cobertura":
      return (a.porcentajeCobertura - b.porcentajeCobertura) * mult;
    case "nombre":
      return a.nombre.localeCompare(b.nombre, "es-AR") * mult;
    case "region":
      return a.region.localeCompare(b.region, "es-AR") * mult;
    case "ultimaActualizacion": {
      // null sorts to bottom always (regardless of dir)
      const aHas = a.ultimaActualizacion != null;
      const bHas = b.ultimaActualizacion != null;
      if (!aHas && !bHas) return 0;
      if (!aHas) return 1;
      if (!bHas) return -1;
      return (
        (a.ultimaActualizacion! < b.ultimaActualizacion! ? -1 : 1) * mult
      );
    }
    default:
      return 0;
  }
}

export function CoveragePanel({ rows }: CoveragePanelProps) {
  const [filters, setFilters] = useState<FilterState>(() => createEmptyFilterState());
  const [sortKey, setSortKey] = useState<SortKey>("cobertura");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSortChange(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Cobertura defaults desc; nombre/region/fecha defaults asc
      setSortDir(key === "cobertura" ? "desc" : "asc");
    }
  }

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const filteredRows = rows.filter((r) => {
      if (q) {
        const hay =
          r.nombre.toLowerCase().includes(q) ||
          r.partido.toLowerCase().includes(q);
        if (!hay) return false;
      }
      if (filters.regions.size > 0 && !filters.regions.has(r.region)) return false;
      if (!matchesDataStatus(r.dimensionsPresent, filters.dataStatus)) return false;
      return true;
    });
    const sorted = [...filteredRows].sort((a, b) =>
      compareByKey(a, b, sortKey, sortDir),
    );
    return sorted;
  }, [rows, filters, sortKey, sortDir]);

  return (
    <>
      <SearchFilter
        onChange={setFilters}
        showDataStatusFilter
        hidePoblacionFilter
      />
      <div className="mb-3 text-xs text-muted-foreground">
        Mostrando {filtered.length} de {rows.length} municipios
      </div>
      <CoverageTable
        rows={filtered}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
      />
    </>
  );
}
