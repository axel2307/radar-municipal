"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DetailSectionNavProps {
  sections: { id: string; label: string; color?: string }[];
}

const colorMap: Record<string, { active: string; border: string; text: string }> = {
  blue: {
    active: "bg-blue-50 border-blue-500 text-blue-700",
    border: "border-blue-300",
    text: "text-blue-600",
  },
  amber: {
    active: "bg-amber-50 border-amber-500 text-amber-700",
    border: "border-amber-300",
    text: "text-amber-600",
  },
  green: {
    active: "bg-green-50 border-green-500 text-green-700",
    border: "border-green-300",
    text: "text-green-600",
  },
  purple: {
    active: "bg-purple-50 border-purple-500 text-purple-700",
    border: "border-purple-300",
    text: "text-purple-600",
  },
};

const defaultColors = {
  active: "bg-muted border-foreground/60 text-foreground",
  border: "border-border",
  text: "text-muted-foreground",
};

export function DetailSectionNav({ sections }: DetailSectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const navRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const ids = sections.map((s) => s.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Build a set of currently-intersecting section ids
        const visible = new Set<string>();
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          }
        }
        // Pick the first section (in DOM order) that is visible
        for (const id of ids) {
          if (visible.has(id)) {
            setActiveId(id);
            break;
          }
        }
      },
      {
        threshold: 0.1,
        rootMargin: "-120px 0px -60% 0px",
      },
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  // Scroll the active button into view inside the horizontal nav
  useEffect(() => {
    const btn = btnRefs.current.get(activeId);
    if (btn && navRef.current) {
      btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeId]);

  function handleClick(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div
      ref={navRef}
      className="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 bg-background/95 backdrop-blur-sm border-b border-border mb-6"
    >
      <nav className="flex gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8 py-2 scrollbar-none">
        {sections.map((section) => {
          const colors = section.color ? colorMap[section.color] : undefined;
          const isActive = activeId === section.id;
          return (
            <button
              key={section.id}
              ref={(el) => {
                if (el) btnRefs.current.set(section.id, el);
              }}
              onClick={() => handleClick(section.id)}
              className={cn(
                "shrink-0 rounded-md border-b-2 px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? colors?.active ?? defaultColors.active
                  : cn(
                      "border-transparent hover:bg-muted/60",
                      colors?.text ?? defaultColors.text,
                    ),
              )}
            >
              {section.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
