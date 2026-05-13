import type { Municipio, ScoringDimension } from "@radar-municipal/core";
import type { MunicipioDetail } from "@/lib/scoring-data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { RadarChart } from "@/components/RadarChart";
import { CitizenSummary } from "@/components/CitizenSummary";

/**
 * Sprint 47B — Overview del municipio:
 *   - CitizenSummary (texto narrativo top-3 / bottom-3 de dimensiones)
 *   - Score Total grande + Radar Chart con las 12 dimensiones
 *
 * Extraído de page.tsx monolítico. Server component porque recibe
 * `detail` ya computado y solo renderea; `RadarChart` internamente es
 * client (Recharts), Next maneja el bundle split automático.
 */
interface MunicipioOverviewProps {
  municipio: Municipio;
  detail: MunicipioDetail;
  ranking: number;
  totalMunicipios: number;
  dimensionScores: Record<string, number | null>;
}

export function MunicipioOverview({
  municipio,
  detail,
  ranking,
  totalMunicipios,
  dimensionScores,
}: MunicipioOverviewProps) {
  return (
    <>
      <CitizenSummary
        municipioName={municipio.nombre}
        ranking={ranking}
        totalMunicipios={totalMunicipios}
        dimensionScores={dimensionScores as Record<ScoringDimension, number | null>}
        categoryScores={detail.categoryScores}
      />

      <div className="grid gap-6 lg:grid-cols-2 my-6">
        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center flex flex-col items-center justify-center">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Score Total
          </p>
          <ScoreBadge score={detail.scoreTotal} size="lg" />
        </div>
        <RadarChart
          series={[
            {
              name: municipio.nombre,
              color: "#3b82f6",
              dimensions: [
                { label: "Transparencia", shortLabel: "Transp.", score: detail.scoreTransparencia },
                { label: "Normativa", shortLabel: "Norm.", score: detail.scoreNormativa ?? 0 },
                { label: "Participación", shortLabel: "Partic.", score: detail.scoreParticipacion ?? 0 },
                { label: "Fiscal", score: detail.scoreFiscal ?? 0 },
                { label: "Gasto público", shortLabel: "Gasto", score: detail.scoreGastoFuncion ?? 0 },
                { label: "Economía local", shortLabel: "Econ.", score: detail.scoreEconomiaLocal ?? 0 },
                { label: "Presión impositiva", shortLabel: "Pres.Imp.", score: detail.scorePresionImpositiva ?? 0 },
                { label: "Servicios básicos", shortLabel: "Serv.", score: detail.scoreServiciosBasicos ?? 0 },
                { label: "Educación y salud", shortLabel: "Educ.", score: detail.scoreEducacionSalud ?? 0 },
                { label: "Conectividad", shortLabel: "Conect.", score: detail.scoreConectividad ?? 0 },
                { label: "Espacio público", shortLabel: "Esp.Púb.", score: detail.scoreEspacioPublico ?? 0 },
                { label: "Seguridad vial", shortLabel: "Seg.Vial", score: detail.scoreSeguridadVial ?? 0 },
              ],
            },
          ]}
        />
      </div>
    </>
  );
}
