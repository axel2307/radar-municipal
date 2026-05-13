import type { MunicipioDetail } from "@/lib/scoring-data";
import { DimensionCard } from "@/components/DimensionCard";
import { CriteriaTable } from "@/components/CriteriaTable";
import { cn } from "@/lib/utils";

/**
 * Sprint 47B — Sección "Infraestructura y Movilidad". Sprint 41D fixed
 * el color a violet (era purple). Por ahora solo "Seguridad vial" — futuros
 * sprints pueden agregar más dimensiones acá.
 */
export function InfraSection({ detail }: { detail: MunicipioDetail }) {
  return (
    <div id="infra" className="scroll-target">
      <h2 className="text-lg font-semibold text-violet-700 mb-4">
        Infraestructura y Movilidad
      </h2>

      {detail.seguridadVial && (
        <DimensionCard
          title="Seguridad vial"
          score={detail.seguridadVial.scoreTotal}
          color="purple"
        >
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
              <p className="text-xs text-muted-foreground">
                Siniestros / 100k hab
              </p>
              <p
                className={cn(
                  "text-xl font-semibold",
                  detail.seguridadVial.siniestrosPer100k != null
                    ? detail.seguridadVial.siniestrosPer100k <= 8
                      ? "text-score-high"
                      : detail.seguridadVial.siniestrosPer100k <= 12
                        ? "text-score-mid"
                        : "text-score-low"
                    : "",
                )}
              >
                {detail.seguridadVial.siniestrosPer100k != null
                  ? detail.seguridadVial.siniestrosPer100k.toFixed(1)
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
              <p className="text-xs text-muted-foreground">km pavimento / km²</p>
              <p className="text-xl font-semibold">
                {detail.seguridadVial.kmPavimentadoPerKm2 != null
                  ? detail.seguridadVial.kmPavimentadoPerKm2.toFixed(2)
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
              <p className="text-xs text-muted-foreground">Ciclovías</p>
              <p className="text-xl font-semibold">
                {detail.seguridadVial.kmCiclovias != null
                  ? `${detail.seguridadVial.kmCiclovias.toFixed(1)} km`
                  : "—"}
              </p>
            </div>
          </div>
          <CriteriaTable
            criterios={detail.seguridadVial.criterios}
            totalLabel="Total seguridad vial"
            totalScore={detail.seguridadVial.scoreTotal}
            type="normalized"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Fuente: ANSV, OSM, relevamiento municipal.{" "}
            {detail.seguridadVial.notas}
          </p>
        </DimensionCard>
      )}
    </div>
  );
}
