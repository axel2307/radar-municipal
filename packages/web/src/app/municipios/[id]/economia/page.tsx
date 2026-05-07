import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMunicipioById, MUNICIPIOS } from "@radar-municipal/core";
import {
  getMunicipioDetail,
  getPresionImpositivaByMunicipio,
  getStockDeudaByMunicipio,
  getStockDeudaSeriesByMunicipio,
} from "@/lib/scoring-data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SpendingBreakdown } from "@/components/SpendingBreakdown";
import { formatNumber, cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const municipio = getMunicipioById(id);
  return {
    title: municipio ? `${municipio.nombre} — Detalle económico` : "Municipio no encontrado",
  };
}

export function generateStaticParams() {
  return MUNICIPIOS.map((m) => ({ id: m.id }));
}

function FiscalValue({ label, value, unit, colorize }: {
  label: string;
  value: number | null;
  unit: string;
  colorize?: "positive" | "lower-better" | "higher-better";
}) {
  let colorClass = "";
  if (value != null && colorize) {
    if (colorize === "positive") {
      colorClass = value >= 0 ? "text-score-high" : "text-score-low";
    } else if (colorize === "lower-better") {
      colorClass = value < 50 ? "text-score-high" : value < 70 ? "text-score-mid" : "text-score-low";
    } else if (colorize === "higher-better") {
      colorClass = value >= 15 ? "text-score-high" : value >= 8 ? "text-score-mid" : "text-score-low";
    }
  }

  const formatted = value != null
    ? unit === "$"
      ? `$${Math.round(value).toLocaleString("es-AR")}`
      : `${value.toFixed(1)}${unit}`
    : "—";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold", colorClass)}>{formatted}</p>
    </div>
  );
}

