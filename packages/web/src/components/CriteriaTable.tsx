import { ScoreBadge } from "@/components/ScoreBadge";
import { cn } from "@/lib/utils";

/**
 * Sprint 47B — Tabla de criterios de scoring reutilizable.
 *
 * Antes vivía inline en `/municipios/[id]/page.tsx` (897 LOC monolítico).
 * Extraída para reuso + claridad.
 *
 * Variantes:
 *   - `binary`: criterios 0/1 con evidencia textual (Transparencia, Normativa)
 *   - `normalized`: criterios con valor continuo 0..1 con interpretación
 *     (Fiscal, Económica, Servicios básicos, etc.)
 */
export interface CriteriaTableRow {
  descripcion: string;
  indicador: string;
  peso: number;
  valorNormalizado?: number;
  valor?: number;
  interpretacion?: string;
  evidencia?: string;
}

interface CriteriaTableProps {
  criterios: CriteriaTableRow[];
  totalLabel: string;
  totalScore: number | null;
  type: "normalized" | "binary";
}

export function CriteriaTable({
  criterios,
  totalLabel,
  totalScore,
  type,
}: CriteriaTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
              {type === "binary" ? "Criterio" : "Indicador"}
            </th>
            <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-16">
              Peso
            </th>
            <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-20">
              Score
            </th>
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground hidden md:table-cell">
              {type === "binary" ? "Evidencia" : "Detalle"}
            </th>
          </tr>
        </thead>
        <tbody>
          {criterios.map((c) => {
            const val = c.valorNormalizado ?? c.valor ?? 0;
            return (
              <tr
                key={c.indicador}
                className="border-b border-border last:border-0"
              >
                <td className="px-4 py-2 font-medium">{c.descripcion}</td>
                <td className="px-4 py-2 text-center text-muted-foreground">
                  {(c.peso * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2 text-center">
                  <span
                    className={cn(
                      "font-medium",
                      val >= 0.7
                        ? "text-score-high"
                        : val >= 0.4
                          ? "text-score-mid"
                          : "text-score-low",
                    )}
                  >
                    {(val * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">
                  {c.interpretacion ?? c.evidencia ?? ""}
                </td>
              </tr>
            );
          })}
          <tr className="bg-muted/30 font-semibold">
            <td className="px-4 py-2">{totalLabel}</td>
            <td className="px-4 py-2 text-center">100%</td>
            <td className="px-4 py-2 text-center">
              <ScoreBadge score={totalScore} size="sm" />
            </td>
            <td className="px-4 py-2 hidden md:table-cell" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
