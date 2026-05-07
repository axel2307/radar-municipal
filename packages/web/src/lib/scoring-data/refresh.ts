import type { GlobalRefreshManifest } from "@radar-municipal/core";

import autoRefreshManifest from "../../data/auto-refresh-manifest.json";

// Cast del JSON estático al tipo. Sprint 27 generó el archivo; si por
// alguna razón no existe (e.g. dev local fresco sin haber corrido el
// consolidate), Next.js falla al import — eso es el comportamiento
// deseado, mejor explícito que silencioso.
const manifest = autoRefreshManifest as unknown as GlobalRefreshManifest;

/**
 * Devuelve el manifest unificado del último refresh mensual. Sprint 27
 * lo emite vía `pnpm consolidate:manifest` después de cada corrida del
 * cron. Sprint 28: la UI lo lee para mostrar frescura.
 */
export function getGlobalRefreshManifest(): GlobalRefreshManifest {
  return manifest;
}

/**
 * Edad del refresh en milisegundos + un texto legible en español
 * argentino. Usa la fecha-actual del navegador, así que es client-safe;
 * evitar invocar en server components a menos que `Date.now()` no
 * importe (acepta el momento del build como referencia).
 */
export function getRefreshAge(manifest: GlobalRefreshManifest): {
  ms: number;
  humanAR: string;
} {
  const refreshedAt = new Date(manifest.refreshedAt);
  const now = Date.now();
  const ms = now - refreshedAt.getTime();
  return { ms, humanAR: humanReadableAge(ms) };
}

/**
 * Health derivado del estado del último run + la edad. Útil para colorize
 * banners e indicadores.
 *
 * - `healthy`: todos los runs success Y refresh < 35 días.
 * - `degraded`: algún run failed O refresh entre 35 y 60 días.
 * - `stale`: refresh > 60 días.
 */
export function getRefreshHealth(
  manifest: GlobalRefreshManifest,
): "healthy" | "degraded" | "stale" {
  const { ms } = getRefreshAge(manifest);
  const day = 24 * 60 * 60 * 1000;
  if (ms > 60 * day) return "stale";
  const anyFailed = manifest.runs.some((r) => r.status === "failed");
  if (anyFailed || ms > 35 * day) return "degraded";
  return "healthy";
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function humanReadableAge(ms: number): string {
  if (ms < 0) return "en el futuro"; // edge: clock skew
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return months === 1 ? "hace 1 mes" : `hace ${months} meses`;
  }
  if (days >= 1) return days === 1 ? "hace 1 día" : `hace ${days} días`;
  if (hours >= 1) return hours === 1 ? "hace 1 hora" : `hace ${hours} horas`;
  if (minutes >= 1)
    return minutes === 1 ? "hace 1 minuto" : `hace ${minutes} minutos`;
  return "hace segundos";
}

/**
 * Format de fecha absoluta en es-AR para tooltip o display secundario.
 * Ejemplo: "6 de mayo de 2026, 18:34".
 */
export function formatRefreshAbsolute(manifest: GlobalRefreshManifest): string {
  const d = new Date(manifest.refreshedAt);
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}
