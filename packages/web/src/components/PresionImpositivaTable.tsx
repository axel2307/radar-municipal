"use client";

import Link from "next/link";
import type { PresionImpositivaRankingEntry } from "@radar-municipal/core";
import { cn } from "@/lib/utils";

export type CasoTestigoKey = "vivienda" | "comercio" | "rural" | "construccion" | "indice";
export type SortDir = "asc" | "desc";

interface Props {
  rows: PresionImpositivaRankingEntry[];
  caso: CasoTestigoKey;
  sortDir: SortDir;
  onSortToggle: () => void;
}

function formatArs(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function getValor(row: PresionImpositivaRankingEntry, caso: CasoTestigoKey): number | null {
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

function indiceBadgeClass(indice: number | null): string {
  if (indice == null) return "bg-muted text-muted-foreground";
  if (indice >= 70) return "bg-red-100 text-red-800";
  if (indice >= 40) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

export function PresionImpositivaTable({ rows, caso, sortDir, onSortToggle }: Props) {
  const columnLabel = {
    vivienda: "Vivienda (ABL/TSG)",
    comercio: "Comercio (TISH)",
    rural: "Rural (Vial 100 ha)",
    construccion: "Construcción (100 m²)",
    indice: "Índice relativo",
  }[caso];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Municipio</th>
              <th className="px-3 py-2 text-left font-medium">Región</th>
              <th className="px-3 py-2 text-right font-medium">
                <button
                  type="button"
                  onClick={onSortToggle}
                  className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted"
                >
                  {columnLabel}
                  <span aria-hidden>{sortDir === "asc" ? "↑" : "↓"}</span>
                </button>
              </th>
              <th className="px-3 py-2 text-right font-medium">Índice relativo</th>
              <th className="px-3 py-2 text-left font-medium">Ord. fiscal</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No hay municipios que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const valor = getValor(row, caso);
                const indice = row.indiceRelativo;
                const isPiloto = row.esPiloto;
                return (
                  <tr
                    key={row.municipioId}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {isPiloto ? (
                        <Link
                          href={`/municipios/${row.municipioId}`}
                          className="text-primary hover:underline"
                        >
                          {row.nombre}
                        </Link>
                      ) : (
                        <span className="text-foreground">{row.nombre}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.region}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {caso === "indice" ? (
                        valor != null ? `${valor}` : <span className="text-muted-foreground">—</span>
                      ) : (
                        formatArs(valor)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={cn(
                          "inline-flex min-w-[2.5rem] justify-center rounded px-2 py-0.5 text-xs font-medium tabular-nums",
                          indiceBadgeClass(indice),
                        )}
                      >
                        {indice != null ? indice : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {row.data ? (
                        row.data.publicaOrdenanzaFiscal ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            ✓ publicada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            no detectada
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">sin datos</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
