import { ImageResponse } from "next/og";

export const alt = "Radar Municipal — Ranking de municipios de Buenos Aires";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#1e3a5f",
          padding: "64px 72px",
          fontFamily: "sans-serif",
          color: "white",
        }}
      >
        {/* Header brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "60px",
              height: "60px",
              backgroundColor: "#f59e0b",
              borderRadius: "12px",
              fontSize: "26px",
              fontWeight: 800,
              color: "#1e3a5f",
            }}
          >
            RM
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "#94a3b8",
            }}
          >
            Radar Municipal
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "72px",
              fontWeight: 800,
              lineHeight: 1.05,
              color: "white",
              maxWidth: "950px",
            }}
          >
            Ranking de municipios de Buenos Aires
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "30px",
              color: "#cbd5e1",
              fontWeight: 500,
              maxWidth: "1000px",
              lineHeight: 1.3,
            }}
          >
            Datos públicos, comparables y auditables de los 135 municipios bonaerenses.
          </div>
        </div>

        {/* Bottom stats */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            borderTop: "1px solid #334155",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div
              style={{
                display: "flex",
                fontSize: "36px",
                fontWeight: 800,
                color: "#f59e0b",
              }}
            >
              135
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "16px",
                color: "#94a3b8",
                fontWeight: 500,
              }}
            >
              Municipios
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div
              style={{
                display: "flex",
                fontSize: "36px",
                fontWeight: 800,
                color: "#f59e0b",
              }}
            >
              11
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "16px",
                color: "#94a3b8",
                fontWeight: 500,
              }}
            >
              Dimensiones
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div
              style={{
                display: "flex",
                fontSize: "36px",
                fontWeight: 800,
                color: "#f59e0b",
              }}
            >
              100%
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "16px",
                color: "#94a3b8",
                fontWeight: 500,
              }}
            >
              Datos abiertos
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              alignItems: "flex-end",
              fontSize: "22px",
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
