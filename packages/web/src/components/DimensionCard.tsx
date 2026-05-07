"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/ScoreBadge";

interface DimensionCardProps {
  title: string;
  score: number | null;
  color: "blue" | "amber" | "green" | "purple";
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const borderColorMap: Record<string, string> = {
  blue: "border-blue-200",
  amber: "border-amber-200",
  green: "border-green-200",
  purple: "border-purple-200",
};

const headerBgMap: Record<string, string> = {
  blue: "bg-blue-50/50",
  amber: "bg-amber-50/50",
  green: "bg-green-50/50",
  purple: "bg-purple-50/50",
};

const titleColorMap: Record<string, string> = {
  blue: "text-blue-700",
  amber: "text-amber-700",
  green: "text-green-700",
  purple: "text-purple-700",
};

export function DimensionCard({
  title,
  score,
  color,
  defaultOpen,
  children,
}: DimensionCardProps) {
  const [open, setOpen] = useState(defaultOpen ?? score != null);

  return (
    <div
      className={cn(
        "rounded-lg border-2 overflow-hidden mb-4",
        borderColorMap[color],
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30",
          headerBgMap[color],
        )}
      >
        <span className={cn("font-semibold", titleColorMap[color])}>
          {title}
        </span>
        <div className="flex items-center gap-3">
          <ScoreBadge score={score} size="sm" />
          <svg
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
