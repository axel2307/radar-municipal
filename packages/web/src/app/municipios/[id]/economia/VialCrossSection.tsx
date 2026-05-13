import type { getVialCrossMetrics } from "@/lib/scoring-data";
import { formatArs } from "./economia-helpers";

type VialCross = NonNullable<ReturnType<typeof getVialCrossMetrics>>;

/**
 * Sprint 47D — Sección "Pesos por km de red vial" de /economia.
 * Cross fiscal × OSM. 4 KPI cards + nota metodológica.
 */
export function VialCrossSection({ vialCross }: { vialCross: VialCross }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Pesos por km de red{" "}
          {vialCross.denominador === "rural" ? "rural" : "vial (total)"}
        </h2>
        <span className="text-xs text-muted-foreground">Cruce RAFAM × OSM</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground max-w-3xl">
        Aproxima cuántos pesos del gasto en <em>servicios económicos</em>{" "}
        ejecuta el municipio por kilómetro de red{" "}
        {vialCross.denominador === "rural"
          ? "rural"
          : "total (incluye conectores urbanos)"}
        . Indicador comparativo entre partidos con la misma cobertura.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50/30 p-4">
          <p className="text-xs text-muted-foreground">
            Pesos por km{" "}
            <span className="font-medium text-amber-700">
              ({vialCross.denominador})
            </span>
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {formatArs(vialCross.pesosPorKm)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              / km
            </span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Año fiscal {vialCross.anioFiscal}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Gasto en servicios económicos
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {formatArs(vialCross.gastoServiciosEconomicos)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {vialCross.pctServiciosEconomicos.toFixed(1)}% del gasto total
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Gasto total</p>
          <p className="text-xl font-semibold tabular-nums">
            {formatArs(vialCross.gastoTotal)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Ejecutado {vialCross.anioFiscal}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Red {vialCross.denominador} OSM
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {vialCross.kmDenominador.toLocaleString("es-AR")}{" "}
            <span className="text-sm font-normal text-muted-foreground">km</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Denominador efectivo
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-[11px] text-amber-900 leading-relaxed">
        <strong>Nota metodológica:</strong> {vialCross.notas}
      </div>
    </section>
  );
}
