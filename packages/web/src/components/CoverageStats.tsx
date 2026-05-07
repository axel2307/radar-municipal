import type { CoverageStats as CoverageStatsType } from "@/lib/scoring-data";

interface CoverageStatsProps {
  stats: CoverageStatsType;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(dias: number | null): string | null {
  if (dias == null) return null;
  if (dias === 0) return "hoy";
  if (dias === 1) return "hace 1 día";
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.round(dias / 30);
  if (meses < 12) return `hace ${meses} mes${meses !== 1 ? "es" : ""}`;
  const anios = Math.round(dias / 365);
  return `hace ${anios} año${anios !== 1 ? "s" : ""}`;
}

export function CoverageStats({ stats }: CoverageStatsProps) {
  const pctConDatos =
    stats.totalMunicipios === 0
      ? 0
      : Math.round((stats.conDatos / stats.totalMunicipios) * 100);
  const relUpdate = formatRelative(stats.diasDesdeActualizacion);

  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        label="Municipios con datos"
        value={`${stats.conDatos}/${stats.totalMunicipios}`}
        helper={`${pctConDatos}% de la provincia`}
      />
      <Card
        label="Cobertura promedio"
        value={`${stats.coberturaPromedioPiloto}%`}
        helper={`sobre los ${stats.conDatos} con datos`}
      />
      <Card
        label="Última actualización"
        value={formatDate(stats.ultimaActualizacionGlobal)}
        helper={relUpdate ?? "sin registros"}
      />
      <Card
        label="Brechas detectadas"
        value={stats.brechasTotales.toString()}
        helper="entre municipal y provincial"
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
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
    </div>
  );
}
