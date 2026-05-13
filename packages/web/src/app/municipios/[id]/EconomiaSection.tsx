import Link from "next/link";
import type { MunicipioDetail } from "@/lib/scoring-data";
import { DimensionCard } from "@/components/DimensionCard";
import { CriteriaTable } from "@/components/CriteriaTable";
import { SpendingBreakdown } from "@/components/SpendingBreakdown";
import { formatNumber, cn } from "@/lib/utils";

/**
 * Sprint 47B — Sección "Economía y Finanzas". Indicadores fiscales,
 * gasto por función con SpendingBreakdown chart, economía local.
 * Link a /municipios/[id]/economia para el detalle ampliado (deuda + vial).
 */
export function EconomiaSection({
  detail,
  id,
}: {
  detail: MunicipioDetail;
  id: string;
}) {
  return (
    <div id="economia" className="scroll-target">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-amber-700">
          Economía y Finanzas
        </h2>
        <Link
          href={`/municipios/${id}/economia`}
          className="text-xs text-amber-600 hover:underline"
        >
          Ver detalle completo →
        </Link>
      </div>

      {detail.fiscal && (
        <DimensionCard
          title="Indicadores fiscales"
          score={detail.fiscal.scoreTotal}
          color="amber"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Gasto per cápita</p>
              <p className="text-lg font-semibold">
                {detail.fiscal.gastoPcapita != null
                  ? `$${formatNumber(Math.round(detail.fiscal.gastoPcapita))}`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">$/habitante/año</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Deuda per cápita</p>
              <p className="text-lg font-semibold">
                {detail.fiscal.deudaPcapita != null
                  ? `$${formatNumber(Math.round(detail.fiscal.deudaPcapita))}`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">$/habitante</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">% Personal</p>
              <p
                className={cn(
                  "text-lg font-semibold",
                  detail.fiscal.pctPersonal != null
                    ? detail.fiscal.pctPersonal < 55
                      ? "text-score-high"
                      : detail.fiscal.pctPersonal < 65
                        ? "text-score-mid"
                        : "text-score-low"
                    : "",
                )}
              >
                {detail.fiscal.pctPersonal != null
                  ? `${detail.fiscal.pctPersonal.toFixed(1)}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">% Capital</p>
              <p
                className={cn(
                  "text-lg font-semibold",
                  detail.fiscal.pctCapital != null
                    ? detail.fiscal.pctCapital >= 15
                      ? "text-score-high"
                      : detail.fiscal.pctCapital >= 10
                        ? "text-score-mid"
                        : "text-score-low"
                    : "",
                )}
              >
                {detail.fiscal.pctCapital != null
                  ? `${detail.fiscal.pctCapital.toFixed(1)}%`
                  : "—"}
              </p>
            </div>
          </div>
          <CriteriaTable
            criterios={detail.fiscal.criterios}
            totalLabel="Total fiscal"
            totalScore={detail.fiscal.scoreTotal}
            type="normalized"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {detail.fiscal.notas}
          </p>
          {detail.fiscal.procedencia.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">Fuentes:</span>{" "}
              {[
                ...new Set(
                  detail.fiscal.procedencia
                    .filter((p) => p.capa)
                    .map((p) => `${p.organismo} (${p.capa})`),
                ),
              ].join(", ")}
            </div>
          )}
        </DimensionCard>
      )}

      {detail.gastoFuncion && (
        <DimensionCard
          title="Gasto por función"
          score={detail.gastoFuncion.scoreTotal}
          color="amber"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-xs text-muted-foreground">
                % Servicios sociales
              </p>
              <p className="text-xl font-semibold">
                {detail.gastoFuncion.pctServiciosSociales != null
                  ? `${detail.gastoFuncion.pctServiciosSociales.toFixed(1)}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-xs text-muted-foreground">
                % Servicios económicos
              </p>
              <p className="text-xl font-semibold">
                {detail.gastoFuncion.pctServiciosEconomicos != null
                  ? `${detail.gastoFuncion.pctServiciosEconomicos.toFixed(1)}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-xs text-muted-foreground">% Administración</p>
              <p
                className={cn(
                  "text-xl font-semibold",
                  detail.gastoFuncion.pctAdminGubernamental != null
                    ? detail.gastoFuncion.pctAdminGubernamental <= 25
                      ? "text-score-high"
                      : detail.gastoFuncion.pctAdminGubernamental <= 35
                        ? "text-score-mid"
                        : "text-score-low"
                    : "",
                )}
              >
                {detail.gastoFuncion.pctAdminGubernamental != null
                  ? `${detail.gastoFuncion.pctAdminGubernamental.toFixed(1)}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-xs text-muted-foreground">HHI diversificación</p>
              <p className="text-xl font-semibold">
                {detail.gastoFuncion.diversificacionHhi != null
                  ? detail.gastoFuncion.diversificacionHhi.toFixed(3)
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Menor = más diversificado
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 mb-4">
            <p className="text-sm font-medium text-center mb-2">
              Composición del gasto por función
            </p>
            <SpendingBreakdown
              data={[
                {
                  nombre: "Servicios sociales",
                  pct: detail.gastoFuncion.pctServiciosSociales ?? 0,
                },
                {
                  nombre: "Servicios económicos",
                  pct: detail.gastoFuncion.pctServiciosEconomicos ?? 0,
                },
                {
                  nombre: "Administración",
                  pct: detail.gastoFuncion.pctAdminGubernamental ?? 0,
                },
                {
                  nombre: "Otros / Deuda",
                  pct: Math.max(
                    0,
                    100 -
                      (detail.gastoFuncion.pctServiciosSociales ?? 0) -
                      (detail.gastoFuncion.pctServiciosEconomicos ?? 0) -
                      (detail.gastoFuncion.pctAdminGubernamental ?? 0),
                  ),
                },
              ]}
              height={260}
            />
          </div>
          <CriteriaTable
            criterios={detail.gastoFuncion.criterios}
            totalLabel="Total gasto por función"
            totalScore={detail.gastoFuncion.scoreTotal}
            type="normalized"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Fuente: Ejecución presupuestaria RAFAM. {detail.gastoFuncion.notas}
          </p>
        </DimensionCard>
      )}

      {detail.economiaLocal && (
        <DimensionCard
          title="Economía local"
          score={detail.economiaLocal.scoreTotal}
          color="amber"
        >
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-xs text-muted-foreground">Empleo per cápita</p>
              <p className="text-xl font-semibold">
                {detail.economiaLocal.empleoPcapita != null
                  ? detail.economiaLocal.empleoPcapita.toFixed(2)
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                empleo registrado / habitante
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-xs text-muted-foreground">Variación empleo</p>
              <p
                className={cn(
                  "text-xl font-semibold",
                  detail.economiaLocal.variacionEmpleo != null
                    ? detail.economiaLocal.variacionEmpleo >= 0
                      ? "text-score-high"
                      : "text-score-low"
                    : "",
                )}
              >
                {detail.economiaLocal.variacionEmpleo != null
                  ? `${detail.economiaLocal.variacionEmpleo > 0 ? "+" : ""}${detail.economiaLocal.variacionEmpleo.toFixed(1)}%`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">interanual</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-xs text-muted-foreground">
                Empresas / 1000 hab.
              </p>
              <p className="text-xl font-semibold">
                {detail.economiaLocal.empresasPer1000 != null
                  ? detail.economiaLocal.empresasPer1000.toFixed(1)
                  : "—"}
              </p>
            </div>
          </div>
          <CriteriaTable
            criterios={detail.economiaLocal.criterios}
            totalLabel="Total economía local"
            totalScore={detail.economiaLocal.scoreTotal}
            type="normalized"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Fuente: OEDE (Min. Trabajo), AFIP, IERIC. {detail.economiaLocal.notas}
          </p>
        </DimensionCard>
      )}
    </div>
  );
}
