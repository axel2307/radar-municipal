import {
  ScoringDimension,
  ScoringCategory,
  SCORING_DIMENSION_LABELS,
  SCORING_CATEGORIES,
} from "@radar-municipal/core";

interface CitizenSummaryProps {
  municipioName: string;
  ranking: number;
  totalMunicipios: number;
  dimensionScores: Record<string, number | null>;
  categoryScores: Record<ScoringCategory, number | null>;
}

const DIMENSION_FRIENDLY: Partial<Record<ScoringDimension, string>> = {
  [ScoringDimension.TRANSPARENCIA]: "transparencia",
  [ScoringDimension.FISCAL]: "salud fiscal",
  [ScoringDimension.NORMATIVA]: "normativa",
  [ScoringDimension.PARTICIPACION_CIUDADANA]: "participación ciudadana",
  [ScoringDimension.GASTO_POR_FUNCION]: "gasto público",
  [ScoringDimension.ECONOMIA_LOCAL]: "economía local",
  [ScoringDimension.PRESION_IMPOSITIVA]: "presión impositiva",
  [ScoringDimension.SERVICIOS_BASICOS]: "servicios básicos",
  [ScoringDimension.EDUCACION_SALUD]: "educación y salud",
  [ScoringDimension.CONECTIVIDAD_DIGITAL]: "conectividad digital",
  [ScoringDimension.ESPACIO_PUBLICO]: "espacio público",
  [ScoringDimension.SEGURIDAD_VIAL]: "seguridad vial",
};

function friendlyName(dim: ScoringDimension): string {
  return DIMENSION_FRIENDLY[dim] ?? SCORING_DIMENSION_LABELS[dim]?.toLowerCase() ?? dim;
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + " y " + items[items.length - 1];
}

export function CitizenSummary({
  municipioName,
  ranking,
  totalMunicipios,
  dimensionScores,
  categoryScores,
}: CitizenSummaryProps) {
  // Collect dimensions with valid scores
  const scored = Object.entries(dimensionScores)
    .filter(([, v]) => v != null)
    .map(([k, v]) => ({ dim: k as ScoringDimension, score: v! }));

  if (scored.length === 0) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p>
          <strong>{municipioName}</strong> rankea #{ranking} de{" "}
          {totalMunicipios} municipios piloto. Aún no hay suficientes datos
          para generar un resumen detallado.
        </p>
      </div>
    );
  }

  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const strengths = sorted.filter((d) => d.score >= 65).slice(0, 3);
  const weaknesses = sorted.filter((d) => d.score < 40).slice(-3).reverse();

  const parts: string[] = [];

  parts.push(
    `${municipioName} rankea #${ranking} de ${totalMunicipios} municipios piloto.`
  );

  if (strengths.length > 0) {
    parts.push(
      `Fuerte en ${joinList(strengths.map((s) => friendlyName(s.dim)))}.`
    );
  }

  if (weaknesses.length > 0) {
    parts.push(
      `Débil en ${joinList(weaknesses.map((w) => friendlyName(w.dim)))}.`
    );
  }

  if (strengths.length === 0 && weaknesses.length === 0) {
    parts.push("Desempeño parejo en todas las dimensiones evaluadas.");
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      <p>
        <strong>{parts[0]}</strong>{" "}
        {parts.slice(1).join(" ")}
      </p>
    </div>
  );
}
