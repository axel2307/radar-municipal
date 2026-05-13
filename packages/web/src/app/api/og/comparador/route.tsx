/**
 * Sprint 44A — Open Graph image dinámica para `/comparador`.
 *
 * Renderiza una preview 1200×630 con los 2-3 municipios elegidos + sus
 * score totales side-by-side. Mismo patrón que /api/og/mapa (Sprint 39).
 *
 * URL: /api/og/comparador?a=060056&b=060791&c=060357
 */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import {
  MUNICIPIOS_PILOTO,
  type Municipio,
} from "@radar-municipal/core";
import { getRanking } from "@/lib/scoring-data";

export const runtime = "edge";

function getScoreBg(score: number): string {
  if (score >= 70) return "#166534";
  if (score >= 40) return "#92400e";
  return "#991b1b";
}

function getScoreBorder(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

const RADAR_COLORS = ["#3b82f6", "#f59e0b", "#10b981"];

interface ResolvedSlot {
  municipio: Municipio;
  score: number;
  posicion: number;
}

function resolveSlot(
  id: string | null,
  ranking: ReturnType<typeof getRanking>,
): ResolvedSlot | null {
  if (!id) return null;
  const municipio = MUNICIPIOS_PILOTO.find((m) => m.id === id);
  if (!municipio) return null;
  const entry = ranking.find((r) => r.municipio.id === id);
  if (!entry) return null;
  return { municipio, score: entry.scoreTotal, posicion: entry.posicion };
}

function Card({ slot, color }: { slot: ResolvedSlot; color: string }) {
  const bg = getScoreBg(slot.score);
  const border = getScoreBorder(slot.score);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        gap: "16px",
        padding: "24px",
        borderTop: `4px solid ${color}`,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: "26px",
          fontWeight: 800,
          color: "white",
          lineHeight: 1.1,
        }}
      >
        {slot.municipio.nombre}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "120px",
          height: "120px",
          borderRadius: "60px",
          backgroundColor: bg,
          border: `5px solid ${border}`,
          fontSize: "44px",
          fontWeight: 800,
          color: border,
          alignSelf: "center",
        }}
      >
        {Math.round(slot.score)}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: "16px",
          color: "#94a3b8",
          fontWeight: 500,
          alignSelf: "center",
        }}
      >
        Posición #{slot.posicion}
      </div>
    </div>
  );
}

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ranking = getRanking();

  const slots: (ResolvedSlot | null)[] = [
    resolveSlot(searchParams.get("a"), ranking),
    resolveSlot(searchParams.get("b"), ranking),
    resolveSlot(searchParams.get("c"), ranking),
  ];
  const filled = slots.filter((s): s is ResolvedSlot => s !== null);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#1e3a5f",
          padding: "48px 56px",
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
            marginBottom: "24px",
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
            Radar Municipal · Comparador
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: filled.length >= 2 ? "44px" : "48px",
            fontWeight: 800,
            lineHeight: 1.15,
            color: "white",
            marginBottom: "32px",
          }}
        >
          {filled.length === 0
            ? "Compará municipios bonaerenses"
            : filled.length === 1
              ? `${filled[0].municipio.nombre} en el ranking provincial`
              : filled.map((s) => s.municipio.nombre).join(" · ")}
        </div>

        {/* Cards */}
        {filled.length > 0 ? (
          <div
            style={{
              display: "flex",
              flex: 1,
              gap: "20px",
              alignItems: "stretch",
            }}
          >
            {filled.map((slot, i) => (
              <Card key={slot.municipio.id} slot={slot} color={RADAR_COLORS[i]} />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              color: "#94a3b8",
            }}
          >
            Elegí 2-3 piloto para verlos lado a lado.
          </div>
        )}

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #334155",
            paddingTop: "16px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "18px",
              color: "#94a3b8",
              fontWeight: 500,
            }}
          >
            12 dimensiones · Datos auditables
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "18px",
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
