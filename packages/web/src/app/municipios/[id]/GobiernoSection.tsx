import type { MunicipioDetail } from "@/lib/scoring-data";
import { DimensionCard } from "@/components/DimensionCard";
import { CriteriaTable } from "@/components/CriteriaTable";
import { cn } from "@/lib/utils";

/**
 * Sprint 47B — Sección "Gobierno Abierto" de la ficha municipal.
 * Contiene: Transparencia + Normativa+compras + Participación + Documentos
 * fiscales detectados. Todas las DimensionCards van detrás del id="gobierno"
 * para que el DetailSectionNav las anchoree.
 */
export function GobiernoSection({ detail }: { detail: MunicipioDetail }) {
  return (
    <div id="gobierno" className="scroll-target">
      <h2 className="text-lg font-semibold text-blue-700 mb-4">
        Gobierno Abierto
      </h2>

      <DimensionCard
        title="Transparencia"
        score={detail.scoreTransparencia}
        color="blue"
      >
        <CriteriaTable
          criterios={detail.breakdown.map((row) => ({
            descripcion: row.descripcion,
            indicador: row.criterio,
            peso: row.peso,
            valor: row.valor,
            evidencia: row.evidencia,
          }))}
          totalLabel="Total transparencia"
          totalScore={detail.scoreTransparencia}
          type="binary"
        />
      </DimensionCard>

      {detail.normativa && (
        <DimensionCard
          title="Normativa y compras"
          score={detail.normativa.scoreTotal}
          color="blue"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Boletín SIBOM</p>
              <p
                className={cn(
                  "text-lg font-semibold",
                  detail.normativa.tieneBoletinSibom
                    ? "text-score-high"
                    : "text-score-low",
                )}
              >
                {detail.normativa.tieneBoletinSibom ? "Sí" : "No"}
              </p>
              {detail.normativa.tieneBoletinSibom && (
                <p className="text-xs text-muted-foreground">
                  {detail.normativa.boletinesPublicados} boletines
                </p>
              )}
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                Ord. fiscal vigente
              </p>
              <p
                className={cn(
                  "text-sm font-semibold",
                  detail.normativa.ordenanzaFiscal
                    ? "text-score-high"
                    : "text-score-low",
                )}
              >
                {detail.normativa.ordenanzaFiscal ?? "No encontrada"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Licitaciones</p>
              <p
                className={cn(
                  "text-lg font-semibold",
                  detail.normativa.compras.publicaLicitaciones
                    ? "text-score-high"
                    : "text-score-low",
                )}
              >
                {detail.normativa.compras.publicaLicitaciones
                  ? `${detail.normativa.compras.licitacionesDetectadas} detectadas`
                  : "No publica"}
              </p>
              {detail.normativa.compras.plataforma && (
                <p className="text-xs text-muted-foreground">
                  {detail.normativa.compras.plataforma}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Adjudicaciones</p>
              <p
                className={cn(
                  "text-lg font-semibold",
                  detail.normativa.compras.publicaAdjudicaciones
                    ? "text-score-high"
                    : "text-score-low",
                )}
              >
                {detail.normativa.compras.publicaAdjudicaciones
                  ? "Publica"
                  : "No publica"}
              </p>
            </div>
          </div>
          <CriteriaTable
            criterios={detail.normativa.criterios.map((c) => ({
              descripcion: c.descripcion,
              indicador: c.indicador,
              peso: c.peso,
              valor: c.valor,
              evidencia: c.evidencia,
            }))}
            totalLabel="Total normativa"
            totalScore={detail.normativa.scoreTotal}
            type="binary"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Normas extraídas de SIBOM. {detail.normativa.normasEncontradas}{" "}
            normas encontradas en total.
            {detail.normativa.compras.urlPortalCompras && (
              <>
                {" "}
                Portal de compras:{" "}
                <a
                  href={detail.normativa.compras.urlPortalCompras}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  visitar
                </a>
                .
              </>
            )}
          </p>
        </DimensionCard>
      )}

      {detail.participacion && (
        <DimensionCard
          title="Participación ciudadana"
          score={detail.participacion.scoreTotal}
          color="blue"
        >
          <CriteriaTable
            criterios={detail.participacion.criterios.map((c) => ({
              descripcion: c.descripcion,
              indicador: c.indicador,
              peso: c.peso,
              valor: c.valor,
              evidencia: c.evidencia,
            }))}
            totalLabel="Total participación"
            totalScore={detail.participacion.scoreTotal}
            type="binary"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Fuente: Relevamiento de portal municipal + SIBOM.
          </p>
        </DimensionCard>
      )}

      <DimensionCard
        title="Documentos fiscales detectados"
        score={null}
        color="blue"
        defaultOpen={false}
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                  Documento
                </th>
                <th className="px-4 py-2 text-center font-semibold text-muted-foreground">
                  Publicado
                </th>
                <th className="px-4 py-2 text-center font-semibold text-muted-foreground">
                  Formato
                </th>
                <th className="px-4 py-2 text-center font-semibold text-muted-foreground">
                  Parseable
                </th>
                <th className="px-4 py-2 text-center font-semibold text-muted-foreground">
                  Rezago
                </th>
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground hidden md:table-cell">
                  Fuente
                </th>
              </tr>
            </thead>
            <tbody>
              {detail.documentos.map((doc) => (
                <tr
                  key={doc.categoria}
                  className={cn(
                    "border-b border-border last:border-0",
                    doc.publicado ? "" : "bg-score-low/5",
                  )}
                >
                  <td className="px-4 py-2 font-medium">{doc.categoriaLabel}</td>
                  <td className="px-4 py-2 text-center">
                    {doc.publicado ? (
                      <span className="text-score-high font-medium">Sí</span>
                    ) : (
                      <span className="text-score-low font-medium">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center text-muted-foreground">
                    {doc.formato ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {doc.publicado ? (
                      doc.esParseable ? (
                        <span className="text-score-high text-xs">Sí</span>
                      ) : (
                        <span className="text-score-low text-xs">No</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center text-muted-foreground">
                    {doc.rezagoDias != null ? `${doc.rezagoDias} días` : "—"}
                  </td>
                  <td className="px-4 py-2 hidden md:table-cell">
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline break-all"
                      >
                        Ver fuente
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DimensionCard>
    </div>
  );
}
