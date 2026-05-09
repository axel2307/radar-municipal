"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { geoMercator, geoPath } from "d3-geo";
import { cn, formatScore } from "@/lib/utils";
import partidosRaw from "../data/partidos.json";

interface MapEntry {
  id: string;
  nombre: string;
  score: number | null;
  region: string;
  esPiloto: boolean;
}

/**
 * Tipo de métrica para color/legend/tooltip:
 *  - `score`:        valor 0-100 con paleta divergente rojo→verde (default).
 *  - `vialDensity`:  km/km² (~0.2–2.0) con paleta secuencial YlOrBr.
 */
type MetricKind = "score" | "vialDensity";

interface ProvinceMapProps {
  entries: MapEntry[];
  /** Available metrics to select from */
  metrics?: { key: string; label: string }[];
  /** Currently selected metric key */
  selectedMetric?: string;
  /** Callback when metric changes */
  onMetricChange?: (key: string) => void;
  /** Compact mode for homepage embed */
  compact?: boolean;
  /** Tipo de métrica → controla paleta + formato tooltip + legend. */
  metricKind?: MetricKind;
}

interface PartidoProps {
  id: string;
  nombre: string;
}

const partidos = partidosRaw as unknown as GeoJSON.FeatureCollection<
  GeoJSON.MultiPolygon | GeoJSON.Polygon,
  PartidoProps
>;

const VIEWPORT_W = 800;
const VIEWPORT_H = 520;

// Sprint 25 fix de winding order en build script + center/scale calibrado.
const projection = geoMercator()
  .center([-59.5, -37.5])
  .scale(2900)
  .translate([VIEWPORT_W / 2, VIEWPORT_H / 2]);
const pathFn = geoPath(projection);

const PRECOMPUTED_PATHS: { id: string; nombre: string; d: string }[] =
  partidos.features
    .map((f) => {
      const d = pathFn(f);
      if (!d) return null;
      return { id: f.properties.id, nombre: f.properties.nombre, d };
    })
    .filter((x): x is { id: string; nombre: string; d: string } => x !== null);

function getScoreHex(score: number | null): string {
  if (score == null) return "#e2e8f0";
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#84cc16";
  if (score >= 40) return "#f59e0b";
  if (score >= 25) return "#f97316";
  return "#ef4444";
}

/**
 * Sprint 34 — paleta secuencial YlOrBr para densidad vial rural (km/km²).
 * Bins elegidos sobre la distribución empírica de los 102 partidos:
 * mín=0.22, p25=0.44, p50=0.67, p75=0.99, máx=2.04.
 */
function getDensityHex(density: number | null): string {
  if (density == null) return "#e2e8f0";
  if (density >= 1.0) return "#7c2d12";
  if (density >= 0.8) return "#c2410c";
  if (density >= 0.6) return "#f59e0b";
  if (density >= 0.4) return "#fde68a";
  return "#fef3c7";
}

function formatVialDensity(v: number | null): string {
  if (v == null) return "Sin datos";
  return `${v.toFixed(2)} km/km²`;
}

const SCORE_LEGEND = [
  { color: "#ef4444", label: "<25" },
  { color: "#f97316", label: "25-40" },
  { color: "#f59e0b", label: "40-50" },
  { color: "#84cc16", label: "50-70" },
  { color: "#22c55e", label: "70+" },
  { color: "#e2e8f0", label: "Sin datos" },
];

const DENSITY_LEGEND = [
  { color: "#fef3c7", label: "<0.4" },
  { color: "#fde68a", label: "0.4-0.6" },
  { color: "#f59e0b", label: "0.6-0.8" },
  { color: "#c2410c", label: "0.8-1.0" },
  { color: "#7c2d12", label: "1.0+" },
  { color: "#e2e8f0", label: "Sin datos" },
];

const REGION_LABELS: Record<string, string> = {
  AMBA: "AMBA",
  CONURBANO_SUR: "Conurbano Sur",
  CONURBANO_NORTE: "Conurbano Norte",
  CONURBANO_OESTE: "Conurbano Oeste",
  INTERIOR: "Interior",
  COSTA_ATLANTICA: "Costa Atlántica",
};

// ─────────────────────────────────────────
// Sprint 26 — zoom + pan VIEW-LAYER (sin d3-zoom)
//
// Mantenemos la dependencia de d3 mínima (solo d3-geo, ya estaba en
// Sprint 25). Implementamos zoom/pan a mano con event handlers React.
// Esto evita romper la hidratación SSR de Next.js Turbopack que
// observamos cuando importábamos d3-zoom + d3-selection.
// ─────────────────────────────────────────

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 6;
const ZOOM_STEP = 1.5;

interface Viewport {
  k: number;
  tx: number;
  ty: number;
}

const IDENTITY_VIEW: Viewport = { k: 1, tx: 0, ty: 0 };

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Aplica zoom centrado en un punto (px-svg) actualizando k+tx+ty.
 * El punto bajo el cursor mantiene su posición tras el zoom.
 */
