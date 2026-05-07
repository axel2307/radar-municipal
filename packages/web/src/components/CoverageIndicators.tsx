import type { DimensionCoverageDetail } from "@/lib/scoring-data";
import { cn } from "@/lib/utils";

interface CoverageIndicatorsProps {
  details: DimensionCoverageDetail[];
  /** Tamaño del dot: "sm" = 6px, "md" = 8px */
  size?: "sm" | "md";
}

/** Serie de 11 dots horizontales; verde si present, gris si ausente. */
export function CoverageIndicators({ details, size = "md" }: CoverageIndicatorsProps) {
  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  return (
    <div className="flex items-center gap-1" aria-label="Cobertura por dimensión">
      {details.map((d) => (
        <span
          key={d.slug}
          title={`${d.label}: ${d.present ? "con datos" : "sin datos"}`}
          className={cn(
            "inline-block rounded-full",
            dotSize,
            d.present ? "bg-score-high" : "bg-muted-foreground/25",
          )}
        />
      ))}
    </div>
  );
}
