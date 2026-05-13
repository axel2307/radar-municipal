import type { MunicipioDetail } from "@/lib/scoring-data";
import { cn } from "@/lib/utils";

/**
 * Sprint 47D — Sección "Economía local" de /economia.
 * Empleo per cápita + variación + empresas + tabla de criterios.
 */
export function EconomiaLocalSection({
  economiaLocal,
}: {
  economiaLocal: NonNullable<MunicipioDetail["economiaLocal"]>;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Economía local</h2>
      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Empleo per cápita</p>
          <p className="text-xl font-semibold">
            {economiaLocal.empleoPcapita?.toFixed(3) ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Variación empleo</p>
          <p
            className={cn(
              "text-xl font-semibold",
              economiaLocal.variacionEmpleo != null &&
                economiaLocal.variacionEmpleo >= 0
                ? "text-score-high"
                : "text-score-low",
            )}
          >
            {economiaLocal.variacionEmpleo != null
              ? `${economiaLocal.variacionEmpleo > 0 ? "+" : ""}${economiaLocal.variacionEmpleo.toFixed(1)}%`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Empresas / 1.000 hab</p>
          <p className="text-xl font-semibold">
            {economiaLocal.empresasPer1000?.toFixed(1) ?? "—"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                Indicador
              </th>
              <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-20">
                Peso
              </th>
              <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-20">
                Score
              </th>
              <th className="px-4 py-2 text-left font-semibold text-muted-foreground hidden md:table-cell">
                Detalle
              </th>
            </tr>
          </thead>
          <tbody>
            {economiaLocal.criterios.map((c) => (
              <tr
                key={c.indicador}
                className="border-b border-border last:border-0"
              >
                <td className="px-4 py-2 font-medium">{c.descripcion}</td>
                <td className="px-4 py-2 text-center text-muted-foreground">
                  {(c.peso * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2 text-center">
                  <span
                    className={cn(
                      "font-medium",
                      c.valorNormalizado >= 0.7
                        ? "text-score-high"
                        : c.valorNormalizado >= 0.4
                          ? "text-score-mid"
                          : "text-score-low",
                    )}
                  >
                    {(c.valorNormalizado * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">
                  {c.interpretacion}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
