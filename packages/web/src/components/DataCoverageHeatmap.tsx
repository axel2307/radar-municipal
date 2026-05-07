"use client";

interface DataCoverageHeatmapProps {
  data: {
    municipioId: string;
    nombre: string;
    dimensions: Record<string, boolean>;
  }[];
}

export function DataCoverageHeatmap({ data }: DataCoverageHeatmapProps) {
  if (data.length === 0) return null;

  const dimensionKeys = Object.keys(data[0].dimensions);

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-px text-xs"
        style={{
          gridTemplateColumns: `minmax(120px, auto) repeat(${dimensionKeys.length}, 24px) minmax(50px, auto)`,
        }}
      >
        {/* Header row */}
        <div className="sticky left-0 z-10 bg-white" />
        {dimensionKeys.map((dim) => (
          <div
            key={dim}
            className="flex items-end justify-center pb-1"
            style={{ height: 60 }}
          >
            <span
              className="block whitespace-nowrap font-medium text-muted-foreground"
              style={{
                transform: "rotate(-45deg)",
                transformOrigin: "bottom left",
              }}
            >
              {dim}
            </span>
          </div>
        ))}
        <div className="flex items-end justify-center pb-1 font-medium text-muted-foreground">
          %
        </div>

        {/* Data rows */}
        {data.map((row) => {
          const total = dimensionKeys.length;
          const filled = dimensionKeys.filter((k) => row.dimensions[k]).length;
          const pct = Math.round((filled / total) * 100);

          return (
            <div key={row.municipioId} className="contents">
              <div className="sticky left-0 z-10 bg-white flex items-center pr-2 font-medium truncate">
                {row.nombre}
              </div>
              {dimensionKeys.map((dim) => (
                <div
                  key={dim}
                  className="flex items-center justify-center"
                  title={`${row.nombre} - ${dim}: ${row.dimensions[dim] ? "Con datos" : "Sin datos"}`}
                >
                  <div
                    className={`h-5 w-5 rounded-sm ${
                      row.dimensions[dim]
                        ? "bg-green-500"
                        : "bg-red-200"
                    }`}
                  />
                </div>
              ))}
              <div className="flex items-center justify-center font-mono text-muted-foreground">
                {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
