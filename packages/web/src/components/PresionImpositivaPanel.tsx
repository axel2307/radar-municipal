"use client";

import { useMemo, useState } from "react";
import type { PresionImpositivaRankingEntry } from "@radar-municipal/core";
import {
  SearchFilter,
  createEmptyFilterState,
  matchesDataStatus,
  type FilterState,
} from "./SearchFilter";
import {
  PresionImpositivaTable,
  type CasoTestigoKey,
  type SortDir,
} from "./PresionImpositivaTable";
import { cn } from "@/lib/utils";

interface Props {
  rows: PresionImpositivaRankingEntry[];
}

const CASO_TABS: Array<{ key: CasoTestigoKey; label: string; desc: string }> = [
  {
    key: "indice",
    label: "Índice global",
    desc: "Percentil promedio entre los 4 casos testigo",
  },
  {
    key: "vivienda",
    label: "Vivienda",
    desc: "Tasa Servicios Generales / ABL anual para vivienda urbana con valuación fiscal $40M",
  },
  {
    key: "comercio",
    label: "Comercio",
    desc: "Tasa Inspección de Seguridad e Higiene anual para comercio minorista con IIBB $50M",
  },
  {
    key: "rural",
    label: "Rural",
    desc: "Tasa Vial Rural anual para 100 ha en zona productiva media",
  },
  {
    key: "construccion",
    label: "Construcción",
    desc: "Derechos de Construcción por 100 m² de vivienda unifamiliar",
  },
];

function getValorForSort(
  row: PresionImpositivaRankingEntry,
  caso: CasoTestigoKey,
): number | null {
  if (!row.data) return null;
  switch (caso) {
    case "vivienda":
      return row.data.montoVivienda.valor;
    case "comercio":
      return row.data.montoComercio.valor;
    case "rural":
      return row.data.montoRural.valor;
    case "construccion":
      return row.data.montoConstruccion.valor;
    case "indice":
      return row.indiceRelativo;
  }
}

export function PresionImpositivaPanel({ rows }: Props) {
  const [filters, setFilters] = useState<FilterState>(() => createEmptyFilterState());
  const [caso, setCaso] = useState<CasoTestigoKey>("indice");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const active = CASO_TABS.find((t) => t.key === caso) ?? CASO_TABS[0];

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const filteredRows = rows.filter((r) => {
      if (q) {
        const hay = r.nombre.toLowerCase().includes(q) || r.partido.toLowerCase().includes(q);
        if (!hay) return false;
      }
      if (filters.regions.size > 0 && !filters.regions.has(r.region)) return false;
      const present = r.data ? 1 : 0;
      if (!matchesDataStatus(present, filters.dataStatus)) return false;
      return true;
    });
    const mult = sortDir === "asc" ? 1 : -1;
    const sorted = [...filteredRows].sort((a, b) => {
      const va = getValorForSort(a, caso);
      const vb = getValorForSort(b, caso);
      // null sorts to bottom regardless of direction
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * mult;
    });
    return sorted;
  }, [rows, filters, caso, sortDir]);

  return (
    <>
      {/* Tabs de caso testigo */}
      <div className="mb-5 overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 rounded-lg border border-border bg-card p-1 sm:min-w-0">
          {CASO_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setCaso(t.key)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                caso === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{active.desc}</p>
      </div>

      <SearchFilter onChange={setFilters} showDataStatusFilter hidePoblacionFilter />

      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Mostrando {filtered.length} de {rows.length} municipios
        </span>
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="rounded border border-border bg-card px-2 py-1 hover:bg-muted"
        >
          Orden: {sortDir === "asc" ? "menor → mayor" : "mayor → menor"}
        </button>
      </div>

      <PresionImpositivaTable
        rows={filtered}
        caso={caso}
        sortDir={sortDir}
        onSortToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
      />
    </>
  );
}
