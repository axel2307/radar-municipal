"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import type { StockDeudaSnapshot } from "@radar-municipal/core";

/**
 * Sprint 45B — Time series de stock de deuda municipal.
 *
 * Recibe series ya dedupeada + ordenada (getStockDeudaSeriesByMunicipio).
 * Renderea LineChart con saldo total ARS nominales en el tiempo.
 *
 * Tooltip muestra: fecha de corte legible + saldo formateado en M (millones)
 * o B (billones). Eje Y en M para evitar ticks gigantes.
 *
 * Highlight: punto final (más reciente) más grande que los anteriores.
 */
interface DeudaTimeSeriesProps {
  series: StockDeudaSnapshot[];
}

function formatArsCompact(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}k`;
  return `$${v}`;
}

function formatArsFull(v: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(iso: string): string {
  // "2024-09-30" → "Sep 2024" (corto, suficiente para eje X)
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    year: "numeric",
  }).format(d);
}

export function DeudaTimeSeries({ series }: DeudaTimeSeriesProps) {
  // Recharts usa el primer datum como reference. Mapeamos a millones para
  // que el eje Y no muestre "12,500,000,000" sino "12.5".
  const chartData = series.map((s) => ({
    fecha: formatDate(s.fechaSnapshot),
    fechaISO: s.fechaSnapshot,
    saldoMM: s.saldoTotal / 1e6,
    saldoRaw: s.saldoTotal,
  }));

  const last = chartData[chartData.length - 1];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="fecha"
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#64748b"
          tickFormatter={(v) => `$${v.toFixed(0)}M`}
          width={70}
        />
        <Tooltip
          formatter={(_value, _name, item) => {
            const raw = (item?.payload as { saldoRaw?: number })?.saldoRaw ?? 0;
            return [formatArsFull(raw), "Saldo total"];
          }}
          labelFormatter={(label, payload) => {
            const iso = (payload?.[0]?.payload as { fechaISO: string })?.fechaISO;
            return iso
              ? new Intl.DateTimeFormat("es-AR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }).format(new Date(iso))
              : label;
          }}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        />
        <Line
          type="monotone"
          dataKey="saldoMM"
          stroke="#1e3a5f"
          strokeWidth={2}
          dot={{ r: 4, fill: "#1e3a5f" }}
          activeDot={{ r: 6 }}
        />
        {/* Highlight del más reciente con un punto extra */}
        {last && (
          <ReferenceDot
            x={last.fecha}
            y={last.saldoMM}
            r={7}
            fill="#f59e0b"
            stroke="#fff"
            strokeWidth={2}
            ifOverflow="visible"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Re-exporto los formateadores para tests/reuso
export { formatArsCompact };
