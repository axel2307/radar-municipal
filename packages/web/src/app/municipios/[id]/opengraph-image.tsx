import { ImageResponse } from "next/og";
import { getMunicipioById, MUNICIPIOS } from "@radar-municipal/core";
import { getRanking } from "@/lib/scoring-data";

export const alt = "Radar Municipal - Ficha de municipio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return MUNICIPIOS.map((m) => ({ id: m.id }));
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function getScoreBg(score: number): string {
  if (score >= 70) return "#166534";
  if (score >= 40) return "#92400e";
  return "#991b1b";
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const municipio = getMunicipioById(id);
  const ranking = getRanking();
  const entry = ranking.find((r) => r.municipio.id === id);

  const nombre = municipio?.nombre ?? "Municipio";
  const partido = municipio?.partido ?? "";
  const region = municipio?.region ?? "";
  const score = entry?.scoreTotal ?? 0;
  const posicion = entry?.posicion ?? 0;
  const totalMunicipios = ranking.length;

  const scoreColor = getScoreColor(score);
  const scoreBg = getScoreBg(score);

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
          position: "relative",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
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

        {/* Center content */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            gap: "40px",
          }}
        >
          {/* Left: Municipality info */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "64px",
                fontWeight: 800,
                lineHeight: 1.1,
                color: "white",
              }}
            >
              {nombre}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "26px",
                color: "#94a3b8",
                fontWeight: 500,
              }}
            >
              {partido !== nombre
                ? `Partido de ${partido} · ${region.replace(/_/g, " ")}`
                : region.replace(/_/g, " ")}
            </div>
          </div>

          {/* Right: Score circle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "160px",
                height: "160px",
                borderRadius: "80px",
                backgroundColor: scoreBg,
                border: `6px solid ${scoreColor}`,
                fontSize: "56px",
                fontWeight: 800,
                color: scoreColor,
              }}
            >
              {Math.round(score)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "18px",
                color: "#94a3b8",
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
              }}
            >
              Score Total
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #334155",
            paddingTop: "20px",
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
            {`Posición #${posicion} de ${totalMunicipios}`}
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
    { ...size },
  );
}
