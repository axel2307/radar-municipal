"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Municipio } from "@radar-municipal/core";
import { formatNumber } from "@/lib/utils";
import {
  SearchFilter,
  createEmptyFilterState,
  matchesPoblacion,
  type FilterState,
} from "@/components/SearchFilter";

interface FilterableMunicipiosProps {
  pilotos: Municipio[];
  otros: Municipio[];
}

function filterMunicipios(list: Municipio[], filters: FilterState): Municipio[] {
  const q = filters.query.toLowerCase().trim();

  return list.filter((m) => {
    if (q && !m.nombre.toLowerCase().includes(q)) {
      return false;
    }

    if (filters.regions.size > 0 && !filters.regions.has(m.region)) {
      return false;
    }

    if (!matchesPoblacion(m.poblacion, filters.poblacion)) {
      return false;
    }

    return true;
  });
}

export function FilterableMunicipios({ pilotos, otros }: FilterableMunicipiosProps) {
  const [filters, setFilters] = useState<FilterState>(createEmptyFilterState);

  const filteredPilotos = useMemo(() => filterMunicipios(pilotos, filters), [pilotos, filters]);
  const filteredOtros = useMemo(() => filterMunicipios(otros, filters), [otros, filters]);

  const totalOriginal = pilotos.length + otros.length;
  const totalFiltered = filteredPilotos.length + filteredOtros.length;
  const isFiltered = filters.query || filters.regions.size > 0 || filters.poblacion.size > 0;

  return (
    <>
      <SearchFilter onChange={setFilters} showScoreFilter={false} />

      {isFiltered && (
        <p className="mb-4 text-sm text-muted-foreground">
          Mostrando {totalFiltered} de {totalOriginal} municipios
        </p>
      )}

      {filteredPilotos.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4">
            Municipios piloto ({filteredPilotos.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-12">
            {filteredPilotos.map((m) => (
              <Link
                key={m.id}
                href={`/municipios/${m.id}`}
                className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <h3 className="font-semibold text-primary">{m.nombre}</h3>
                <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                  <span>{formatNumber(m.poblacion)} hab.</span>
                  <span>{formatNumber(m.superficieKm2)} km2</span>
                </div>
                <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Datos completos
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {filteredOtros.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4">
            Todos los partidos ({filteredOtros.length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Nombre</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground hidden sm:table-cell">Partido</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground hidden sm:table-cell">Region</th>
                  <th className="px-4 py-2 text-right font-semibold text-muted-foreground hidden md:table-cell">Poblacion</th>
                  <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-20">Ver</th>
                </tr>
              </thead>
              <tbody>
                {filteredOtros.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2">
                      <Link href={`/municipios/${m.id}`} className="text-primary hover:underline font-medium">
                        {m.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">{m.partido}</td>
                    <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">{m.region}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground hidden md:table-cell">{formatNumber(m.poblacion)}</td>
                    <td className="px-4 py-2 text-center">
                      <Link href={`/municipios/${m.id}`} className="text-xs text-primary hover:underline">
                        Ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {totalFiltered === 0 && isFiltered && (
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">No se encontraron municipios con los filtros seleccionados.</p>
        </div>
      )}
    </>
  );
}
