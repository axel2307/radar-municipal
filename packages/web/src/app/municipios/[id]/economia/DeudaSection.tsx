import type { StockDeudaSnapshot } from "@radar-municipal/core";
import { DeudaTimeSeries } from "@/components/DeudaTimeSeries";
import { formatArs } from "./economia-helpers";
import { cn } from "@/lib/utils";

/**
 * Sprint 47D — Sección "Stock de deuda pública" de /economia.
 *
 * Contiene 3 sub-bloques:
 *   1. Snapshot card (saldo total + acreedores + fuente declarada)
 *   2. Histórico ≥2 snapshots: LineChart + tabla con Δ% (Sprint 22+45B)
 *   3. Tabla detallada de acreedores con % del total
 */
interface DeudaSectionProps {
  snapshot: StockDeudaSnapshot;
  series: StockDeudaSnapshot[];
  hasFiscalCurated: boolean;
}

export function DeudaSection({
  snapshot,
  series,
  hasFiscalCurated,
}: DeudaSectionProps) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Stock de deuda pública (snapshot{" "}
          {new Intl.DateTimeFormat("es-AR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }).format(new Date(snapshot.fechaSnapshot))}
          )
        </h2>
        <a
          href={snapshot.fuenteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          Ver Planilla C original →
        </a>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Stock al cierre del período según Planilla C (Ley 12462/13295 PBA).
        Total = suma del saldo de cada acreedor con monto &gt; 0.
      </p>
      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Saldo total</p>
          <p className="text-xl font-semibold">{formatArs(snapshot.saldoTotal)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Acreedores con saldo</p>
          <p className="text-xl font-semibold">{snapshot.acreedoresConSaldo}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Fuente declarada</p>
          <p
            className="text-base font-medium truncate"
            title={snapshot.nombreFuente}
          >
            {snapshot.nombreFuente || "—"}
          </p>
        </div>
      </div>

      {/* Histórico ≥2 snapshots: chart + tabla con Δ% */}
      {series.length >= 2 && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">
            Histórico ({series.length} snapshots)
          </h3>
          <div className="mb-4 -ml-2">
            <DeudaTimeSeries series={series} />
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-1 pr-4 font-medium">Fecha de corte</th>
                <th className="py-1 pr-4 text-right font-medium">Saldo total</th>
                <th className="py-1 pr-4 text-right font-medium">
                  Δ vs anterior
                </th>
                <th className="py-1 font-medium">Magnitud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {series.map((s, i) => {
                const prev = i > 0 ? series[i - 1] : null;
                const delta =
                  prev && prev.saldoTotal > 0
                    ? ((s.saldoTotal - prev.saldoTotal) / prev.saldoTotal) * 100
                    : null;
                const maxSaldo = Math.max(...series.map((x) => x.saldoTotal));
                const widthPct =
                  maxSaldo > 0 ? (s.saldoTotal / maxSaldo) * 100 : 0;
                const isLatest = i === series.length - 1;
                return (
                  <tr
                    key={s.fechaSnapshot}
                    className={isLatest ? "font-medium" : ""}
                  >
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

      {/* Tabla acreedores detallada */}
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
            {snapshot.acreedores.map((a) => (
              <tr key={a.nombre}>
                <td className="px-4 py-2 font-medium">{a.nombre}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {a.seccion ?? "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatArs(a.saldo)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                  {snapshot.saldoTotal > 0
                    ? `${((a.saldo / snapshot.saldoTotal) * 100).toFixed(1)}%`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!hasFiscalCurated && (
        <p className="mt-3 text-xs text-muted-foreground">
          Este municipio no tiene fiscal RAFAM curado (Sprint 1 cubrió 13
          piloto). La Planilla C publicada provee este corte de stock de
          deuda como dato primario auditable.
        </p>
      )}
    </section>
  );
}
