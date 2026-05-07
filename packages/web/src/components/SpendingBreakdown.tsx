"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export interface SpendingCategory {
  nombre: string;
  pct: number;
}

interface SpendingBreakdownProps {
  data: SpendingCategory[];
  className?: string;
  height?: number;
}

const COLORS = [
  "#10b981", // servicios sociales — green
  "#3b82f6", // servicios económicos — blue
  "#f59e0b", // admin gubernamental — amber
  "#ef4444", // deuda pública — red
  "#8b5cf6", // otros — purple
  "#06b6d4", // cyan
  "#f97316", // orange
];

const RADIAN = Math.PI / 180;

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) {
  if (percent < 0.05) return null; // Don't label tiny slices
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function SpendingBreakdown({
  data,
  className,
  height = 300,
}: SpendingBreakdownProps) {
  const filtered = data.filter((d) => d.pct > 0);
  if (filtered.length === 0) return null;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={filtered}
            dataKey="pct"
            nameKey="nombre"
            cx="50%"
            cy="50%"
            outerRadius="80%"
            innerRadius="40%"
            labelLine={false}
            label={renderCustomLabel}
            strokeWidth={2}
            stroke="hsl(var(--card))"
          >
            {filtered.map((_, i) => (
              <Cell
                key={`cell-${i}`}
                fill={COLORS[i % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, ""]}
          />
          <Legend
            wrapperStyle={{ fontSize: "0.75rem" }}
            formatter={(value: string) => (
              <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
