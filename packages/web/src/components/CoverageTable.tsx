"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import type { MunicipioCoverage } from "@/lib/scoring-data";
import { CoverageIndicators } from "./CoverageIndicators";
import { cn } from "@/lib/utils";

export type SortKey = "cobertura" | "nombre" | "region" | "ultimaActualizacion";
export type SortDir = "asc" | "desc";

interface CoverageTableProps {
  rows: MunicipioCoverage[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSortChange: (key: SortKey) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(dias: number | null): string {
  if (dias == null) return "";
  if (dias === 0) return "hoy";
  if (dias === 1) return "hace 1 día";
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.round(dias / 30);
  if (meses < 12) return `hace ${meses} mes${meses !== 1 ? "es" : ""}`;
  const anios = Math.round(dias / 365);
  return `hace ${anios} año${anios !== 1 ? "s" : ""}`;
}

function coverageColor(pct: number): string {
  if (pct >= 70) return "bg-score-high";
  if (pct >= 40) return "bg-score-mid";
  if (pct > 0) return "bg-score-low";
  return "bg-muted-foreground/20";
}

function regionLabel(region: string): string {
  return region.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CoverageTable({
  rows,
  sortKey,
  sortDir,
  onSortChange,
}: CoverageTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="w-10 px-3 py-2">#</th>
            <SortableTh label="Municipio" active={sortKey === "nombre"} dir={sortDir} onClick={() => onSortChange("nombre")} />
            <SortableTh label="Región" active={sortKey === "region"} dir={sortDir} onClick={() => onSortChange("region")} className="hidden md:table-cell" />
            <SortableTh label="Cobertura" active={sortKey === "cobertura"} dir={sortDir} onClick={() => onSortChange("cobertura")} />
            <th className="px-3 py-2 hidden lg:table-cell">Dimensiones</th>
            <SortableTh label="Última actualización" active={sortKey === "ultimaActualizacion"} dir={sortDir} onClick={() => onSortChange("ultimaActualizacion")} />
            <th className="w-8 px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isExpandable = row.esPiloto && row.dimensionsPresent > 0;
            const isExpanded = expanded.has(row.municipioId);
            return (
              <Fragment key={row.municipioId}>
                <tr
                  className={cn(
                    "border-b border-border last:border-0",
                    row.dimensionsPresent === 0 && "bg-muted/20",
                  )}
                >
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/municipios/${row.municipioId}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {row.nombre}
                    </Link>
                    {row.partido !== row.nombre && (
                      <div className="text-xs text-muted-foreground">
                        Partido: {row.partido}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                    {regionLabel(row.region)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-[150px]">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full transition-all", coverageColor(row.porcentajeCobertura))}
                          style={{ width: `${row.porcentajeCobertura}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums text-foreground">
                        {row.porcentajeCobertura}%
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {row.dimensionsPresent}/{row.dimensionsTotal}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    <CoverageIndicators details={row.dimensionDetails} />
                  </td>
                  <td className="px-3 py-2.5">
                    {row.ultimaActualizacion ? (
                      <>
                        <div className="text-foreground tabular-nums">
                          {formatDate(row.ultimaActualizacion)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatRelative(row.diasDesdeActualizacion)}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">sin datos</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {isExpandable ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(row.municipioId)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={isExpanded ? "Colapsar" : "Expandir"}
                      >
                        <svg
                          className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                      </button>
                    ) : null}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-b border-border bg-muted/30">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Última actualización por dimensión
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {row.dimensionDetails.map((d) => (
                          <div
                            key={d.slug}
                            className={cn(
                              "rounded-md border border-border bg-card p-3",
                              !d.present && "opacity-60",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-block h-2 w-2 rounded-full",
                                  d.present ? "bg-score-high" : "bg-muted-foreground/30",
                                )}
                              />
                              <span className="font-medium text-foreground text-sm">
                                {d.label}
                              </span>
                              {d.score !== null && (
                                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                                  {Math.round(d.score)}
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 text-xs text-muted-foreground">
                              {d.ultimaFecha ? (
                                <>
                                  <span className="tabular-nums text-foreground">
                                    {formatDate(d.ultimaFecha)}
                                  </span>
                                  {d.fuenteNota && (
                                    <span className="ml-1">· {d.fuenteNota}</span>
                                  )}
                                </>
                              ) : (
                                <span>sin datos</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                No hay municipios que coincidan con los filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th className={cn("px-3 py-2", className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-1 uppercase tracking-wide hover:text-foreground transition-colors",
          active ? "text-foreground" : "",
        )}
      >
        {label}
        {active && (
          <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>
        )}
      </button>
    </th>
  );
}
