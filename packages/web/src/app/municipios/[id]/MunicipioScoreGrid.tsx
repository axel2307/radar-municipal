import Link from "next/link";
import type { MunicipioDetail } from "@/lib/scoring-data";
import { ScoreBadge } from "@/components/ScoreBadge";

/**
 * Sprint 47B — Grid de scores por dimensión agrupada en 4 categorías.
 * El "resumen" interno de la ficha, encima de las dimension cards.
 */
interface MunicipioScoreGridProps {
  detail: MunicipioDetail;
  id: string;
}

interface DimensionCell {
  label: string;
  score: number | null;
}

function DimensionScoreCard({
  label,
  score,
  borderClass,
  bgClass,
}: DimensionCell & { borderClass: string; bgClass: string }) {
  return (
    <div
      className={`rounded-lg border ${borderClass} ${bgClass} p-3 text-center`}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <ScoreBadge score={score} size="md" />
    </div>
  );
}

export function MunicipioScoreGrid({ detail, id }: MunicipioScoreGridProps) {
  return (
    <div id="resumen" className="scroll-target">
      <h2 className="text-lg font-semibold mb-4">Scores por dimensión</h2>

      {/* Gobierno Abierto */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">
          Gobierno Abierto
        </p>
        <div className="grid gap-3 sm:grid-cols-3 mb-2">
          <DimensionScoreCard
            label="Transparencia"
            score={detail.scoreTransparencia}
            borderClass="border-blue-200"
            bgClass="bg-blue-50/50"
          />
          <DimensionScoreCard
            label="Normativa"
            score={detail.scoreNormativa}
            borderClass="border-blue-200"
            bgClass="bg-blue-50/50"
          />
          <DimensionScoreCard
            label="Participación"
            score={detail.scoreParticipacion}
            borderClass="border-blue-200"
            bgClass="bg-blue-50/50"
          />
        </div>
      </div>

      {/* Economía y Finanzas */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
            Economía y Finanzas
          </p>
          <Link
            href={`/municipios/${id}/economia`}
            className="text-xs text-amber-600 hover:underline"
          >
            Ver detalle →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-2">
          <DimensionScoreCard
            label="Fiscal"
            score={detail.scoreFiscal}
            borderClass="border-amber-200"
            bgClass="bg-amber-50/50"
          />
          <DimensionScoreCard
            label="Gasto por función"
            score={detail.scoreGastoFuncion}
            borderClass="border-amber-200"
            bgClass="bg-amber-50/50"
          />
          <DimensionScoreCard
            label="Economía local"
            score={detail.scoreEconomiaLocal}
            borderClass="border-amber-200"
            bgClass="bg-amber-50/50"
          />
          <DimensionScoreCard
            label="Presión impositiva"
            score={detail.scorePresionImpositiva}
            borderClass="border-amber-200"
            bgClass="bg-amber-50/50"
          />
        </div>
      </div>

      {/* Calidad de Vida */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-green-600 mb-2 uppercase tracking-wide">
          Calidad de Vida
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-2">
          <DimensionScoreCard
            label="Servicios básicos"
            score={detail.scoreServiciosBasicos}
            borderClass="border-green-200"
            bgClass="bg-green-50/50"
          />
          <DimensionScoreCard
            label="Educación y salud"
            score={detail.scoreEducacionSalud}
            borderClass="border-green-200"
            bgClass="bg-green-50/50"
          />
          <DimensionScoreCard
            label="Conectividad"
            score={detail.scoreConectividad}
            borderClass="border-green-200"
            bgClass="bg-green-50/50"
          />
          <DimensionScoreCard
            label="Espacio público"
            score={detail.scoreEspacioPublico}
            borderClass="border-green-200"
            bgClass="bg-green-50/50"
          />
        </div>
      </div>

      {/* Infraestructura y Movilidad — Sprint 41D: violet, no purple */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-violet-600 mb-2 uppercase tracking-wide">
          Infraestructura y Movilidad
        </p>
        <div className="grid gap-3 sm:grid-cols-1 mb-2">
          <DimensionScoreCard
            label="Seguridad vial"
            score={detail.scoreSeguridadVial}
            borderClass="border-violet-200"
            bgClass="bg-violet-50/50"
          />
        </div>
      </div>
    </div>
  );
}
