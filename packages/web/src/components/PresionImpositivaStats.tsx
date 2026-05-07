import type { PresionImpositivaStats as StatsType } from "@radar-municipal/core";

interface Props {
  stats: StatsType;
}

function formatArs(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PresionImpositivaStats({ stats }: Props) {
  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        label="Vivienda (ABL/TSG)"
        value={formatArs(stats.medianaVivienda)}
        helper={`mediana anual ${stats.anioFiscalReferencia}`}
      />
      <Card
        label="Comercio (TISH)"
        value={formatArs(stats.medianaComercio)}
        helper={`mediana anual ${stats.anioFiscalReferencia}`}
      />
      <Card
        label="Rural (Vial 100 ha)"
        value={formatArs(stats.medianaRural)}
        helper={`mediana anual ${stats.anioFiscalReferencia}`}
      />
      <Card
        label="Construcción (100 m²)"
        value={formatArs(stats.medianaConstruccion)}
        helper={`${stats.conOrdenanzaFiscalVigente} con ordenanza vigente`}
      />
    </section>
  );
}

function Card({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold text-foreground sm:text-2xl">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
    </div>
  );
}
