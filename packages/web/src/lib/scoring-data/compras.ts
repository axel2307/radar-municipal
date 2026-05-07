/**
 * Sprint 17 — loader de Pilar 4 (Compras públicas).
 *
 * Lee `auto-contrataciones.json` (lista plana de Contratacion) y
 * `auto-contrataciones-aggregates.json` (agregados por municipio + año).
 * Sprint 17 cubre 2/135 municipios reales: Quilmes (CKAN, sin proveedor) y
 * Carlos Casares (gobabierto.ar, con proveedor → HHI calculable).
 *
 * No hay archivo "pilot" todavía: ningún piloto del Sprint 1 publica
 * contrataciones en formato parseable. Cuando aparezca, mismo merge pattern
 * que `presion-impositiva.ts`: piloto primero, auto después.
 */

import {
  MUNICIPIOS,
  type Contratacion,
  type ContratacionesAggregate,
  type Municipio,
  type RefreshManifest,
} from "@radar-municipal/core";

import autoContratacionesJson from "../../data/auto-contrataciones.json";
import autoAggregatesJson from "../../data/auto-contrataciones-aggregates.json";
import autoManifestJson from "../../data/auto-contrataciones-manifest.json";

// ─────────────────────────────────────────
// Carga eager (build time para SSG)
// ─────────────────────────────────────────

const allContrataciones =
  autoContratacionesJson as unknown as Contratacion[];
const allAggregates =
  autoAggregatesJson as unknown as ContratacionesAggregate[];
const refreshManifest = autoManifestJson as unknown as RefreshManifest;

// ─────────────────────────────────────────
// Tipos derivados (UI-facing)
// ─────────────────────────────────────────

/**
 * Vista por municipio para `/compras`. Combina metadata de MUNICIPIOS
 * (nombre, región) con stats agregadas (sumando todos los años) más el
 * último HHI conocido.
 */
export interface ComprasMunicipioRow {
  municipio: Municipio;
  /** Años cubiertos por nuestros datos (puede ser []). */
  aniosCubiertos: number[];
  /** Total contrataciones acumuladas (todos los años del municipio). */
  totalContrataciones: number;
  /** Suma de presupuestos en ARS nominales (todos los años). */
  montoTotalAcumulado: number;
  /**
   * HHI más reciente disponible. Null si ningún dataset del municipio
   * permite calcular HHI (caso Quilmes: sin proveedor).
   */
  hhiMasReciente: number | null;
  /** Año del HHI más reciente. */
  anioHhiMasReciente: number | null;
  /** Proveedores únicos del año más reciente con HHI. */
  proveedoresUnicosMasReciente: number | null;
  /** URL del dataset más reciente (auditable). */
  fuenteUrlMasReciente: string | null;
}

export interface ComprasStats {
  municipiosConDatos: number;
  totalMunicipios: number;
  totalContrataciones: number;
  totalAniosCubiertos: number;
  conHhi: number;
  hhiMediano: number | null;
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[m - 1] + sorted[m]) / 2);
  }
  return sorted[m];
}

// ─────────────────────────────────────────
// API
// ─────────────────────────────────────────

/**
 * Una fila por municipio CON datos (no incluye los 133 sin contrataciones).
 * Ordenado por monto total descendente. Útil para el tab "qué tenemos".
 */
export function getComprasMunicipiosConDatos(): ComprasMunicipioRow[] {
  // Index de aggregates por municipio.
  const byMunicipio = new Map<string, ContratacionesAggregate[]>();
  for (const a of allAggregates) {
    const list = byMunicipio.get(a.municipioId) ?? [];
    list.push(a);
    byMunicipio.set(a.municipioId, list);
  }

  const out: ComprasMunicipioRow[] = [];
  for (const [municipioId, aggs] of byMunicipio) {
    const municipio = MUNICIPIOS.find((m) => m.id === municipioId);
    if (!municipio) continue;
    const aniosCubiertos = [...new Set(aggs.map((a) => a.anio))].sort((a, b) => a - b);
    const totalContrataciones = aggs.reduce((s, a) => s + a.totalContrataciones, 0);
    const montoTotalAcumulado = aggs.reduce((s, a) => s + a.montoTotalPresupuesto, 0);
    // HHI más reciente: el aggregate del año más alto que tenga HHI.
    const conHhi = aggs.filter((a) => a.hhiProveedores != null).sort((x, y) => y.anio - x.anio);
    const masReciente = conHhi[0] ?? null;
    out.push({
      municipio,
      aniosCubiertos,
      totalContrataciones,
      montoTotalAcumulado,
      hhiMasReciente: masReciente?.hhiProveedores ?? null,
      anioHhiMasReciente: masReciente?.anio ?? null,
      proveedoresUnicosMasReciente: masReciente?.proveedoresUnicos ?? null,
      fuenteUrlMasReciente: aggs.sort((x, y) => y.anio - x.anio)[0]?.fuenteUrl ?? null,
    });
  }
  return out.sort((a, b) => b.montoTotalAcumulado - a.montoTotalAcumulado);
}

/** Stats agregados para tarjetas KPI. */
export function getComprasStats(): ComprasStats {
  const filas = getComprasMunicipiosConDatos();
  const hhis = allAggregates
    .map((a) => a.hhiProveedores)
    .filter((v): v is number => v != null);
  const aniosTotal = new Set<string>();
  for (const a of allAggregates) aniosTotal.add(`${a.municipioId}-${a.anio}`);
  return {
    municipiosConDatos: filas.length,
    totalMunicipios: MUNICIPIOS.length,
    totalContrataciones: allContrataciones.length,
    totalAniosCubiertos: aniosTotal.size,
    conHhi: hhis.length,
    hhiMediano: median(hhis),
  };
}

/** Todos los aggregates (un row por municipio + año). Usado para tabla detallada. */
export function getComprasAggregates(): ContratacionesAggregate[] {
  // Stable: orden por municipio asc, año asc.
  return [...allAggregates].sort(
    (a, b) => a.municipioId.localeCompare(b.municipioId) || a.anio - b.anio,
  );
}

/** Acceso puntual: contrataciones crudas de un municipio (todas las que tenemos). */
export function getContratacionesByMunicipio(municipioId: string): Contratacion[] {
  return allContrataciones.filter((c) => c.municipioId === municipioId);
}

/**
 * Manifest del último refresh. La página `/compras` lo lee para mostrar
 * la fecha de última actualización + qué fuentes corrieron OK.
 */
export function getComprasManifest(): RefreshManifest {
  return refreshManifest;
}
