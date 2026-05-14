import { ImageResponse } from "next/og";
import { getComprasStats } from "@/lib/scoring-data";

/**
 * Sprint 48 — OG image estática para /compras (Pilar 4).
 *
 * Genera al build time desde los stats actuales. Cuando el cron mensual
 * refrescha auto-contrataciones.json, la próxima build regenera la
 * imagen con los nuevos números.
 *
 * Mismo patrón que /calidad-datos/opengraph-image.tsx.
 */
export const alt = "Radar Municipal — Compras públicas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function hhiLabel(hhi: number | null): string {
  if (hhi == null) return "Sin datos suficientes";
  if (hhi < 1500) return "Competitivo";
  if (hhi <= 2500) return "Moderadamente concentrado";
  return "Altamente concentrado";
}

export default function Image() {
  const stats = getComprasStats();

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
            Radar Municipal · Pilar 4
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: "56px",
            fontWeight: 800,
            lineHeight: 1.1,
            color: "white",
            marginBottom: "12px",
          }}
        >
          Compras públicas
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
          Concursos, licitaciones y adjudicaciones en formato parseable.
        </div>

        {/* Stats grid */}
        <div style={{ display: "flex", flex: 1, gap: "20px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: "12px",
              padding: "24px",
              backgroundColor: "rgba(245,158,11,0.15)",
              border: "2px solid #f59e0b",
              borderRadius: "12px",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: "16px", color: "#fcd34d" }}>
              Municipios con datos
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "72px",
                fontWeight: 800,
                color: "white",
                lineHeight: 1,
              }}
            >
              {stats.municipiosConDatos}
              <span
                style={{
                  display: "flex",
                  fontSize: "32px",
                  color: "#94a3b8",
                  fontWeight: 400,
                  alignSelf: "flex-end",
                  marginLeft: "8px",
                  marginBottom: "8px",
                }}
              >
                /{stats.totalMunicipios}
              </span>
            </div>
            <div style={{ display: "flex", fontSize: "14px", color: "#94a3b8" }}>
              publican CSV/API
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: "12px",
              padding: "24px",
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: "12px",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: "16px", color: "#94a3b8" }}>
              Contrataciones
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "60px",
                fontWeight: 800,
                color: "white",
                lineHeight: 1,
              }}
            >
              {stats.totalContrataciones.toLocaleString("es-AR")}
            </div>
            <div style={{ display: "flex", fontSize: "14px", color: "#94a3b8" }}>
              agregadas
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: "12px",
              padding: "24px",
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: "12px",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: "16px", color: "#94a3b8" }}>
              HHI mediano
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "60px",
                fontWeight: 800,
                color: "white",
                lineHeight: 1,
              }}
            >
              {stats.hhiMediano ?? "—"}
            </div>
            <div style={{ display: "flex", fontSize: "14px", color: "#94a3b8" }}>
              {hhiLabel(stats.hhiMediano)}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #334155",
            paddingTop: "16px",
            marginTop: "20px",
            fontSize: "18px",
            color: "#64748b",
          }}
        >
          <div style={{ display: "flex" }}>
            Datos públicos · Licencia CC BY 4.0
          </div>
          <div style={{ display: "flex" }}>radarmunicipal.ar/compras</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
