/**
 * Sprint 20 — loader de Pilar 2 Stock de Deuda multi-municipio.
 *
 * Lee `auto-deuda.json` (lista plana de StockDeudaSnapshot) +
 * `auto-deuda-manifest.json`. Sprint 20 cubre 4 municipios reales
 * (Berisso, Carmen de Areco, Lincoln, F. Ameghino) parseados de
 * Planilla C de la Ley 12462/13295 PBA.
 *
 * Para cada municipio devolvemos el snapshot MÁS RECIENTE — la UI sólo
 * muestra ese; series históricas multi-snapshot quedan para Sprint 21+
 * si tienen tracción.
 */

import {
  type StockDeudaSnapshot,
  type RefreshManifest,
} from "@radar-municipal/core";

import autoDeudaJson from "../../data/auto-deuda.json";
import autoDeudaManifestJson from "../../data/auto-deuda-manifest.json";

const allSnapshots = autoDeudaJson as unknown as StockDeudaSnapshot[];
const manifest = autoDeudaManifestJson as unknown as RefreshManifest;

/**
 * Serie completa de snapshots para un municipio, dedupeada por fecha y
 * ordenada ascendentemente. Si dos URLs upstream resuelven al mismo
 * `fechaSnapshot` (caso Carmen de Areco Sprint 20: 2 archivos = mismo
 * corte Q4 2024), gana el primero encontrado. Vacío si no hay datos.
 *
 * Sprint 22: nueva API. Permite a la UI mostrar trayectoria temporal
 * cuando el municipio tiene ≥2 cortes.
 */
export function getStockDeudaSeriesByMunicipio(
  municipioId: string,
): StockDeudaSnapshot[] {
  const matches = allSnapshots.filter((s) => s.municipioId === municipioId);
  if (matches.length === 0) return [];
  // Dedup por fecha: el primero encontrado gana.
  const seen = new Set<string>();
  const dedup: StockDeudaSnapshot[] = [];
  for (const s of matches) {
    if (seen.has(s.fechaSnapshot)) continue;
    seen.add(s.fechaSnapshot);
    dedup.push(s);
  }
  return dedup.sort((a, b) => a.fechaSnapshot.localeCompare(b.fechaSnapshot));
}

/**
 * Snapshot más reciente por municipio. Wrapper sobre la serie dedupeada
 * — si dos snapshots tienen la misma fecha máxima, devuelve el primero.
 */
export function getStockDeudaByMunicipio(
  municipioId: string,
): StockDeudaSnapshot | null {
  const series = getStockDeudaSeriesByMunicipio(municipioId);
  if (series.length === 0) return null;
  return series[series.length - 1];
}

/** Manifest del último refresh — útil para mostrar fecha en UI. */
export function getDeudaManifest(): RefreshManifest {
  return manifest;
}

/** Todos los snapshots, sin dedup (auditoría). */
export function getAllStockDeudaSnapshots(): StockDeudaSnapshot[] {
  return [...allSnapshots];
}