function formatArs(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function EconomiaPage({ params }: PageProps) {
  const { id } = await params;
  const detail = getMunicipioDetail(id);
  const municipio = getMunicipioById(id);
  const presion = getPresionImpositivaByMunicipio(id);
  const deudaSnapshot = getStockDeudaByMunicipio(id);
  const deudaSeries = getStockDeudaSeriesByMunicipio(id);

  if (!municipio) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/municipios/${id}`} className="text-sm text-muted-foreground hover:text-primary">
        &larr; Volver a {municipio.nombre}
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="text-2xl font-bold">{municipio.nombre} — Detalle económico</h1>
        <p className="mt-1 text-muted-foreground">
          Análisis fiscal, composición del gasto y economía local
        </p>
      </div>

      {!detail && !deudaSnapshot ? (
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">Sin datos económicos disponibles.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {detail && (
            <>
          {/* Scores resumen */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4 text-center">
              <p className="text-xs font-medium text-amber-600 mb-2">Fiscal</p>
              <ScoreBadge score={detail.scoreFiscal} size="lg" />
            </div>
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4 text-center">
              <p className="text-xs font-medium text-amber-600 mb-2">Gasto por función</p>
              <ScoreBadge score={detail.scoreGastoFuncion} size="lg" />
            </div>
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4 text-center">
              <p className="text-xs font-medium text-amber-600 mb-2">Economía local</p>
              <ScoreBadge score={detail.scoreEconomiaLocal} size="lg" />
            </div>
          </div>

          {/* Indicadores fiscales */}
          {detail.fiscal && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Indicadores fiscales</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                <FiscalValue label="Gasto per cápita" value={detail.fiscal.gastoPcapita} unit="$" />
                <FiscalValue label="Deuda per cápita" value={detail.fiscal.deudaPcapita} unit="$" />
                <FiscalValue label="% Gasto en personal" value={detail.fiscal.pctPersonal} unit="%" colorize="lower-better" />
                <FiscalValue label="% Gasto de capital" value={detail.fiscal.pctCapital} unit="%" colorize="higher-better" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3 mb-4">
                <FiscalValue label="Resultado per cápita" value={detail.fiscal.resultadoPcapita} unit="$" colorize="positive" />
                <FiscalValue label="Autonomía fiscal" value={detail.fiscal.autonomiaFiscal} unit="%" colorize="higher-better" />
                <FiscalValue label="Eficiencia administrativa" value={detail.fiscal.eficienciaAdmin} unit="%" colorize="lower-better" />
              </div>

              {/* Criterios detallados */}
              <div className="overflow-x-auto rounded-lg border border-border mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Indicador</th>
                      <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-20">Peso</th>
                      <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-20">Score</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground hidden md:table-cell">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.fiscal.criterios.map((c) => (
                      <tr key={c.indicador} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 font-medium">{c.descripcion}</td>
                        <td className="px-4 py-2 text-center text-muted-foreground">{(c.peso * 100).toFixed(0)}%</td>
                        <td className="px-4 py-2 text-center">
                          <span className={cn(
                            "font-medium",
                            c.valorNormalizado >= 0.7 ? "text-score-high" : c.valorNormalizado >= 0.4 ? "text-score-mid" : "text-score-low"
                          )}>
                            {(c.valorNormalizado * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{c.interpretacion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">{detail.fiscal.notas}</p>
            </section>
          )}

          {/* Tasas al contribuyente — casos testigo */}
          {presion && (
            <section>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">Tasas al contribuyente</h2>
                <Link
                  href="/presion-impositiva"
                  className="text-xs text-primary hover:underline"
                >
                  Ver comparador completo &rarr;
                </Link>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Monto anual estimado ({presion.anioFiscal}) que pagaría cada
                caso testigo en este municipio.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    Vivienda (ABL/TSG)
                  </p>
                  <p className="text-xl font-semibold">
                    {formatArs(presion.montoVivienda.valor)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Valuación fiscal $40M
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    Comercio (TISH)
                  </p>
                  <p className="text-xl font-semibold">
                    {formatArs(presion.montoComercio.valor)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    IIBB $50M/año
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    Rural (Vial)
                  </p>
                  <p className="text-xl font-semibold">
                    {formatArs(presion.montoRural.valor)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    100 ha zona media
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    Construcción
                  </p>
                  <p className="text-xl font-semibold">
                    {formatArs(presion.montoConstruccion.valor)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Obra nueva 100 m²
                  </p>
                </div>
              </div>
              <div
                role="note"
                className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
              >
                <strong>Confianza baja:</strong>{" "}
                {presion.notaMetodologica ??
                  "valores de referencia, pendiente auditoría de ordenanza."}{" "}
                Ord. fiscal vigente:{" "}
                {presion.publicaOrdenanzaFiscal ? "✓ publicada" : "no detectada"}.
              </div>
            </section>
          )}

          {/* Gasto por función */}
          {detail.gastoFuncion && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Composición del gasto por función</h2>
              <div className="grid gap-6 lg:grid-cols-2 mb-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <SpendingBreakdown
                    data={[
                      { nombre: "Servicios sociales", pct: detail.gastoFuncion.pctServiciosSociales ?? 0 },
                      { nombre: "Servicios económicos", pct: detail.gastoFuncion.pctServiciosEconomicos ?? 0 },
                      { nombre: "Administración", pct: detail.gastoFuncion.pctAdminGubernamental ?? 0 },
                      { nombre: "Otros / Deuda", pct: Math.max(0, 100 - (detail.gastoFuncion.pctServiciosSociales ?? 0) - (detail.gastoFuncion.pctServiciosEconomicos ?? 0) - (detail.gastoFuncion.pctAdminGubernamental ?? 0)) },
                    ]}
                    height={260}
                  />
                </div>
                <div className="grid gap-3 content-start">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Servicios sociales</p>
                    <p className="text-lg font-semibold">{detail.gastoFuncion.pctServiciosSociales?.toFixed(1) ?? "—"}%</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Servicios económicos</p>
                    <p className="text-lg font-semibold">{detail.gastoFuncion.pctServiciosEconomicos?.toFixed(1) ?? "—"}%</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Administración gubernamental</p>
                    <p className={cn("text-lg font-semibold", detail.gastoFuncion.pctAdminGubernamental != null && detail.gastoFuncion.pctAdminGubernamental > 35 ? "text-score-low" : "")}>
                      {detail.gastoFuncion.pctAdminGubernamental?.toFixed(1) ?? "—"}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">HHI (diversificación)</p>
                    <p className="text-lg font-semibold">{detail.gastoFuncion.diversificacionHhi?.toFixed(3) ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Menor = más diversificado</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Economía local */}
          {detail.economiaLocal && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Economía local</h2>
              <div className="grid gap-4 sm:grid-cols-3 mb-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Empleo per cápita</p>
                  <p className="text-xl font-semibold">{detail.economiaLocal.empleoPcapita?.toFixed(3) ?? "—"}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Variación empleo</p>
                  <p className={cn("text-xl font-semibold", detail.economiaLocal.variacionEmpleo != null && detail.economiaLocal.variacionEmpleo >= 0 ? "text-score-high" : "text-score-low")}>
                    {detail.economiaLocal.variacionEmpleo != null ? `${detail.economiaLocal.variacionEmpleo > 0 ? "+" : ""}${detail.economiaLocal.variacionEmpleo.toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Empresas / 1.000 hab</p>
                  <p className="text-xl font-semibold">{detail.economiaLocal.empresasPer1000?.toFixed(1) ?? "—"}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Indicador</th>
                      <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-20">Peso</th>
                      <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-20">Score</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground hidden md:table-cell">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.economiaLocal.criterios.map((c) => (
                      <tr key={c.indicador} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 font-medium">{c.descripcion}</td>
                        <td className="px-4 py-2 text-center text-muted-foreground">{(c.peso * 100).toFixed(0)}%</td>
                        <td className="px-4 py-2 text-center">
                          <span className={cn(
                            "font-medium",
                            c.valorNormalizado >= 0.7 ? "text-score-high" : c.valorNormalizado >= 0.4 ? "text-score-mid" : "text-score-low"
                          )}>
                            {(c.valorNormalizado * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{c.interpretacion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
            </>
          )}

          {/* Stock de deuda detallado (Planilla C, Ley 12462) — Sprint 20 */}
          {deudaSnapshot && (
            <section>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  Stock de deuda pública (snapshot{" "}
                  {new Intl.DateTimeFormat("es-AR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(deudaSnapshot.fechaSnapshot))}
                  )
                </h2>
                <a
                  href={deudaSnapshot.fuenteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Ver Planilla C original &rarr;
                </a>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Stock al cierre del período según Planilla C (Ley 12462/13295
                PBA). Total = suma del saldo de cada acreedor con monto &gt; 0.
              </p>
              <div className="grid gap-4 sm:grid-cols-3 mb-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Saldo total</p>
                  <p className="text-xl font-semibold">
                    {formatArs(deudaSnapshot.saldoTotal)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Acreedores con saldo</p>
                  <p className="text-xl font-semibold">
                    {deudaSnapshot.acreedoresConSaldo}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Fuente declarada</p>
                  <p className="text-base font-medium truncate" title={deudaSnapshot.nombreFuente}>
                    {deudaSnapshot.nombreFuente || "—"}
                  </p>
                </div>
              </div>

              {/* Histórico de snapshots — Sprint 22 */}
              {deudaSeries.length >= 2 && (
                <div className="mb-4 rounded-lg border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold">
                    Histórico ({deudaSeries.length}{" "}
                    {deudaSeries.length === 1 ? "snapshot" : "snapshots"})
                  </h3>
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-4 font-medium">Fecha de corte</th>
                        <th className="py-1 pr-4 text-right font-medium">Saldo total</th>
                        <th className="py-1 pr-4 text-right font-medium">Δ vs anterior</th>
                        <th className="py-1 font-medium">Magnitud</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {deudaSeries.map((s, i) => {
                        const prev = i > 0 ? deudaSeries[i - 1] : null;
                        const delta =
                          prev && prev.saldoTotal > 0
                            ? ((s.saldoTotal - prev.saldoTotal) / prev.saldoTotal) * 100
                            : null;
                        const maxSaldo = Math.max(
                          ...deudaSeries.map((x) => x.saldoTotal),
                        );
                        const widthPct = maxSaldo > 0 ? (s.saldoTotal / maxSaldo) * 100 : 0;
                        const isLatest = i === deudaSeries.length - 1;
                        return (
                          <tr key={s.fechaSnapshot} className={isLatest ? "font-medium" : ""}>
                            <td className="py-2 pr-4 tabular-nums">
                              {s.fechaSnapshot}
                              {isLatest && (
                                <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                                  más reciente
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-4 text-right tabular-nums">
                              {formatArs(s.saldoTotal)}
                            </td>
                            <td
                              className={cn(
                                "py-2 pr-4 text-right tabular-nums",
                                delta == null
                                  ? "text-muted-foreground"
                                  : delta > 0
                                    ? "text-score-low"
                                    : delta < 0
                                      ? "text-score-high"
                                      : "text-muted-foreground",
                              )}
                            >
                              {delta == null
                                ? "—"
                                : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`}
                            </td>
                            <td className="py-2">
                              <div
                                className="h-2 rounded-full bg-primary/20"
                                style={{ width: `${widthPct}%` }}
                                aria-hidden
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Δ = variación nominal (sin ajuste por inflación) respecto al
                    snapshot anterior. Verde = bajó. Rojo = subió.
                  </p>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Acreedor</th>
                      <th className="px-4 py-2 font-medium">Sección</th>
                      <th className="px-4 py-2 text-right font-medium">Saldo</th>
                      <th className="px-4 py-2 text-right font-medium">% del total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deudaSnapshot.acreedores.map((a) => (
                      <tr key={a.nombre}>
                        <td className="px-4 py-2 font-medium">{a.nombre}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {a.seccion ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatArs(a.saldo)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {deudaSnapshot.saldoTotal > 0
                            ? `${((a.saldo / deudaSnapshot.saldoTotal) * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!detail?.fiscal && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Este municipio no tiene fiscal RAFAM curado (Sprint 1
                  cubrió 13 piloto). La Planilla C publicada provee este
                  corte de stock de deuda como dato primario auditable.
                </p>
              )}
            </section>
          )}

          <p className="text-xs text-muted-foreground">
            <Link href="/metodologia" className="text-primary hover:underline">
              Ver metodología
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
