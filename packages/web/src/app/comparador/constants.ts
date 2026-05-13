/**
 * Sprint 44A — Constants para `/comparador` (pure module, sin "use client").
 *
 * Permite que page.tsx (server), canonicalize.ts, OG handler y los tests
 * importen sin arrastrar el árbol React de los selectors.
 */
import { MUNICIPIOS_PILOTO } from "@radar-municipal/core";

/** Set de IDs piloto válidos para validar searchParams en URL. */
export const VALID_PILOTO_IDS = new Set(MUNICIPIOS_PILOTO.map((m) => m.id));

/** Colores del radar chart para A/B/C respectivamente. */
export const RADAR_COLORS = ["#3b82f6", "#f59e0b", "#10b981"];
