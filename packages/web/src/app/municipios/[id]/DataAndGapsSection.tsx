import Link from "next/link";
import type { MunicipioDetail } from "@/lib/scoring-data";

/**
 * Sprint 47B — Sección "Datos y Brechas": accesibilidad del portal,
 * brechas detectadas (campos faltantes en el RAFAM municipal vs provincial),
 * y resumen de procedencia de la data fiscal.
 */
export function DataAndGapsSection({ detail }: { detail: MunicipioDetail }) {
  return (
    <div id="datos" className="scroll-target">
      <h2 className="text-lg font-semibold mb-4">Datos y Brechas</h2>

      {/* Accesibilidad */}
      <div className="mb-6">
        <h3 className="text-base font-medium mb-3">Accesibilidad del portal</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Clicks desde home</p>
            <p className="text-xl font-semibold">
              {detail.accesibilidad.clicksDesdeHome ?? "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Menú transparencia</p>
            <p className="text-xl font-semibold">
              {detail.accesibilidad.menuTransparenciaVisible ? (
                <span className="text-score-high">Visible</span>
              ) : (
                <span className="text-score-low">No visible</span>
              )}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Portal transparencia</p>
            {detail.accesibilidad.urlPortal ? (
              <a
                href={detail.accesibilidad.urlPortal}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                Visitar portal
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No tiene</p>
            )}
          </div>
        </div>
      </div>

      {/* Brechas de datos */}
      {detail.dataGaps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-medium mb-3">
            Brechas de datos detectadas ({detail.dataGaps.length})
          </h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                    Campo
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-muted-foreground">
                    Año
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-muted-foreground">
                    Trim.
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-muted-foreground">
                    Municipal
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-muted-foreground">
                    Provincial
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-muted-foreground">
                    Tipo
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.dataGaps.map((gap, i) => (
                  <tr
                    key={`${gap.campo}-${gap.anio}-${gap.trimestre}-${i}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-2 font-medium">{gap.campo}</td>
                    <td className="px-4 py-2 text-center text-muted-foreground">
                      {gap.anio}
                    </td>
                    <td className="px-4 py-2 text-center text-muted-foreground">
                      Q{gap.trimestre}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {gap.existeEnMunicipal ? (
                        <span className="text-score-high">Sí</span>
                      ) : (
                        <span className="text-score-low">No</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {gap.existeEnProvincial ? (
                        <span className="text-score-high">Sí</span>
                      ) : (
                        <span className="text-score-low">No</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center text-xs text-muted-foreground">
                      {gap.tipo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Procedencia */}
      {detail.procedenciaSummary && (
        <div className="mb-6">
          <h3 className="text-base font-medium mb-3">
            Procedencia de datos fiscales
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-score-high">
                {detail.procedenciaSummary.totalConDato}
              </p>
              <p className="text-xs text-muted-foreground">Campos con dato</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-score-low">
                {detail.procedenciaSummary.totalSinDato}
              </p>
              <p className="text-xs text-muted-foreground">Campos sin dato</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Por capa</p>
              {Object.entries(detail.procedenciaSummary.porCapa).map(
                ([capa, count]) => (
                  <p key={capa} className="text-sm">
                    <span className="font-medium">{capa}:</span> {count}
                  </p>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Auditoría realizada el {detail.fechaAuditoria}. Todos los scores son
        trazables a fuentes públicas.{" "}
        <Link href="/metodologia" className="text-primary hover:underline">
          Ver metodología
        </Link>
      </p>
    </div>
  );
}
