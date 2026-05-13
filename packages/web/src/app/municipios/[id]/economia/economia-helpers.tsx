import { cn } from "@/lib/utils";

/**
 * Sprint 47D — Helpers compartidos por la página /economia.
 * Extraídos del monolítico page.tsx (734 LOC).
 */

/**
 * Card de valor fiscal con coloreo opcional según semáforo.
 *   - "positive": ≥0 verde, <0 rojo (resultado fiscal)
 *   - "lower-better": <50% verde, <70% amber, else rojo (% personal)
 *   - "higher-better": ≥15% verde, ≥8% amber, else rojo (% capital)
 */
export function FiscalValue({
  label,
  value,
  unit,
  colorize,
}: {
  label: string;
  value: number | null;
  unit: string;
  colorize?: "positive" | "lower-better" | "higher-better";
}) {
  let colorClass = "";
  if (value != null && colorize) {
    if (colorize === "positive") {
      colorClass = value >= 0 ? "text-score-high" : "text-score-low";
    } else if (colorize === "lower-better") {
      colorClass =
        value < 50
          ? "text-score-high"
          : value < 70
            ? "text-score-mid"
            : "text-score-low";
    } else if (colorize === "higher-better") {
      colorClass =
        value >= 15
          ? "text-score-high"
          : value >= 8
            ? "text-score-mid"
            : "text-score-low";
    }
  }

  const formatted =
    value != null
      ? unit === "$"
        ? `$${Math.round(value).toLocaleString("es-AR")}`
        : `${value.toFixed(1)}${unit}`
      : "—";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold", colorClass)}>{formatted}</p>
    </div>
  );
}

/** Formato moneda ARS sin decimales (estándar local). */
export function formatArs(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}
