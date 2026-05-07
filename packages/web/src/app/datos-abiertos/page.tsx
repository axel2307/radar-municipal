import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";
import { JsonLd } from "@/components/JsonLd";
import {
  getGlobalRefreshManifest,
  getRefreshAge,
  getRefreshHealth,
  formatRefreshAbsolute,
} from "@/lib/scoring-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Datos abiertos",
};

const API_BASE = API_BASE_URL;

const EXPORTS = [
  {
    title: "Ranking completo (CSV)",
    desc: "13 municipios piloto con scores de transparencia, fiscal y normativa. Compatible con Excel.",
    url: `${API_BASE}/api/export/ranking.csv`,
    format: "CSV",
  },
  {
    title: "Ranking completo (JSON)",
    desc: "Mismos datos con metadatos adicionales (fecha de generación, licencia, fuente).",
    url: `${API_BASE}/api/export/ranking.json`,
    format: "JSON",
  },
  {
    title: "Municipios (CSV)",
    desc: "Los 135 municipios de la Provincia de Buenos Aires con datos base: población, superficie, URL oficial.",
    url: `${API_BASE}/api/export/municipios.csv`,
    format: "CSV",
  },
  {
    title: "Municipios (JSON)",
    desc: "Lista completa de municipios en formato JSON.",
    url: `${API_BASE}/api/export/municipios.json`,
    format: "JSON",
  },
];

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/municipios",
    desc: "Lista los 135 municipios. Filtros: ?piloto=true, ?q=nombre",
  },
  {
    method: "GET",
    path: "/api/municipios/:id",
    desc: "Detalle de un municipio por código INDEC (ej: 060056)",
  },
  {
    method: "GET",
    path: "/api/ranking",
    desc: "Ranking de los 13 municipios piloto con scores de 3 dimensiones",
  },
  {
    method: "GET",
    path: "/api/municipios/:id/scores",
    desc: "Scores de transparencia con desglose por criterio",
  },
  {
    method: "GET",
    path: "/api/export/ranking.json",
    desc: "Ranking completo en JSON con metadatos",
  },
  {
    method: "GET",
    path: "/api/export/ranking.csv",
    desc: "Ranking completo en CSV",
  },
  {
    method: "GET",
    path: "/api/export/municipios.json",
    desc: "Los 135 municipios en JSON",
  },
  {
    method: "GET",
    path: "/api/export/municipios.csv",
    desc: "Los 135 municipios en CSV",
  },
  {
    method: "GET",
    path: "/api/docs",
    desc: "Especificación OpenAPI 3.0 en formato JSON",
  },
];

// ─────────────────────────────────────────
// Sprint 28 — Banner de frescura
// ─────────────────────────────────────────

const HEALTH_STYLES: Record<
  "healthy" | "degraded" | "stale",
  { dot: string; label: string; ring: string }
> = {
  healthy: {
    dot: "bg-green-500",
    label: "Datos al día",
    ring: "border-green-200 bg-green-50/50",
  },
  degraded: {
    dot: "bg-amber-500",
    label: "Atención: refresh con problemas",
    ring: "border-amber-200 bg-amber-50/50",
  },
  stale: {
    dot: "bg-red-500",
    label: "Datos desactualizados",
    ring: "border-red-200 bg-red-50/50",
  },
};

const STATUS_BADGES: Record<
  "success" | "failed" | "skipped",
  { className: string; label: string }
> = {
  success: {
    className: "bg-green-100 text-green-700",
    label: "OK",
  },
  failed: {
    className: "bg-red-100 text-red-700",
    label: "Falló",
  },
  skipped: {
    className: "bg-slate-100 text-slate-600",
    label: "Skip",
  },
};

