"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DimensionBarChartProps {
  data: { nombre: string; score: number | null }[];
  color?: string;
}

function getBarColor(score: number | null): string {
  if (score == null) return "#d1d5db";
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

export function DimensionBarChart({ data }: DimensionBarChartProps) {
  const chartData = data.map((d) => ({
    nombre: d.nombre,
    score: d.score ?? 0,
    originalScore: d.score,
  }));

  const height = Math.max(chartData.length * 50, 200);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} />
        <YAxis
          dataKey="nombre"
          type="category"
          width={150}
          tick={{ fontSize: 13 }}
        />
        <Tooltip
          formatter={(_value, _name, props) => {
            const original = (props?.payload as { originalScore: number | null })?.originalScore;
            return original == null ? "Sin datos" : original.toFixed(1);
          }}
          labelFormatter={(label) => String(label)}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry.originalScore)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
