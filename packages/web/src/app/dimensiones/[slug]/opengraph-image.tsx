import { ImageResponse } from "next/og";
import { getDimensionBySlug, getDimensionSlugs } from "@/lib/scoring-data";

export const alt = "Radar Municipal - Dimensión";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getDimensionSlugs().map((slug) => ({ slug }));
}

function scoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getDimensionBySlug(slug);
  const label = data?.label ?? "Dimensión";
  const top3 = (data?.ranking ?? []).filter((r) => r.score !== null).slice(0, 3);

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
        {/* Header */}
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
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "#94a3b8",
            }}
          >
            Radar Municipal · Dimensión
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "32px",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "64px",
              fontWeight: 800,
              lineHeight: 1.05,
              color: "white",
              maxWidth: "1050px",
            }}
          >
            {label}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              color: "#cbd5e1",
              fontWeight: 500,
            }}
          >
            Ranking de municipios piloto
          </div>
        </div>

        {/* Top 3 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "32px",
            gap: "14px",
            flex: 1,
          }}
        >
          {top3.map((entry, idx) => (
            <div
              key={entry.municipioId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                padding: "16px 20px",
                backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: "12px",
                border: "1px solid #334155",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "44px",
                  height: "44px",
                  borderRadius: "22px",
                  backgroundColor: "#f59e0b",
                  color: "#1e3a5f",
                  fontSize: "22px",
                  fontWeight: 800,
                }}
              >
                {idx + 1}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "30px",
                  fontWeight: 700,
                  color: "white",
                  flex: 1,
                }}
              >
                {entry.nombre}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "30px",
                  fontWeight: 800,
                  color: scoreColor(entry.score ?? 0),
                }}
              >
                {Math.round(entry.score ?? 0)}
              </div>
            </div>
          ))}
          {top3.length === 0 && (
            <div
              style={{
                display: "flex",
                fontSize: "22px",
                color: "#94a3b8",
              }}
            >
              Sin datos disponibles todavía.
            </div>
          )}
        </div>

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            borderTop: "1px solid #334155",
            paddingTop: "16px",
            marginTop: "16px",
            fontSize: "20px",
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          radarmunicipal.ar
        </div>
      </div>
    ),
    { ...size },
  );
}
