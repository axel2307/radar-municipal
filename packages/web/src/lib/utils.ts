import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("es-AR");
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return "—";
  return score.toFixed(1);
}

export function getScoreColor(score: number): string {
  if (score >= 70) return "text-score-high";
  if (score >= 40) return "text-score-mid";
  return "text-score-low";
}

export function getScoreBgColor(score: number): string {
  if (score >= 70) return "bg-score-high";
  if (score >= 40) return "bg-score-mid";
  return "bg-score-low";
}
