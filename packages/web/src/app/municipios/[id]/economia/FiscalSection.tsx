import type { MunicipioDetail } from "@/lib/scoring-data";
import { FiscalValue } from "./economia-helpers";
import { cn } from "@/lib/utils";

/**
 * Sprint 47D — Sección "Indicadores fiscales" de /economia.
 * 7 KPIs con coloreo + tabla detallada de criterios + nota.
 */
export function FiscalSection({ fiscal }: { fiscal: NonNullable<MunicipioDetail["fiscal"]> }) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Indicadores fiscales</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <FiscalValue label="Gasto per cápita" value={fiscal.gastoPcapita} unit="$" />
        <FiscalValue label="Deuda per cápita" value={fiscal.deudaPcapita} unit="$" />
        <FiscalValue
          label="% Gasto en personal"
          value={fiscal.pctPersonal}
          unit="%"
          colorize="lower-better"
        />
        <FiscalValue
          label="% Gasto de capital"
          value={fiscal.pctCapital}
          unit="%"
          colorize="higher-better"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <FiscalValue
          label="Resultado per cápita"
          value={fiscal.resultadoPcapita}
          unit="$"
          colorize="positive"
        />
        <FiscalValue
          label="Autonomía fiscal"
          value={fiscal.autonomiaFiscal}
          unit="%"
          colorize="higher-better"
        />
        <FiscalValue
          label="Eficiencia administrativa"
          value={fiscal.eficienciaAdmin}
          unit="%"
          colorize="lower-better"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border mb-4">
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
            {fiscal.criterios.map((c) => (
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
      <p className="text-xs text-muted-foreground">{fiscal.notas}</p>
    </section>
  );
}
