/**
 * Sprint 40 — canonicalización de URL search params para `/mapa`.
 * Sprint 42A — extraído a módulo puro para testear sin levantar Next.
 *
 * Si la URL entrante difiere del canónico (e.g. `?a=scoreTotal` redundante,
 * `?a=invalidMetric` mal, `?compare=true` no-1, `?b=...` sin compare), devuelve
 * el query string canónico (`""` o `"?<qs>"`) para redirect. Si ya es canónica,
 * devuelve null.
 *
 * Evita que URLs malformadas vivan en redes sociales y que dos URLs distintas
 * (e.g. `/mapa` y `/mapa?a=scoreTotal`) indexen como duplicados.
 */
import {
  DEFAULT_METRIC_A,
  DEFAULT_METRIC_B,
  VALID_METRIC_KEYS,
} from "./constants";

export interface MapaSearchParams {
  a?: string;
  b?: string;
  compare?: string;
}

export function canonicalizeMapaSearchParams(
  raw: MapaSearchParams,
): string | null {
  const a = raw.a && VALID_METRIC_KEYS.has(raw.a) ? raw.a : null;
  const compareOn = raw.compare === "1";
  const b = raw.b && VALID_METRIC_KEYS.has(raw.b) ? raw.b : null;

  const out = new URLSearchParams();
  if (a && a !== DEFAULT_METRIC_A) out.set("a", a);
  if (compareOn) {
    out.set("compare", "1");
    if (b && b !== DEFAULT_METRIC_B) out.set("b", b);
  }

  // Reconstruimos los params entrantes en el mismo orden canónico (a, compare, b)
  // para que la comparación de toString() sea robusta. Si el cliente mandó
  // `?b=...&a=...` (orden distinto) lo redirigimos al orden canónico también.
  const incoming = new URLSearchParams();
  if (raw.a !== undefined) incoming.set("a", raw.a);
  if (raw.compare !== undefined) incoming.set("compare", raw.compare);
  if (raw.b !== undefined) incoming.set("b", raw.b);

  if (out.toString() === incoming.toString()) return null;
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}
