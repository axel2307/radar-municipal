/**
 * Sprint 42A — Tests del color system.
 *
 * Invariantes:
 *   - Cada ScoringCategory tiene los 4 fields (bg, text, border, borderStrong)
 *   - Bug histórico (purple→violet) no vuelve: INFRAESTRUCTURA usa violet, no purple
 *   - El cross-dimensional usa el mismo violet que infraestructura
 */
import { describe, it, expect } from "vitest";
import { ScoringCategory } from "@radar-municipal/core";
import { CATEGORY_BADGE, CROSS_DIMENSIONAL_BADGE } from "./colors";

describe("CATEGORY_BADGE", () => {
  it("define todas las ScoringCategory", () => {
    const categories = Object.values(ScoringCategory);
    for (const cat of categories) {
      expect(CATEGORY_BADGE[cat]).toBeDefined();
    }
  });

  it("cada categoría tiene los 4 fields (bg, text, border, borderStrong)", () => {
    for (const cat of Object.values(ScoringCategory)) {
      const badge = CATEGORY_BADGE[cat];
      expect(badge.bg).toMatch(/^bg-/);
      expect(badge.text).toMatch(/^text-/);
      expect(badge.border).toMatch(/^border-/);
      expect(badge.borderStrong).toMatch(/^border-/);
    }
  });

  it("INFRAESTRUCTURA usa violet, no purple (regresión Sprint 41D)", () => {
    const badge = CATEGORY_BADGE[ScoringCategory.INFRAESTRUCTURA_MOVILIDAD];
    expect(badge.bg).toContain("violet");
    expect(badge.bg).not.toContain("purple");
    expect(badge.text).toContain("violet");
    expect(badge.border).toContain("violet");
    expect(badge.borderStrong).toContain("violet");
  });

  it("4 categorías usan 4 colores distintos", () => {
    const colors = Object.values(ScoringCategory)
      .map((c) => CATEGORY_BADGE[c].bg)
      .filter((bg, i, arr) => arr.indexOf(bg) === i);
    expect(colors.length).toBe(Object.values(ScoringCategory).length);
  });
});

describe("CROSS_DIMENSIONAL_BADGE (Pilar 5)", () => {
  it("usa el mismo violet que INFRAESTRUCTURA — refuerzo cromático", () => {
    const infra = CATEGORY_BADGE[ScoringCategory.INFRAESTRUCTURA_MOVILIDAD];
    expect(CROSS_DIMENSIONAL_BADGE).toEqual(infra);
  });
});
