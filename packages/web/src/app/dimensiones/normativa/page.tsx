import type { Metadata } from "next";
import Link from "next/link";
import { MUNICIPIOS } from "@radar-municipal/core";
import { getDimensionBySlug } from "@/lib/scoring-data";
import {
  allNormativaData,
  allNormativaScores,
} from "@/lib/scoring-data/loaders";
import { DimensionBarChart } from "@/components/DimensionBarChart";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ShareButton } from "@/components/ShareButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Normativa — Boletín SIBOM, ordenanzas y compras",
  description:
    "Comparación de los 13 municipios piloto en publicación normativa: cobertura del Boletín SIBOM, ordenanzas fiscales vigentes y portales de compras.",
};

/**
 * Sprint 44B — Deep dive del Pilar 3 (Normativa).
 *
 * Esta página gana sobre `/dimensiones/[slug]/page.tsx` para el slug
 * "normativa" porque Next.js prioriza routes específicas sobre dynamic.
 * El opengraph-image generado para [slug] sigue aplicando.
 *
 * Reusa el bar chart genérico de `getDimensionBySlug` + agrega panel
 * propio con KPIs concretos: cobertura SIBOM, lista de ordenanzas
 * fiscales, % licitaciones publicadas, mejores y peores en cada métrica.
 */
export default function NormativaDimensionPage() {
  const data = getDimensionBySlug("normativa");
  const byId = new Map(MUNICIPIOS.map((m) => [m.id, m]));

  // Stats agregados sobre los 13 piloto
  const rows = [...allNormativaData.values()]
    .map((d) => {
      const muni = byId.get(d.municipioId);
      const score = allNormativaScores.get(d.municipioId);
      if (!muni) return null;
      return {
        id: d.municipioId,
        nombre: muni.nombre,
        region: muni.region,
        normasEncontradas: d.normasEncontradas,
        tieneBoletinSibom: d.tieneBoletinSibom,
        boletinesPublicados: d.boletinesPublicados,
        ultimoBoletinAnio: d.ultimoBoletinAnio,
        ordenanzaFiscal: d.ordenanzaFiscalVigente,
        compras: d.compras,
        scoreTotal: score?.scoreTotal ?? null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (b.scoreTotal ?? 0) - (a.scoreTotal ?? 0));

  const conBoletin = rows.filter((r) => r.tieneBoletinSibom).length;
  const conOrdenanza = rows.filter((r) => r.ordenanzaFiscal != null).length;
  const publicanLicitaciones = rows.filter(
    (r) => r.compras.publicaLicitaciones,
  ).length;
  const publicanAdjudicaciones = rows.filter(
    (r) => r.compras.publicaAdjudicaciones,
  ).length;
  const totalNormas = rows.reduce((s, r) => s + r.normasEncontradas, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Inicio" },
          { href: "/dimensiones", label: "Dimensiones" },
          { label: "Normativa" },
        ]}
        className="mb-6"
      />

      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{data?.label ?? "Normativa"}</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Ordenanzas, decretos, boletín oficial vía SIBOM, ordenanza fiscal
            vigente y portal de compras municipales. Indicadores de publicación
            normativa estructurada y trazabilidad institucional.
          </p>
        </div>
        <ShareButton title="Normativa - Radar Municipal" />
      </div>

      {/* Hero stats — cobertura agregada del piloto */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Boletín SIBOM
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-blue-700">
            {conBoletin}
            <span className="text-base text-muted-foreground">/{rows.length}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            piloto con boletín oficial publicado
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Ordenanza fiscal vigente
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {conOrdenanza}
            <span className="text-base text-muted-foreground">/{rows.length}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            con ord. impositiva identificable
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Licitaciones
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {publicanLicitaciones}
            <span className="text-base text-muted-foreground">/{rows.length}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            publican licitaciones · {publicanAdjudicaciones} adjudicaciones
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Normas agregadas
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {totalNormas.toLocaleString("es-AR")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            scrapeadas en el piloto
          </p>
        </div>
      </div>

      {/* Ranking score (reusa el bar chart genérico) */}
      {data && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Ranking por score normativa</h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <DimensionBarChart data={data.ranking} />
          </div>
        </section>
      )}

      {/* Tabla comparativa con KPIs concretos */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Comparación detallada</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Municipio
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                  Score
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-center hidden sm:table-cell">
                  Boletín
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-center hidden md:table-cell">
                  Ordenanza fiscal
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-center hidden lg:table-cell">
                  Licitaciones
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-center hidden lg:table-cell">
                  Adjudicaciones
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/municipios/${r.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {r.nombre}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {r.normasEncontradas.toLocaleString("es-AR")} normas
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={r.scoreTotal} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {r.tieneBoletinSibom ? (
                      <div>
                        <span className="text-score-high font-semibold">Sí</span>
                        <p className="text-[11px] text-muted-foreground">
                          {r.boletinesPublicados} boletines
                          {r.ultimoBoletinAnio && ` · hasta ${r.ultimoBoletinAnio}`}
                        </p>
                      </div>
                    ) : (
                      <span className="text-score-low text-xs">No publica</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs hidden md:table-cell">
                    {r.ordenanzaFiscal ? (
                      <div>
                        <span className="text-score-high font-semibold">
                          Ord. {r.ordenanzaFiscal.numero}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          {r.ordenanzaFiscal.anio}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No encontrada</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {r.compras.publicaLicitaciones ? (
                      <div>
                        <span className="text-score-high font-semibold">
                          {r.compras.licitacionesDetectadas}
                        </span>
                        {r.compras.plataforma && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-[120px] mx-auto">
                            {r.compras.plataforma}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-score-low text-xs">No publica</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {r.compras.publicaAdjudicaciones ? (
                      <span className="text-score-high font-semibold">Sí</span>
                    ) : (
                      <span className="text-score-low text-xs">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Notas metodológicas */}
      <section className="mt-12 rounded-lg border border-blue-200 bg-blue-50/40 p-5 text-sm">
        <h3 className="font-semibold text-blue-900 mb-2">
          Notas metodológicas
        </h3>
        <ul className="space-y-2 text-blue-900/90 leading-relaxed">
          <li>
            <strong>Boletín SIBOM</strong>: presencia del municipio en
            sibom.slyt.gba.gob.ar — sistema provincial de publicación
            normativa. La cobertura no es opcional para municipios bonaerenses
            pero la calidad de uso varía drásticamente (de 0 a 485 boletines
            en el piloto).
          </li>
          <li>
            <strong>Ordenanza fiscal vigente</strong>: ordenanza fiscal /
            impositiva anual identificable en el portal o SIBOM. Es la base
            legal del régimen tributario municipal. Algunos municipios no
            publican o el archivo no es trazable.
          </li>
          <li>
            <strong>Compras y adjudicaciones</strong>: existencia de un
            portal de licitaciones públicas + publicación de adjudicaciones
            (quién ganó, monto, fecha). Crítico para auditoría ciudadana.
          </li>
          <li>
            <strong>Cobertura del piloto: 13/135.</strong> Sprint 50+ podría
            extender a más municipios via scraping SIBOM directo (data
            disponible vía catálogo provincial).
          </li>
        </ul>
        <p className="mt-3 text-xs text-blue-900/70">
          Ver también la página de <Link href="/compras" className="underline">compras</Link>
          {" "}para análisis de concentración (HHI) y la página de{" "}
          <Link href="/metodologia" className="underline">metodología</Link>.
        </p>
      </section>
    </div>
  );
}
