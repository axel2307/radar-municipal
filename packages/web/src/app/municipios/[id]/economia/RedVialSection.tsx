import type { RedVialMunicipal } from "@radar-municipal/core";

/**
 * Sprint 47D — Sección "Red vial estimada" de /economia.
 * 4 KPI cards (km rural, total, tracks, ways) + tabla por tipo OSM +
 * disclaimer ODbL.
 */
export function RedVialSection({ redVial }: { redVial: RedVialMunicipal }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Red vial estimada</h2>
        <span className="text-xs text-muted-foreground">
          Fuente: OpenStreetMap · ODbL
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground max-w-3xl">
        Kilómetros de carreteras en el partido derivados de OpenStreetMap.
        Útil como denominador para mantenimiento vial per km. Cobertura OSM
        heterogénea entre partidos — interpretar como orden de magnitud, no
        precisión catastral.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50/30 p-4">
          <p className="text-xs text-muted-foreground">
            Red rural (track + unclassified)
          </p>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {redVial.kmRuralEstimado.toLocaleString("es-AR")}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              km
            </span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Caminos de tierra + sin clasificar
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Red total</p>
          <p className="text-xl font-semibold tabular-nums">
            {redVial.kmTotalEstimado.toLocaleString("es-AR")}{" "}
            <span className="text-sm font-normal text-muted-foreground">km</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Track..Primary</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Tracks (caminos de tierra)
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {redVial.km.track.toLocaleString("es-AR")}{" "}
            <span className="text-sm font-normal text-muted-foreground">km</span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Ways procesados</p>
          <p className="text-xl font-semibold tabular-nums">
            {redVial.waysProcesados.toLocaleString("es-AR")}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Segmentos OSM en bbox
          </p>
        </div>
      </div>

      {/* Tabla detalle por tipo OSM */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Tipo OSM</th>
              <th className="px-3 py-2 text-right font-medium">Km</th>
              <th className="px-3 py-2 font-medium">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["track", "Camino rural / tierra"],
                ["unclassified", "Sin clasificación oficial"],
                ["tertiary", "Ruta terciaria"],
                ["secondary", "Ruta secundaria provincial"],
                ["primary", "Ruta primaria nacional/provincial"],
              ] as const
            ).map(([key, desc]) => (
              <tr
                key={key}
                className="border-b border-border last:border-0"
              >
                <td className="px-3 py-2 font-mono text-xs">{key}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {redVial.km[key].toLocaleString("es-AR")}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Datos extraídos vía Overpass API el{" "}
        <time dateTime={redVial.extractedAt}>
          {new Intl.DateTimeFormat("es-AR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(redVial.extractedAt))}
        </time>
        . OSM data ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          OpenStreetMap contributors
        </a>{" "}
        bajo licencia ODbL.
      </p>
    </section>
  );
}
