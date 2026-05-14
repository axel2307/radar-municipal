"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PresionImpositivaRankingEntry } from "@radar-municipal/core";
import { cn } from "@/lib/utils";
import {
  PERFILES,
  type PerfilKey,
  rankingPorPerfil,
  ahorroPotencial,
  getTasaMonto,
  type TasaKey,
} from "./radicacion-helpers";

/**
 * Sprint 49 — Calculadora "¿Dónde me conviene radicarme?"
 *
 * 4 perfiles preset (Familia / Comerciante / Empresa con obra /
 * Productor rural). Cada uno suma las tasas municipales aplicables y
 * rankea los municipios del más barato al más caro.
 *
 * Limitaciones declaradas en el disclaimer:
 *   - Asume parámetros default (vivienda $40M, IIBB $50M, 100ha, 100m²)
 *   - Montos son referencia (confianza baja)
 *   - Solo cubre tasas MUNICIPALES — no patente auto (provincial), IIBB
 *     (provincial), IVA/Ganancias (nacional)
 */
interface Props {
  rows: PresionImpositivaRankingEntry[];
}

function formatArs(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

const TASA_LABEL: Record<TasaKey, string> = {
  vivienda: "Vivienda (ABL/TSG)",
  comercio: "Local (TISH)",
  rural: "Vial Rural (100 ha)",
  construccion: "Construcción (100 m²)",
};

export function RadicacionFinder({ rows }: Props) {
  const [perfilKey, setPerfilKey] = useState<PerfilKey>("familia");
  const [filterRegion, setFilterRegion] = useState<string | null>(null);

  const perfil = PERFILES.find((p) => p.key === perfilKey) ?? PERFILES[0];

  const baseRanking = useMemo(
    () => rankingPorPerfil(rows, perfil),
    [rows, perfil],
  );

  const ranking = useMemo(() => {
    if (!filterRegion) return baseRanking;
    return baseRanking.filter((r) => r.region === filterRegion);
  }, [baseRanking, filterRegion]);

  const regiones = useMemo(() => {
    const set = new Set<string>();
    for (const r of baseRanking) set.add(r.region);
    return [...set].sort();
  }, [baseRanking]);

  const ahorro = useMemo(() => ahorroPotencial(ranking), [ranking]);

  const topBaratos = ranking.slice(0, 3);
  const topCaros = [...ranking].slice(-3).reverse();

  return (
    <section
      aria-labelledby="radicacion-heading"
      className="mb-10 rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-blue-50/40 p-5 sm:p-6"
    >
      <header className="mb-5">
        <h2
          id="radicacion-heading"
          className="text-xl font-bold text-foreground"
        >
          ¿Dónde te conviene radicarte?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí tu perfil. Sumamos las tasas municipales que te aplican y
          rankeamos los municipios del piloto.
        </p>
      </header>

      {/* Perfiles toggle */}
      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {PERFILES.map((p) => {
          const active = p.key === perfilKey;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPerfilKey(p.key)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-all",
                active
                  ? "border-emerald-500 bg-white shadow-sm"
                  : "border-border bg-white/60 hover:border-emerald-300 hover:bg-white",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>
                  {p.emoji}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    active ? "text-emerald-900" : "text-foreground",
                  )}
                >
                  {p.shortLabel}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {p.tasas
                  .map((t) =>
                    t === "vivienda"
                      ? "ABL/TSG"
                      : t === "comercio"
                        ? "TISH"
                        : t === "rural"
                          ? "Vial Rural"
                          : "Construcción",
                  )
                  .join(" + ")}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mb-5 text-sm text-muted-foreground">
        <strong className="text-foreground">{perfil.label}.</strong>{" "}
        {perfil.description}
      </p>

      {/* Filtro por región */}
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Región:</span>
        <button
          type="button"
          onClick={() => setFilterRegion(null)}
          className={cn(
            "rounded-full px-2.5 py-1 font-medium transition-colors",
            filterRegion === null
              ? "bg-emerald-600 text-white"
              : "bg-white text-muted-foreground border border-border hover:bg-muted",
          )}
        >
          Todas
        </button>
        {regiones.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setFilterRegion(r)}
            className={cn(
              "rounded-full px-2.5 py-1 font-medium transition-colors",
              filterRegion === r
                ? "bg-emerald-600 text-white"
                : "bg-white text-muted-foreground border border-border hover:bg-muted",
            )}
          >
            {r.replace(/_/g, " ").toLowerCase()}
          </button>
        ))}
      </div>

      {/* Resultados */}
      {ranking.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-6 text-center text-sm text-muted-foreground">
          No hay municipios con datos completos para este perfil
          {filterRegion ? " en esa región" : ""}.
        </div>
      ) : (
        <>
          {/* Top 3 más baratos */}
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Más conviene
            </h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {topBaratos.map((r, i) => (
                <Link
                  key={r.municipioId}
                  href={`/municipios/${r.municipioId}`}
                  className={cn(
                    "rounded-lg border bg-white p-3 hover:shadow-sm transition-all",
                    i === 0
                      ? "border-emerald-400 ring-2 ring-emerald-200"
                      : "border-emerald-200",
                  )}
                >
                  <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
                    <span className="font-semibold">#{i + 1}</span>
                    <span className="text-muted-foreground">
                      {r.region.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>
                  <p className="font-bold text-foreground">{r.nombre}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">
                    {formatArs(r.total)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      / año
                    </span>
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Top 3 más caros */}
          {ranking.length > 3 && (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                Menos conviene
              </h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {topCaros.map((r) => {
                  const pos = ranking.findIndex(
                    (x) => x.municipioId === r.municipioId,
                  );
                  return (
                    <Link
                      key={r.municipioId}
                      href={`/municipios/${r.municipioId}`}
                      className="rounded-lg border border-red-200 bg-white p-3 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between text-xs text-red-700 mb-1">
                        <span className="font-semibold">#{pos + 1}</span>
                        <span className="text-muted-foreground">
                          {r.region.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </div>
                      <p className="font-bold text-foreground">{r.nombre}</p>
                      <p className="mt-1 text-lg font-bold tabular-nums text-red-700">
                        {formatArs(r.total)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          / año
                        </span>
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ahorro potencial */}
          {ahorro && ahorro.absoluto > 0 && (
            <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-100/60 p-4 text-sm">
              <p>
                <strong className="text-emerald-900">
                  Ahorro potencial:
                </strong>{" "}
                Radicándote en{" "}
                <strong className="text-foreground">
                  {ahorro.barato.nombre}
                </strong>{" "}
                en lugar de{" "}
                <strong className="text-foreground">
                  {ahorro.caro.nombre}
                </strong>{" "}
                pagás{" "}
                <span className="font-bold text-emerald-700">
                  {formatArs(ahorro.absoluto)} menos por año
                </span>{" "}
                <span className="text-muted-foreground">
                  (−{ahorro.porcentaje.toFixed(0)}% sobre el más caro)
                </span>
                .
              </p>
            </div>
          )}

          {/* Ranking completo (tabla) */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-emerald-700 hover:underline">
              Ver ranking completo ({ranking.length} municipios)
            </summary>
            <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Municipio
                    </th>
                    {perfil.tasas.map((t) => (
                      <th
                        key={t}
                        className="px-3 py-2 text-right font-medium hidden sm:table-cell"
                      >
                        {TASA_LABEL[t]}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium">
                      Total anual
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => {
                    const row = rows.find(
                      (x) => x.municipioId === r.municipioId,
                    );
                    return (
                      <tr
                        key={r.municipioId}
                        className="border-t border-border hover:bg-muted/20"
                      >
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/municipios/${r.municipioId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {r.nombre}
                          </Link>
                        </td>
                        {perfil.tasas.map((t) => (
                          <td
                            key={t}
                            className="px-3 py-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell"
                          >
                            {row
                              ? formatArs(getTasaMonto(row, t))
                              : "—"}
                          </td>
                        ))}
                        <td
                          className={cn(
                            "px-3 py-2 text-right font-semibold tabular-nums",
                            i === 0 && "text-emerald-700",
                            i === ranking.length - 1 && "text-red-700",
                          )}
                        >
                          {formatArs(r.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      {/* Disclaimer */}
      <p className="mt-5 text-[11px] text-muted-foreground leading-relaxed">
        Los totales asumen parámetros default: vivienda con valuación fiscal{" "}
        <strong>$40M</strong>, comercio con IIBB anual{" "}
        <strong>$50M</strong>, rural{" "}
        <strong>100 ha zona productiva media</strong>, construcción{" "}
        <strong>100 m² vivienda categoría B</strong>. Valores de referencia
        — <strong>confianza baja</strong>, ver banner metodológico arriba.
        No usar para decisiones legales.
      </p>
    </section>
  );
}
