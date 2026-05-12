/**
 * Sprint 39 — Open Graph image dinámica para `/mapa`.
 *
 * Renderiza una preview 1200×630 que refleja el state del comparador
 * según query params:
 *   - `?a=<metric>`             single mode con métrica A
 *   - `?compare=1&b=<metric>`   split mode (A scoreTotal default, B custom)
 *   - `?a=...&compare=1&b=...`  split mode full custom
 *
 * Llamado desde `app/mapa/page.tsx` via generateMetadata({ searchParams }).
 *
 * Por qué un route handler y no `opengraph-image.tsx`: el file convention
 * recibe `params` (route), no `searchParams` (query). Sprint 38 puso el
 * state en searchParams, así que necesitamos un endpoint que las lea.
 */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// ─── Paletas (duplicadas del ProvinceMap por ser server-side; el costo es
// bajo y evita import circular client/server) ─────────────────────────────

const SCORE_PALETTE = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"];
const DENSITY_PALETTE = ["#fef3c7", "#fde68a", "#f59e0b", "#c2410c", "#7c2d12"];
const PESOS_PALETTE = ["#feebe2", "#fbb4b9", "#f768a1", "#c51b8a", "#7a0177"];

// ─── Metric → display info ────────────────────────────────────────────────

interface MetricInfo {
  label: string;
  palette: string[];
  unit: string;
}

const METRICS: Record<string, MetricInfo> = {
  scoreTotal: { label: "Score total", palette: SCORE_PALETTE, unit: "0-100" },
  scoreTransparencia: { label: "Transparencia", palette: SCORE_PALETTE, unit: "0-100" },
  scoreFiscal: { label: "Fiscal", palette: SCORE_PALETTE, unit: "0-100" },
  scoreNormativa: { label: "Normativa", palette: SCORE_PALETTE, unit: "0-100" },
  scoreParticipacion: { label: "Participación", palette: SCORE_PALETTE, unit: "0-100" },
  scoreGastoFuncion: { label: "Gasto por función", palette: SCORE_PALETTE, unit: "0-100" },
  scoreEconomiaLocal: { label: "Economía local", palette: SCORE_PALETTE, unit: "0-100" },
  scorePresionImpositiva: { label: "Presión impositiva", palette: SCORE_PALETTE, unit: "0-100" },
  scoreServiciosBasicos: { label: "Servicios básicos", palette: SCORE_PALETTE, unit: "0-100" },
  scoreEducacionSalud: { label: "Educación y salud", palette: SCORE_PALETTE, unit: "0-100" },
  scoreConectividad: { label: "Conectividad", palette: SCORE_PALETTE, unit: "0-100" },
  scoreEspacioPublico: { label: "Espacio público", palette: SCORE_PALETTE, unit: "0-100" },
  scoreSeguridadVial: { label: "Seguridad vial", palette: SCORE_PALETTE, unit: "0-100" },
  vialDensity: { label: "Densidad vial rural", palette: DENSITY_PALETTE, unit: "km/km²" },
  pesosPorKm: { label: "Pesos por km de red vial", palette: PESOS_PALETTE, unit: "$/km" },
};

function resolveMetric(key: string | null, fallback: string): MetricInfo {
  if (key && key in METRICS) return METRICS[key];
  return METRICS[fallback];
}

// ─── Swatch (color strip + label) ────────────────────────────────────────

function Swatch({
  metric,
  width,
}: {
  metric: MetricInfo;
  width: number;
}) {
  const swatchWidth = width;
  const cellWidth = swatchWidth / metric.palette.length;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: swatchWidth,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: "30px",
          fontWeight: 700,
          color: "white",
          lineHeight: 1.1,
        }}
      >
        {metric.label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: "18px",
          color: "#94a3b8",
          fontWeight: 500,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
        }}
      >
        {metric.unit}
      </div>
      <div style={{ display: "flex", width: swatchWidth, height: "60px" }}>
        {metric.palette.map((color, i) => (
          <div
            key={i}
            style={{
              width: cellWidth,
              height: "60px",
              backgroundColor: color,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Handler ─────────────────────────────────────────────────────────────

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const a = resolveMetric(searchParams.get("a"), "scoreTotal");
  const compare = searchParams.get("compare") === "1";
  const b = resolveMetric(searchParams.get("b"), "scoreFiscal");

  const swatchWidth = compare ? 520 : 1000;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#1e3a5f",
          padding: "56px 64px",
          fontFamily: "sans-serif",
          color: "white",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              backgroundColor: "#f59e0b",
              borderRadius: "10px",
              fontSize: "22px",
              fontWeight: 800,
              color: "#1e3a5f",
            }}
          >
            RM
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "#94a3b8",
            }}
          >
            Radar Municipal
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: "54px",
            fontWeight: 800,
            lineHeight: 1.1,
            color: "white",
            marginBottom: "12px",
          }}
        >
          {compare ? "Comparador de métricas" : "Mapa de Buenos Aires"}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "22px",
            color: "#94a3b8",
            fontWeight: 500,
            marginBottom: "40px",
          }}
        >
          {compare
            ? `${a.label} × ${b.label} sobre los 135 partidos`
            : `${a.label} sobre los 135 partidos`}
        </div>

        {/* Swatches */}
        <div
          style={{
            display: "flex",
            flex: 1,
            gap: "40px",
            alignItems: "center",
          }}
        >
          <Swatch metric={a} width={swatchWidth} />
          {compare && <Swatch metric={b} width={swatchWidth} />}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #334155",
            paddingTop: "20px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "20px",
              color: "#94a3b8",
              fontWeight: 500,
            }}
          >
            {compare
              ? "Cada mapa con su paleta — comparable lado a lado"
              : "Click en cualquier partido para ver su ficha"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "20px",
              color: "#64748b",
              fontWeight: 500,
            }}
          >
            radarmunicipal.ar
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
