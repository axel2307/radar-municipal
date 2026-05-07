import { ImageResponse } from "next/og";
import { getCoverageStats } from "@/lib/scoring-data";

export const alt = "Radar Municipal — Calidad de datos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatDateShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Image() {
  const stats = getCoverageStats();
  const pctConDatos =
    stats.totalMunicipios === 0
      ? 0
      : Math.round((stats.conDatos / stats.totalMunicipios) * 100);

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
        {/* Header brand */}
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
            Radar Municipal · Calidad de datos
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "28px",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "68px",
              fontWeight: 800,
              lineHeight: 1.05,
              color: "white",
              maxWidth: "1050px",
            }}
          >
            Calidad de datos por municipio
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              color: "#cbd5e1",
              fontWeight: 500,
              maxWidth: "1000px",
              lineHeight: 1.3,
            }}
          >
            Cobertura por dimensión y fecha de última actualización
            de los 135 municipios bonaerenses.
          </div>
        </div>

        {/* Stat grid */}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            gap: "20px",
          }}
        >
          <StatCard
            value={`${stats.conDatos}/${stats.totalMunicipios}`}
            label="Municipios con datos"
            sub={`${pctConDatos}% del total`}
          />
          <StatCard
            value={`${stats.coberturaPromedioPiloto}%`}
            label="Cobertura promedio"
            sub="Dimensiones cubiertas"
          />
          <StatCard
            value={formatDateShort(stats.ultimaActualizacionGlobal)}
            label="Última actualización"
            sub={
              stats.diasDesdeActualizacion != null
                ? `hace ${stats.diasDesdeActualizacion} días`
                : "—"
            }
          />
          <StatCard
            value={String(stats.brechasTotales)}
            label="Brechas detectadas"
            sub="Dimensiones sin dato"
          />
        </div>

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            borderTop: "1px solid #334155",
            paddingTop: "16px",
            marginTop: "24px",
            fontSize: "20px",
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          radarmunicipal.ar/calidad-datos
        </div>
      </div>
    ),
    { ...size },
  );
}

function StatCard({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        gap: "4px",
        padding: "18px 20px",
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: "12px",
        border: "1px solid #334155",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: "34px",
          fontWeight: 800,
          color: "#f59e0b",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "6px",
          fontSize: "17px",
          color: "#e2e8f0",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: "14px",
          color: "#94a3b8",
          fontWeight: 500,
        }}
      >
        {sub}
      </div>
    </div>
  );
}
