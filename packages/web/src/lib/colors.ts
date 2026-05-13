import { ScoringCategory } from "@radar-municipal/core";

/**
 * Sprint 41D — Color system de Radar Municipal.
 *
 * UN solo principio: cada color tiene UN significado en el producto.
 *
 *   Score 0-100 (divergente)  → red-300 / amber-400 / lime-500 / green-500
 *                               (clases `text-score-*` en globals.css)
 *   Categoría scoring         → blue / amber / green / violet (este archivo)
 *   Pilar 5 (cross-dim)       → violet (mismo que Infraestructura)
 *   Status (OK/warn/err)      → green-100 / amber-100 / red-100 inline
 *                               (no centralizado por ser uso decorativo
 *                               local; consistente por convención)
 *   Heatmaps no-score         → paletas dedicadas (YlOrBr para vialDensity,
 *                               PuRd para pesosPorKm) en ProvinceMap.tsx
 *
 * Inconsistencia histórica corregida en este sprint: la categoría
 * INFRAESTRUCTURA_MOVILIDAD usaba `purple` en `/ranking` + `RankingTable`
 * pero `violet` en home + `/dimensiones`. Era el mismo concepto con dos
 * tonos distintos. Ahora todas las consumers importan desde acá → un
 * solo violeta para esa categoría.
 */

export interface CategoryBadge {
  /** Background suave para badges (`bg-X-100`). */
  bg: string;
  /** Texto fuerte que contrasta sobre `bg` (`text-X-700`). */
  text: string;
  /** Border decorativo suave (`border-X-200`). Para cards de la categoría. */
  border: string;
  /** Border fuerte (`border-X-300`). Para acentos donde se necesita más peso. */
  borderStrong: string;
}

export const CATEGORY_BADGE: Record<ScoringCategory, CategoryBadge> = {
  [ScoringCategory.GOBIERNO_ABIERTO]: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    borderStrong: "border-blue-300",
  },
  [ScoringCategory.ECONOMIA_FINANZAS]: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    borderStrong: "border-amber-300",
  },
  [ScoringCategory.CALIDAD_DE_VIDA]: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
    borderStrong: "border-green-300",
  },
  [ScoringCategory.INFRAESTRUCTURA_MOVILIDAD]: {
    bg: "bg-violet-100",
    text: "text-violet-700",
    border: "border-violet-200",
    borderStrong: "border-violet-300",
  },
};

/**
 * Pilar 5 (cross-dimensional) usa el mismo violeta que
 * INFRAESTRUCTURA_MOVILIDAD para reforzar la asociación conceptual:
 * red vial es infraestructura. Pero el cross NO vive bajo esa categoría
 * porque su valor no es score 0-100 sino $/km. Diseño: misma familia
 * cromática, distinto rol semántico.
 */
export const CROSS_DIMENSIONAL_BADGE: CategoryBadge = {
  bg: "bg-violet-100",
  text: "text-violet-700",
  border: "border-violet-200",
  borderStrong: "border-violet-300",
};