function zoomAt(view: Viewport, factor: number, cx: number, cy: number): Viewport {
  const newK = clamp(view.k * factor, MIN_ZOOM, MAX_ZOOM);
  const realFactor = newK / view.k;
  const newTx = cx - (cx - view.tx) * realFactor;
  const newTy = cy - (cy - view.ty) * realFactor;
  return { k: newK, tx: newTx, ty: newTy };
}

export function ProvinceMap({
  entries,
  metrics,
  selectedMetric,
  onMetricChange,
  compact = false,
  metricKind = "score",
}: ProvinceMapProps) {
  const colorFn = metricKind === "vialDensity" ? getDensityHex : getScoreHex;
  const formatValue =
    metricKind === "vialDensity" ? formatVialDensity : formatScore;
  const legendItems =
    metricKind === "vialDensity" ? DENSITY_LEGEND : SCORE_LEGEND;
  const legendLabel =
    metricKind === "vialDensity" ? "km/km²:" : "Score:";
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [view, setView] = useState<Viewport>(IDENTITY_VIEW);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Pan state — sólo durante drag activo. Ref evita re-renders por movimiento.
  const dragRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);

  const zoomEnabled = !compact;

  const byId = useMemo(() => {
    const m = new Map<string, MapEntry>();
    for (const e of entries) m.set(e.id, e);
    return m;
  }, [entries]);

  const hovered = hoveredId ? byId.get(hoveredId) ?? null : null;
  const height = compact ? 240 : 520;

  /**
   * Convierte coordenadas de evento (clientX/Y) a coordenadas del viewBox
   * SVG (0..VIEWPORT_W × 0..VIEWPORT_H), considerando que el SVG escala
   * al contenedor con `preserveAspectRatio=xMidYMid meet`.
   */
  const clientToSvg = useCallback((clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [VIEWPORT_W / 2, VIEWPORT_H / 2];
    const rect = svg.getBoundingClientRect();
    // El SVG escala manteniendo aspect ratio. Calculamos la escala efectiva.
    const renderedAspect = rect.width / rect.height;
    const viewboxAspect = VIEWPORT_W / VIEWPORT_H;
    let scale: number, offsetX: number, offsetY: number;
    if (renderedAspect > viewboxAspect) {
      // El SVG es más ancho que el viewBox — hay padding horizontal.
      scale = rect.height / VIEWPORT_H;
      offsetX = (rect.width - VIEWPORT_W * scale) / 2;
      offsetY = 0;
    } else {
      scale = rect.width / VIEWPORT_W;
      offsetX = 0;
      offsetY = (rect.height - VIEWPORT_H * scale) / 2;
    }
    return [
      (clientX - rect.left - offsetX) / scale,
      (clientY - rect.top - offsetY) / scale,
    ];
  }, []);

  // Wheel zoom: solo con Ctrl/Cmd para no robar el scroll vertical.
  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      if (!zoomEnabled) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const [cx, cy] = clientToSvg(e.clientX, e.clientY);
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setView((v) => zoomAt(v, factor, cx, cy));
    },
    [zoomEnabled, clientToSvg],
  );

  // Pan via pointer drag. Inicia solo si NO hay path interactivo bajo el
  // pointer (los partidos manejan su propio hover/click).
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!zoomEnabled) return;
      // Si el target es un path con role=button, dejamos que el path
      // maneje el evento (click navega).
      const tgt = e.target as SVGElement;
      if (tgt.tagName === "path" && tgt.getAttribute("role") === "button") {
        return;
      }
      // Pan desde fondo.
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startTx: view.tx,
        startTy: view.ty,
      };
    },
    [zoomEnabled, view.tx, view.ty],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = VIEWPORT_W / rect.width;
      const scaleY = VIEWPORT_H / rect.height;
      const dx = (e.clientX - drag.startX) * scaleX;
      const dy = (e.clientY - drag.startY) * scaleY;
      setView((v) => ({ ...v, tx: drag.startTx + dx, ty: drag.startTy + dy }));
    },
    [],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragRef.current = null;
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    setView((v) => zoomAt(v, ZOOM_STEP, VIEWPORT_W / 2, VIEWPORT_H / 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setView((v) => zoomAt(v, 1 / ZOOM_STEP, VIEWPORT_W / 2, VIEWPORT_H / 2));
  }, []);

  const handleReset = useCallback(() => {
    setView(IDENTITY_VIEW);
  }, []);

  // Sprint 26: usar listener `wheel` non-passive bindeado al SVG en mount
  // para poder hacer e.preventDefault() (React 19 default es passive).
  useEffect(() => {
    if (!zoomEnabled) return;
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const renderedAspect = rect.width / rect.height;
      const viewboxAspect = VIEWPORT_W / VIEWPORT_H;
      let scale: number, offsetX: number, offsetY: number;
      if (renderedAspect > viewboxAspect) {
        scale = rect.height / VIEWPORT_H;
        offsetX = (rect.width - VIEWPORT_W * scale) / 2;
        offsetY = 0;
      } else {
        scale = rect.width / VIEWPORT_W;
        offsetX = 0;
        offsetY = (rect.height - VIEWPORT_H * scale) / 2;
      }
      const cx = (e.clientX - rect.left - offsetX) / scale;
      const cy = (e.clientY - rect.top - offsetY) / scale;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setView((v) => zoomAt(v, factor, cx, cy));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomEnabled]);

  const transformStr = `translate(${view.tx},${view.ty}) scale(${view.k})`;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card",
        compact ? "p-3" : "p-4",
      )}
    >
      {/* Metric selector */}
      {metrics && metrics.length > 0 && onMetricChange && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Métrica:
          </span>
          <select
            value={selectedMetric ?? ""}
            onChange={(e) => onMetricChange(e.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm"
          >
            {metrics.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tooltip — siempre presente para evitar layout shift al hover */}
      <div
        className={cn(
          "mb-3 flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm",
          !hovered && "opacity-60",
        )}
        aria-live="polite"
      >
        {hovered ? (
          <>
            <div
              className="h-4 w-4 rounded-sm shrink-0"
              style={{ backgroundColor: colorFn(hovered.score) }}
            />
            <span className="font-medium">{hovered.nombre}</span>
            <span className="text-muted-foreground">
              {REGION_LABELS[hovered.region] ?? hovered.region}
            </span>
            {hovered.esPiloto && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                Piloto
              </span>
            )}
            <span className="ml-auto font-semibold">
              {formatValue(hovered.score)}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">
            Pasá el mouse sobre un partido para ver su detalle. Click para abrir
            su ficha. {zoomEnabled ? "Ctrl+rueda para zoom, arrastre para mover." : ""}
          </span>
        )}
      </div>

      {/* Map */}
      <div
        style={{ height }}
        className="relative w-full overflow-hidden rounded-md bg-white"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWPORT_W} ${VIEWPORT_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: "100%",
            height: "100%",
            cursor: zoomEnabled ? (dragRef.current ? "grabbing" : "grab") : "default",
            touchAction: "none",
          }}
          role="img"
          aria-label="Mapa de la Provincia de Buenos Aires con sus 135 partidos"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <g transform={transformStr}>
            {PRECOMPUTED_PATHS.map((p) => {
              const entry = byId.get(p.id);
              const fill = colorFn(entry?.score ?? null);
              const isHovered = hoveredId === p.id;
              const isPiloto = entry?.esPiloto ?? false;
              return (
                <path
                  key={p.id}
                  d={p.d}
                  fill={fill}
                  stroke={
                    isHovered
                      ? "rgb(15 23 42)"
                      : isPiloto
                        ? "rgb(99 102 241 / 0.95)"
                        : "rgb(100 116 139 / 0.5)"
                  }
                  // Stroke escalado inversamente al zoom para mantener
                  // grosor visual consistente al hacer zoom.
                  strokeWidth={
                    (isHovered ? 1.5 : isPiloto ? 1.1 : 0.5) / view.k
                  }
                  style={{
                    cursor: entry ? "pointer" : "default",
                    transition: "filter 120ms",
                    filter: isHovered ? "brightness(1.12)" : undefined,
                  }}
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => entry && router.push(`/municipios/${p.id}`)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && entry) {
                      e.preventDefault();
                      router.push(`/municipios/${p.id}`);
                    }
                  }}
                  tabIndex={entry ? 0 : -1}
                  role={entry ? "button" : undefined}
                  aria-label={
                    entry
                      ? `${entry.nombre}: ${formatValue(entry.score)}`
                      : p.nombre
                  }
                >
                  <title>
                    {p.nombre}
                    {entry?.score != null
                      ? ` — ${formatValue(entry.score)}`
                      : entry
                        ? " — sin datos"
                        : ""}
                  </title>
                </path>
              );
            })}
          </g>
        </svg>

        {/* Zoom controls — solo en modo no-compact. */}
        {zoomEnabled && (
          <div className="absolute right-2 top-2 flex flex-col gap-1 rounded-md border border-border bg-card/95 p-1 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={view.k >= MAX_ZOOM}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label="Acercar"
              title="Acercar (Ctrl + rueda del mouse para zoom continuo)"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="8" y1="3" x2="8" y2="13" />
                <line x1="3" y1="8" x2="13" y2="8" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={view.k <= MIN_ZOOM}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label="Alejar"
              title="Alejar"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="8" x2="13" y2="8" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={view.k === 1 && view.tx === 0 && view.ty === 0}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label="Resetear vista"
              title="Resetear vista"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8 a5 5 0 1 0 1.5 -3.5" />
                <polyline points="3 2 3 5 6 5" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        className={cn(
          "mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground",
          compact && "mt-2",
        )}
      >
        <span>{legendLabel}</span>
        {legendItems.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
        {!compact && (
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-3 w-5 rounded-sm bg-gray-200"
              style={{ outline: "1.5px solid rgb(99 102 241 / 0.95)" }}
            />
            Piloto
          </span>
        )}
        <span className="ml-auto text-[11px]">
          Geometría:{" "}
          <a
            href="https://catalogo.datos.gba.gob.ar/dataset/partidos"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Datos Abiertos PBA / ARBA
          </a>{" "}
          · CC-BY 4.0
        </span>
      </div>
    </div>
  );
}
