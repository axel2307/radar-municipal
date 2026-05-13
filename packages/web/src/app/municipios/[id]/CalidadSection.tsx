import type { MunicipioDetail } from "@/lib/scoring-data";
import { DimensionCard } from "@/components/DimensionCard";
import { CriteriaTable } from "@/components/CriteriaTable";
import { cn } from "@/lib/utils";

/**
 * Sprint 47B — Sección "Calidad de Vida": servicios básicos, educación &
 * salud, conectividad, espacio público & ambiente.
 */
export function CalidadSection({ detail }: { detail: MunicipioDetail }) {
  return (
    <div id="calidad" className="scroll-target">
      <h2 className="text-lg font-semibold text-green-700 mb-4">
        Calidad de Vida
      </h2>

      {detail.serviciosBasicos && (
        <DimensionCard
          title="Servicios básicos"
          score={detail.serviciosBasicos.scoreTotal}
          color="green"
        >
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs text-muted-foreground">Agua de red</p>
              <p className="text-xl font-semibold">
                {detail.serviciosBasicos.pctAguaRed != null
                  ? `${detail.serviciosBasicos.pctAguaRed.toFixed(1)}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs text-muted-foreground">Red cloacal</p>
              <p className="text-xl font-semibold">
                {detail.serviciosBasicos.pctCloaca != null
                  ? `${detail.serviciosBasicos.pctCloaca.toFixed(1)}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs text-muted-foreground">Gas de red</p>
              <p className="text-xl font-semibold">
                {detail.serviciosBasicos.pctGasRed != null
                  ? `${detail.serviciosBasicos.pctGasRed.toFixed(1)}%`
                  : "—"}
              </p>
            </div>
          </div>
          <CriteriaTable
            criterios={detail.serviciosBasicos.criterios}
            totalLabel="Total servicios básicos"
            totalScore={detail.serviciosBasicos.scoreTotal}
            type="normalized"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Fuente: INDEC Censo 2022 + relevamiento municipal.{" "}
            {detail.serviciosBasicos.notas}
          </p>
        </DimensionCard>
      )}

      {detail.educacionSalud && (
        <DimensionCard
          title="Educación y salud"
          score={detail.educacionSalud.scoreTotal}
          color="green"
        >
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs text-muted-foreground">
                Escuelas / 10k hab.
              </p>
              <p className="text-xl font-semibold">
                {detail.educacionSalud.escuelasPer10k != null
                  ? detail.educacionSalud.escuelasPer10k.toFixed(1)
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs text-muted-foreground">
                Centros salud / 10k hab.
              </p>
              <p className="text-xl font-semibold">
                {detail.educacionSalud.centrosSaludPer10k != null
                  ? detail.educacionSalud.centrosSaludPer10k.toFixed(1)
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs text-muted-foreground">
                Camas hosp. / 10k hab.
              </p>
              <p className="text-xl font-semibold">
                {detail.educacionSalud.camasPer10k != null
                  ? detail.educacionSalud.camasPer10k.toFixed(1)
                  : "—"}
              </p>
            </div>
          </div>
          <CriteriaTable
            criterios={detail.educacionSalud.criterios}
            totalLabel="Total educación y salud"
            totalScore={detail.educacionSalud.scoreTotal}
            type="normalized"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Fuente: Mapa Educativo Nacional, REFES, INDEC Censo 2022.{" "}
            {detail.educacionSalud.notas}
          </p>
        </DimensionCard>
      )}

      {detail.conectividad && (
        <DimensionCard
          title="Conectividad digital"
          score={detail.conectividad.scoreTotal}
          color="green"
        >
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs text-muted-foreground">
                Hogares con internet
              </p>
              <p className="text-xl font-semibold">
                {detail.conectividad.pctInternet != null
                  ? `${detail.conectividad.pctInternet.toFixed(1)}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs text-muted-foreground">
                Banda ancha / 100 hab.
              </p>
              <p className="text-xl font-semibold">
                {detail.conectividad.bandaAnchaPer100 != null
                  ? detail.conectividad.bandaAnchaPer100.toFixed(1)
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs text-muted-foreground">
                Hogares con computadora
              </p>
              <p className="text-xl font-semibold">
                {detail.conectividad.pctComputadora != null
                  ? `${detail.conectividad.pctComputadora.toFixed(1)}%`
                  : "—"}
              </p>
            </div>
          </div>
          <CriteriaTable
            criterios={detail.conectividad.criterios}
            totalLabel="Total conectividad"
            totalScore={detail.conectividad.scoreTotal}
            type="normalized"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Fuente: ENACOM, INDEC Censo 2022, auditoría portal municipal.{" "}
            {detail.conectividad.notas}
          </p>
        </DimensionCard>
      )}

      {detail.espacioPublico && (
        <DimensionCard
          title="Espacio público y ambiente"
          score={detail.espacioPublico.scoreTotal}
          color="green"
        >
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs text-muted-foreground">Espacio verde</p>
              <p className="text-xl font-semibold">
                {detail.espacioPublico.espacioVerdePcapita != null
                  ? `${detail.espacioPublico.espacioVerdePcapita.toFixed(1)} m²/hab`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                OMS rec: 10-15 m²/hab
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs text-muted-foreground">Arbolado urbano</p>
              <p className="text-xl font-semibold">
                {detail.espacioPublico.coberturaArbolado != null
                  ? `${detail.espacioPublico.coberturaArbolado.toFixed(1)}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
              <p className="text-xs text-muted-foreground">Separación residuos</p>
              <p
                className={cn(
                  "text-lg font-semibold",
                  detail.espacioPublico.separacionResiduos != null
                    ? detail.espacioPublico.separacionResiduos >= 1.0
                      ? "text-score-high"
                      : detail.espacioPublico.separacionResiduos >= 0.5
                        ? "text-score-mid"
                        : "text-score-low"
                    : "",
                )}
              >
                {detail.espacioPublico.separacionResiduos != null
                  ? detail.espacioPublico.separacionResiduos >= 1.0
                    ? "Consolidado"
                    : detail.espacioPublico.separacionResiduos >= 0.5
                      ? "Parcial"
                      : "No tiene"
                  : "—"}
              </p>
            </div>
          </div>
          <CriteriaTable
            criterios={detail.espacioPublico.criterios}
            totalLabel="Total espacio público"
            totalScore={detail.espacioPublico.scoreTotal}
            type="normalized"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Fuente: OPDS, Global Forest Watch, relevamiento municipal.{" "}
            {detail.espacioPublico.notas}
          </p>
        </DimensionCard>
      )}
    </div>
  );
}
