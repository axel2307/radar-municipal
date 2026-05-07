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

interface ScoreDistributionProps {
  data: { bucket: string; count: number; municipios: string[] }[];
}

const BUCKET_COLORS: Record<string, string> = {
  "0-20": "#ef4444",
  "20-40": "#ef4444",
  "40-60": "#f59e0b",
  "60-80": "#22c55e",
  "80-100": "#22c55e",
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ScoreDistributionProps["data"][number] }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-3 shadow-lg text-sm">
      <p className="font-semibold">Rango {item.bucket}</p>
      <p className="text-muted-foreground">
        {item.count} municipio{item.count !== 1 ? "s" : ""}
      </p>
      {item.municipios.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
          {item.municipios.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ScoreDistribution({ data }: ScoreDistributionProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.bucket}
              fill={BUCKET_COLORS[entry.bucket] ?? "#94a3b8"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
