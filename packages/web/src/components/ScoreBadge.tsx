import { cn, formatScore, getScoreColor, getScoreBgColor } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  if (score == null) {
    return (
      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
        Sin datos
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold text-white",
        getScoreBgColor(score),
        size === "sm" && "px-1.5 py-0.5 text-xs min-w-[40px]",
        size === "md" && "px-2 py-1 text-sm min-w-[48px]",
        size === "lg" && "px-3 py-1.5 text-base min-w-[56px]"
      )}
    >
      {formatScore(score)}
    </span>
  );
}
