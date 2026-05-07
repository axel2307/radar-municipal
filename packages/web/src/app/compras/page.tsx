import type { Metadata } from "next";
import {
  getComprasMunicipiosConDatos,
  getComprasStats,
  getComprasAggregates,
  getComprasManifest,
} from "@/lib/scoring-data";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Compras públicas",
  description:
    "Concursos, licitaciones y adjudicaciones de los municipios de la Provincia de Buenos Aires. Stats agregados por año + HHI sobre proveedores adjudicados.",
  openGraph: {
    title: "Compras públicas — Radar Municipal",
    description:
      "Pilar 4 — concursos, montos, proveedores y concentración (HHI) en los municipios de PBA.",
  },
};

function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRefreshDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}

function hhiTier(hhi: number | null): {
  label: string;
  badge: string;
} {
  if (hhi == null) return { label: "Sin proveedor publicado", badge: "bg-muted text-muted-foreground" };
  if (hhi < 1500) return { label: "Competitivo", badge: "bg-green-100 text-green-800" };
  if (hhi <= 2500) return { label: "Moderadamente concentrado", badge: "bg-amber-100 text-amber-800" };
  return { label: "Altamente concentrado", badge: "bg-red-100 text-red-800" };
}

export default function Page() {
  const stats = getComprasStats();
  const filas = getComprasMunicipiosConDatos();
  const aggregates = getComprasAggregates();
  const manifest = getComprasManifest();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Compras públicas municipales — Radar Municipal",
          description:
            "Concursos, licitaciones y adjudicaciones agregados desde portales municipales (CKAN, gobabierto.ar). Incluye HHI sobre proveedores adjudicados cuando la fuente lo permite.",
          url: "https://radarmunicipal.ar/compras",
          creator: {
            "@type": "Organization",
            name: "Radar Municipal",
            url: "https://radarmunicipal.ar",
          },
          license: "https://creativecommons.org/licenses/by/4.0/",
          spatialCoverage: {
            "@type": "Place",
            name: "Provincia de Buenos Aires, Argentina",
          },
        }}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-bold">Compras públicas</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Concursos, licitaciones y adjudicaciones publicadas por los
          municipios. Mostramos {stats.municipiosConDatos} de los{" "}
          {stats.totalMunicipios} partidos — la mayoría no publica este tipo
          de información en formato parseable. Cuando lo hagan, aparecerán
          acá automáticamente.
        </p>
        <p
          className="mt-3 text-xs text-muted-foreground"
          aria-label="Última actualización del dataset"
        >
          Última actualización:{" "}
          <time dateTime={manifest.refreshedAt} className="font-medium text-foreground">
            {formatRefreshDate(manifest.refreshedAt)}
          </time>
          {" · "}
          {manifest.fuentes.length}{" "}
          {manifest.fuentes.length === 1 ? "fuente activa" : "fuentes activas"}{" "}
          ({manifest.fuentes.map((f) => f.label).join(", ")})
        </p>
      </header>

      <div
        role="note"
        className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <p className="font-medium">Cobertura inicial — Sprint 17 (abril 2026)</p>
        <p className="mt-1 text-amber-800">
          Pilar 4 está en fase de discovery activo. Hoy solo Quilmes (CKAN)
          y Carlos Casares (gobabierto.ar) exponen contrataciones en CSV
          parseable. Quilmes publica licitaciones sin proveedor adjudicado;
          Carlos Casares sí publica adjudicaciones, lo que permite calcular
          el índice de concentración HHI. Los datos se irán completando
          conforme nuevos municipios publiquen en formato abierto.
        </p>
      </div>

      {/* KPIs */}
      <section
        aria-label="Stats agregados"
        className="mb-8 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          titulo="Municipios con datos"
          valor={`${stats.municipiosConDatos} / ${stats.totalMunicipios}`}
        />
        <KpiCard
          titulo="Contrataciones agregadas"
          valor={String(stats.totalContrataciones)}
          detalle={`en ${stats.totalAniosCubiertos} (municipio × año) cubiertos`}
        />
        <KpiCard
          titulo="Períodos con HHI calculable"
          valor={String(stats.conHhi)}
          detalle="requiere proveedor + monto adjudicado"
        />
        <KpiCard
          titulo="HHI mediano"
          valor={stats.hhiMediano != null ? String(stats.hhiMediano) : "—"}
          detalle={
            stats.hhiMediano != null
              ? hhiTier(stats.hhiMediano).label
              : "Sin datos suficientes aún"
          }
        />
      </section>

      {/* Tabla por municipio */}
      <section className="mb-10 overflow-hidden rounded-lg border border-border bg-card">
        <header className="border-b border-border bg-muted/40 px-5 py-3">
          <h2 className="text-base font-semibold">Resumen por municipio</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Acumulado de todos los años disponibles para cada municipio.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Municipio</th>
                <th className="px-4 py-2 font-medium">Años</th>
                <th className="px-4 py-2 text-right font-medium">N°</th>
                <th className="px-4 py-2 text-right font-medium">Total ARS</th>
                <th className="px-4 py-2 text-right font-medium">HHI</th>
                <th className="px-4 py-2 font-medium">Concentración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((f) => {
                const tier = hhiTier(f.hhiMasReciente);
                return (
                  <tr key={f.municipio.id}>
                    <td className="px-4 py-2 font-medium">
                      {f.municipio.nombre}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {f.aniosCubiertos.join(", ")}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {f.totalContrataciones}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatArs(f.montoTotalAcumulado)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {f.hhiMasReciente != null ? f.hhiMasReciente : "—"}
                      {f.anioHhiMasReciente != null && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({f.anioHhiMasReciente})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${tier.badge}`}
                      >
                        {tier.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filas.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    Aún no hay municipios con contrataciones parseables.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detalle por (municipio, año) */}
      <section className="mb-10 overflow-hidden rounded-lg border border-border bg-card">
        <header className="border-b border-border bg-muted/40 px-5 py-3">
          <h2 className="text-base font-semibold">Detalle por año</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Una fila por (municipio, año) auditable contra la fuente original.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Municipio</th>
                <th className="px-4 py-2 font-medium">Año</th>
                <th className="px-4 py-2 text-right font-medium">N°</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">Mediana</th>
                <th className="px-4 py-2 text-right font-medium">HHI</th>
                <th className="px-4 py-2 text-right font-medium">Únicos</th>
                <th className="px-4 py-2 font-medium">Fuente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {aggregates.map((a) => {
                const m = filas.find((f) => f.municipio.id === a.municipioId);
                const nombre = m?.municipio.nombre ?? a.municipioId;
                return (
                  <tr key={`${a.municipioId}-${a.anio}`}>
                    <td className="px-4 py-2">{nombre}</td>
                    <td className="px-4 py-2 tabular-nums">{a.anio}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {a.totalContrataciones}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatArs(a.montoTotalPresupuesto)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {a.medianaMonto != null ? formatArs(a.medianaMonto) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {a.hhiProveedores != null ? a.hhiProveedores : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {a.proveedoresUnicos != null ? a.proveedoresUnicos : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <a
                        href={a.fuenteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline-offset-2 hover:underline"
                      >
                        ver dataset
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Metodología */}
      <section className="rounded-lg border border-border bg-muted/30 p-5 text-sm">
        <h2 className="mb-2 text-base font-semibold">Metodología</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <strong>Total ARS</strong> es la suma de presupuestos publicados
            (presupuesto base, no necesariamente monto adjudicado). En
            datasets de Quilmes coincide con el techo licitado; en Carlos
            Casares es el importe efectivamente adjudicado.
          </li>
          <li>
            <strong>HHI (Herfindahl-Hirschman Index)</strong> mide la
            concentración del mercado de proveedores en escala 0–10.000.
            Calculable solo cuando la fuente expone proveedor + monto
            adjudicado en cada contratación. Thresholds estándar
            (FTC/DOJ): &lt; 1.500 competitivo, 1.500–2.500 moderadamente
            concentrado, &gt; 2.500 altamente concentrado.
          </li>
          <li>
            <strong>Cobertura</strong> está limitada por publicación: la
            mayoría de municipios PBA no expone contrataciones en CSV/JSON
            estructurado. Sondeamos sub-dominios CKAN típicos
            (datos.&lt;municipio&gt;.gob.ar) y los crawls de portales. Si
            tu municipio publica licitaciones en formato abierto y no
            aparece acá, contactanos.
          </li>
          <li>
            Cada fila es trazable a su CSV de origen vía la columna
            "Fuente". El refresh corre con el comando{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              pnpm refresh:pilar4
            </code>{" "}
            (orquestador idempotente; cron mensual sugerido). La fecha del
            último refresh se muestra debajo del título.
          </li>
        </ul>
      </section>
    </div>
  );
}

function KpiCard({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {titulo}
      </div>
      <div className="mt-1 text-xl font-semibold text-foreground tabular-nums">
        {valor}
      </div>
      {detalle && (
        <div className="mt-1 text-xs text-muted-foreground">{detalle}</div>
      )}
    </div>
  );
}
