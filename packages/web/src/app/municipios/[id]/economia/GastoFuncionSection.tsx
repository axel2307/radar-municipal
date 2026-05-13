import type { MunicipioDetail } from "@/lib/scoring-data";
import { SpendingBreakdown } from "@/components/SpendingBreakdown";
import { cn } from "@/lib/utils";

/**
 * Sprint 47D — Sección "Composición del gasto por función" de /economia.
 * SpendingBreakdown chart + 4 cards con porcentajes + HHI diversificación.
 */
export function GastoFuncionSection({
  gastoFuncion,
}: {
  gastoFuncion: NonNullable<MunicipioDetail["gastoFuncion"]>;
}) {
  const otrosPct = Math.max(
    0,
    100 -
      (gastoFuncion.pctServiciosSociales ?? 0) -
      (gastoFuncion.pctServiciosEconomicos ?? 0) -
      (gastoFuncion.pctAdminGubernamental ?? 0),
  );

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">
        Composición del gasto por función
      </h2>
      <div className="grid gap-6 lg:grid-cols-2 mb-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <SpendingBreakdown
            data={[
              {
                nombre: "Servicios sociales",
                pct: gastoFuncion.pctServiciosSociales ?? 0,
              },
              {
                nombre: "Servicios económicos",
                pct: gastoFuncion.pctServiciosEconomicos ?? 0,
              },
              {
                nombre: "Administración",
                pct: gastoFuncion.pctAdminGubernamental ?? 0,
              },
              { nombre: "Otros / Deuda", pct: otrosPct },
            ]}
            height={260}
          />
        </div>
        <div className="grid gap-3 content-start">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Servicios sociales</p>
            <p className="text-lg font-semibold">
              {gastoFuncion.pctServiciosSociales?.toFixed(1) ?? "—"}%
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Servicios económicos</p>
            <p className="text-lg font-semibold">
              {gastoFuncion.pctServiciosEconomicos?.toFixed(1) ?? "—"}%
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">
              Administración gubernamental
            </p>
            <p
              className={cn(
                "text-lg font-semibold",
                gastoFuncion.pctAdminGubernamental != null &&
                  gastoFuncion.pctAdminGubernamental > 35
                  ? "text-score-low"
                  : "",
              )}
            >
              {gastoFuncion.pctAdminGubernamental?.toFixed(1) ?? "—"}%
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">HHI (diversificación)</p>
            <p className="text-lg font-semibold">
              {gastoFuncion.diversificacionHhi?.toFixed(3) ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              Menor = más diversificado
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