function FreshnessBanner() {
  const manifest = getGlobalRefreshManifest();
  const { humanAR, ms } = getRefreshAge(manifest);
  const health = getRefreshHealth(manifest);
  const absolute = formatRefreshAbsolute(manifest);
  const styles = HEALTH_STYLES[health];
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));

  const successRuns = manifest.runs.filter((r) => r.status === "success").length;
  const failedRuns = manifest.runs.filter((r) => r.status === "failed").length;

  return (
    <section
      id="frescura"
      aria-labelledby="frescura-heading"
      className={cn(
        "mb-8 scroll-mt-20 rounded-lg border-2 p-5",
        styles.ring,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full",
              styles.dot,
            )}
            aria-hidden
          />
          <div>
            <h2
              id="frescura-heading"
              className="text-base font-semibold leading-tight"
            >
              {styles.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Última actualización:{" "}
              <time
                dateTime={manifest.refreshedAt}
                className="font-medium text-foreground"
                title={absolute}
              >
                {humanAR}
              </time>
              {" · "}
              <span className="text-foreground">
                {manifest.totalMunicipiosCubiertos}
              </span>{" "}
              {manifest.totalMunicipiosCubiertos === 1
                ? "municipio cubierto"
                : "municipios cubiertos"}{" "}
              automáticamente
              {failedRuns > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-amber-700">
                    {failedRuns}{" "}
                    {failedRuns === 1 ? "fuente con error" : "fuentes con error"}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              {successRuns}/{manifest.runs.length}
            </span>{" "}
            fuentes OK
          </p>
          <p className="mt-0.5">{absolute}</p>
        </div>
      </div>

      {/* Tabla por run */}
      <div className="mt-4 overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Fuente</th>
              <th className="px-3 py-2 font-medium">Script</th>
              <th className="px-3 py-2 text-center font-medium">Estado</th>
              <th className="px-3 py-2 text-right font-medium">Municipios</th>
              <th className="px-3 py-2 text-right font-medium">Duración</th>
            </tr>
          </thead>
          <tbody>
            {manifest.runs.map((run) => {
              const badge = STATUS_BADGES[run.status];
              const sec = run.durationMs > 0 ? Math.round(run.durationMs / 1000) : null;
              return (
                <tr
                  key={run.target}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-2 font-medium capitalize">
                    {run.target}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {run.script}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        badge.className,
                      )}
                      title={run.error}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {run.municipiosConDatos}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {sec != null ? `${sec}s` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        El refresh corre el primer día de cada mes vía GitHub Actions
        (workflow{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">
          monthly-refresh.yml
        </code>
        ). Cada fuente se ejecuta de forma aislada — un fallo en una no
        afecta a las otras. Si una falla, los datos publicados retienen
        su estado anterior y se abre una issue en el repo.
        {days > 60 && (
          <>
            {" "}
            <strong className="text-red-700">
              Hace {days} días que no hay refresh exitoso.
            </strong>
          </>
        )}
      </p>
    </section>
  );
}

export default function DatosAbiertosPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Radar Municipal — Datos abiertos",
          description:
            "Rankings de transparencia, indicadores fiscales y normativa de los 135 municipios de la Provincia de Buenos Aires. Datos comparables, auditables y libres bajo licencia CC BY 4.0.",
          url: "https://radarmunicipal.ar/datos-abiertos",
          keywords: [
            "municipios",
            "buenos aires",
            "transparencia",
            "fiscal",
            "ranking",
            "datos abiertos",
            "argentina",
          ],
          license: "https://creativecommons.org/licenses/by/4.0/",
          creator: {
            "@type": "Organization",
            name: "Radar Municipal",
            url: "https://radarmunicipal.ar",
          },
          spatialCoverage: {
            "@type": "Place",
            name: "Provincia de Buenos Aires, Argentina",
          },
          distribution: [
            {
              "@type": "DataDownload",
              encodingFormat: "text/csv",
              contentUrl: `${API_BASE}/api/export/ranking.csv`,
              name: "Ranking completo (CSV)",
            },
            {
              "@type": "DataDownload",
              encodingFormat: "application/json",
              contentUrl: `${API_BASE}/api/export/ranking.json`,
              name: "Ranking completo (JSON)",
            },
            {
              "@type": "DataDownload",
              encodingFormat: "text/csv",
              contentUrl: `${API_BASE}/api/export/municipios.csv`,
              name: "Municipios (CSV)",
            },
            {
              "@type": "DataDownload",
              encodingFormat: "application/json",
              contentUrl: `${API_BASE}/api/export/municipios.json`,
              name: "Municipios (JSON)",
            },
          ],
        }}
      />
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Datos abiertos</h1>
        <p className="mt-2 text-muted-foreground max-w-3xl">
          Toda la información de Radar Municipal es libre y reutilizable bajo
          licencia{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY 4.0
          </a>
          . Podés descargar los datos en CSV o JSON, o integrarlos directamente
          a tu aplicación usando nuestra API REST.
        </p>
      </div>

      <FreshnessBanner />

      {/* Downloads */}
      <h2 className="text-lg font-semibold mb-4">Descargas directas</h2>
      <div className="grid gap-4 sm:grid-cols-2 mb-12">
        {EXPORTS.map((exp) => (
          <a
            key={exp.url}
            href={exp.url}
            className="group rounded-lg border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                {exp.format}
              </span>
              <h3 className="font-semibold group-hover:text-primary transition-colors">
                {exp.title}
              </h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{exp.desc}</p>
          </a>
        ))}
      </div>

      {/* API Reference */}
      <h2 className="text-lg font-semibold mb-4">API REST</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Base URL:{" "}
        <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
          {API_BASE}
        </code>{" "}
        &middot; Todos los endpoints devuelven JSON (excepto CSV exports)
        &middot; Sin autenticación requerida.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 text-left font-semibold text-muted-foreground w-20">
                Método
              </th>
              <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                Endpoint
              </th>
              <th className="px-4 py-2 text-left font-semibold text-muted-foreground hidden sm:table-cell">
                Descripción
              </th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINTS.map((ep) => (
              <tr
                key={ep.path}
                className="border-b border-border last:border-0"
              >
                <td className="px-4 py-2">
                  <span className="inline-flex items-center justify-center rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                    {ep.method}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{ep.path}</td>
                <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">
                  {ep.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ejemplo */}
      <h2 className="text-lg font-semibold mb-4">Ejemplo de uso</h2>
      <div className="rounded-lg border border-border bg-slate-950 p-4 mb-8 overflow-x-auto">
        <pre className="text-sm text-slate-200 font-mono">
          <code>{`# Obtener ranking de municipios piloto
curl ${API_BASE}/api/ranking

# Buscar municipios por nombre
curl "${API_BASE}/api/municipios?q=tandil"

# Descargar ranking en CSV
curl -o ranking.csv ${API_BASE}/api/export/ranking.csv

# Detalle de Bahía Blanca (código INDEC: 060056)
curl ${API_BASE}/api/municipios/060056`}</code>
        </pre>
      </div>

      {/* Spec */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
        <h3 className="font-semibold text-primary">Especificación OpenAPI</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          La API tiene una especificación OpenAPI 3.0 completa que podés usar
          con Swagger, Postman, o cualquier herramienta compatible.
        </p>
        <div className="mt-4 flex gap-3">
          <a
            href={`${API_BASE}/api/docs`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Ver spec JSON
          </a>
          <a
            href={`${API_BASE}/api/docs/explorer`}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Explorador interactivo
          </a>
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Si usás estos datos, te pedimos que cites a Radar Municipal como fuente.{" "}
        <Link href="/metodologia" className="text-primary hover:underline">
          Ver metodología
        </Link>{" "}
        para entender cómo se calculan los scores.
      </p>
    </div>
  );
}
