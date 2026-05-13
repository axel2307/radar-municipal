"use client";

import { useState } from "react";
import { Region } from "@radar-municipal/core";
import { cn } from "@/lib/utils";

export interface FilterState {
  query: string;
  regions: Set<string>;
  poblacion: Set<string>;
  scoreTier: Set<string>;
  /** Filtro por estado de datos: "piloto" (13 con datos) | "sin-datos" (122 sin datos) */
  dataStatus: Set<string>;
}

export function createEmptyFilterState(): FilterState {
  return {
    query: "",
    regions: new Set(),
    poblacion: new Set(),
    scoreTier: new Set(),
    dataStatus: new Set(),
  };
}

const REGION_LABELS: Record<string, string> = {
  [Region.AMBA]: "AMBA",
  [Region.CONURBANO_SUR]: "Conurbano Sur",
  [Region.CONURBANO_NORTE]: "Conurbano Norte",
  [Region.CONURBANO_OESTE]: "Conurbano Oeste",
  [Region.INTERIOR]: "Interior",
  [Region.COSTA_ATLANTICA]: "Costa Atlantica",
};

const POBLACION_OPTIONS = [
  { key: "<50k", label: "< 50k hab." },
  { key: "50k-200k", label: "50k - 200k hab." },
  { key: ">200k", label: "> 200k hab." },
];

const SCORE_TIER_OPTIONS = [
  { key: "alto", label: "Alto (\u226570)" },
  { key: "medio", label: "Medio (40-69)" },
  { key: "bajo", label: "Bajo (<40)" },
];

const DATA_STATUS_OPTIONS = [
  { key: "piloto", label: "Con datos (piloto)" },
  { key: "sin-datos", label: "Sin datos" },
];

interface SearchFilterProps {
  onChange: (filters: FilterState) => void;
  showScoreFilter?: boolean;
  /** Mostrar filtro de estado de datos (piloto/sin-datos) */
  showDataStatusFilter?: boolean;
  /** Ocultar el filtro de población (útil en panel de cobertura) */
  hidePoblacionFilter?: boolean;
}

export function SearchFilter({
  onChange,
  showScoreFilter = false,
  showDataStatusFilter = false,
  hidePoblacionFilter = false,
}: SearchFilterProps) {
  const [query, setQuery] = useState("");
  const [regions, setRegions] = useState<Set<string>>(new Set());
  const [poblacion, setPoblacion] = useState<Set<string>>(new Set());
  const [scoreTier, setScoreTier] = useState<Set<string>>(new Set());
  const [dataStatus, setDataStatus] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  function emitChange(next: Partial<FilterState>) {
    const state: FilterState = {
      query: next.query ?? query,
      regions: next.regions ?? regions,
      poblacion: next.poblacion ?? poblacion,
      scoreTier: next.scoreTier ?? scoreTier,
      dataStatus: next.dataStatus ?? dataStatus,
    };
    onChange(state);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    emitChange({ query: value });
  }

  function toggleSet(
    current: Set<string>,
    key: string,
    setter: (s: Set<string>) => void,
    field: keyof FilterState,
  ) {
    const next = new Set(current);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setter(next);
    emitChange({ [field]: next });
  }

  const hasActiveFilters =
    regions.size > 0 ||
    poblacion.size > 0 ||
    scoreTier.size > 0 ||
    dataStatus.size > 0;

  return (
    <div className="mb-6 space-y-3">
      {/* Search input — Sprint 43B: aria-label explícito (placeholder no es
          label accesible para screen readers) + SVG decorativo aria-hidden. */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="search"
          aria-label="Buscar municipio"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Buscar municipio..."
          className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setFiltersOpen(!filtersOpen)}
        aria-expanded={filtersOpen}
        aria-controls="search-filters-panel"
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors sm:hidden",
          hasActiveFilters
            ? "border-primary bg-primary/10 text-primary"
            : "bg-card text-muted-foreground hover:bg-muted",
        )}
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
          />
        </svg>
        Filtros
        {hasActiveFilters && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none text-primary-foreground">
            {regions.size + poblacion.size + scoreTier.size + dataStatus.size}
          </span>
        )}
        <svg
          className={cn("h-3 w-3 transition-transform", filtersOpen && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Filter chips - always visible on desktop, toggled on mobile */}
      <div
        id="search-filters-panel"
        className={cn("space-y-3", filtersOpen ? "block" : "hidden sm:block")}
      >
        {/* Region chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground min-w-[60px]">Region:</span>
          {Object.entries(REGION_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSet(regions, key, setRegions, "regions")}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                regions.has(key)
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Population chips */}
        {!hidePoblacionFilter && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground min-w-[60px]">Poblacion:</span>
            {POBLACION_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleSet(poblacion, opt.key, setPoblacion, "poblacion")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  poblacion.has(opt.key)
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Data status chips */}
        {showDataStatusFilter && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground min-w-[60px]">Datos:</span>
            {DATA_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleSet(dataStatus, opt.key, setDataStatus, "dataStatus")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  dataStatus.has(opt.key)
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Score tier chips */}
        {showScoreFilter && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground min-w-[60px]">Score:</span>
            {SCORE_TIER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleSet(scoreTier, opt.key, setScoreTier, "scoreTier")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  scoreTier.has(opt.key)
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setRegions(new Set());
              setPoblacion(new Set());
              setScoreTier(new Set());
              setDataStatus(new Set());
              emitChange({
                regions: new Set(),
                poblacion: new Set(),
                scoreTier: new Set(),
                dataStatus: new Set(),
              });
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}

/** Check if a municipio's population falls within selected ranges */
export function matchesPoblacion(poblacion: number | null, ranges: Set<string>): boolean {
  if (ranges.size === 0) return true;
  if (poblacion == null) return false;
  for (const range of ranges) {
    if (range === "<50k" && poblacion < 50000) return true;
    if (range === "50k-200k" && poblacion >= 50000 && poblacion <= 200000) return true;
    if (range === ">200k" && poblacion > 200000) return true;
  }
  return false;
}

/** Check if a score falls within selected tiers */
export function matchesScoreTier(score: number, tiers: Set<string>): boolean {
  if (tiers.size === 0) return true;
  for (const tier of tiers) {
    if (tier === "alto" && score >= 70) return true;
    if (tier === "medio" && score >= 40 && score < 70) return true;
    if (tier === "bajo" && score < 40) return true;
  }
  return false;
}

/** Check if a municipio matches the data-status filter.
 * - "piloto": municipio has at least 1 dimension con data
 * - "sin-datos": municipio has 0 dimensions con data
 */
export function matchesDataStatus(
  dimensionsPresent: number,
  statuses: Set<string>,
): boolean {
  if (statuses.size === 0) return true;
  if (statuses.has("piloto") && dimensionsPresent > 0) return true;
  if (statuses.has("sin-datos") && dimensionsPresent === 0) return true;
  return false;
}
