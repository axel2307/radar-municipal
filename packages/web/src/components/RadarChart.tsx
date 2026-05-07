"use client";

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

export interface RadarDimension {
  label: string;
  shortLabel?: string;
  score: number;
  fullMark?: number;
}

export interface RadarSeries {
  name: string;
  color: string;
  fillOpacity?: number;
  dimensions: RadarDimension[];
}

interface RadarChartProps {
  /** Primary series (always shown) */
  series: RadarSeries[];
  className?: string;
  height?: number;
}

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

export function RadarChart({ series, className, height = 320 }: RadarChartProps) {
  if (series.length === 0 || series[0].dimensions.length === 0) return null;

  // Build data array from first series' labels, adding each series' scores
  const data = series[0].dimensions.map((dim, i) => {
    const point: Record<string, string | number> = {
      label: dim.shortLabel ?? dim.label,
      fullLabel: dim.label,
    };
    for (const s of series) {
      point[s.name] = s.dimensions[i]?.score ?? 0;
    }
    return point;
  });

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            tickCount={5}
          />
          {series.map((s, i) => (
            <Radar
              key={s.name}
              name={s.name}
              dataKey={s.name}
              stroke={s.color ?? COLORS[i % COLORS.length]}
              fill={s.color ?? COLORS[i % COLORS.length]}
              fillOpacity={s.fillOpacity ?? 0.15}
              strokeWidth={2}
            />
          ))}
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}`, ""]}
            labelFormatter={(label, payload) => {
              const fullLabel = (payload as any)?.[0]?.payload?.fullLabel;
              return fullLabel ?? String(label);
            }}
          />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: "0.75rem" }} />}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
