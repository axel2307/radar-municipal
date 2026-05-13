/**
 * Sprint 44A — Canonicalización de URL search params para `/comparador`.
 * Mismo patrón que `/mapa` Sprint 40.
 *
 * Casos cubiertos:
 *   - ID inválido (no piloto) en a/b/c → strip
 *   - ID duplicado en distintos slots (a=X, b=X) → strip el duplicado
 *   - Slot vacío detrás de otros llenos → consolidar (no permitir c sin b)
 *
 * Devuelve:
 *   - null → URL ya canónica (no redirect)
 *   - "" → redirect a `/comparador` (sin params)
 *   - "?..." → redirect a `/comparador?...`
 */
import { VALID_PILOTO_IDS } from "./constants";

export interface ComparadorSearchParams {
  a?: string;
  b?: string;
  c?: string;
}

export function canonicalizeComparadorSearchParams(
  raw: ComparadorSearchParams,
): string | null {
  // Validar cada slot: ID en allowlist + no duplicar slots anteriores.
  const seen = new Set<string>();
  const slots: { key: "a" | "b" | "c"; value: string | null }[] = [];
  for (const k of ["a", "b", "c"] as const) {
    const v = raw[k];
    if (v && VALID_PILOTO_IDS.has(v) && !seen.has(v)) {
      seen.add(v);
      slots.push({ key: k, value: v });
    } else {
      slots.push({ key: k, value: null });
    }
  }

  // Consolidar: si hay c sin b, mover c → b. Si hay b sin a, mover b → a.
  // Mantiene el orden natural (selector 1 = "a", 2 = "b", 3 = "c") sin gaps.
  const values = slots.map((s) => s.value).filter((v): v is string => v != null);
  const canonical: ComparadorSearchParams = {};
  if (values[0]) canonical.a = values[0];
  if (values[1]) canonical.b = values[1];
  if (values[2]) canonical.c = values[2];

  // Construir incoming + canonical en orden canónico para comparar
  // toString() de forma robusta (orden de params no importa).
  const out = new URLSearchParams();
  if (canonical.a) out.set("a", canonical.a);
  if (canonical.b) out.set("b", canonical.b);
  if (canonical.c) out.set("c", canonical.c);

  const incoming = new URLSearchParams();
  if (raw.a !== undefined) incoming.set("a", raw.a);
  if (raw.b !== undefined) incoming.set("b", raw.b);
  if (raw.c !== undefined) incoming.set("c", raw.c);

  if (out.toString() === incoming.toString()) return null;
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}
