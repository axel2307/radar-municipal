import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMunicipioById, MUNICIPIOS } from "@radar-municipal/core";
import {
  getMunicipioDetail,
  getPresionImpositivaByMunicipio,
  getStockDeudaByMunicipio,
  getStockDeudaSeriesByMunicipio,
  getRedVialByMunicipio,
  getVialCrossMetrics,
} from "@/lib/scoring-data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Breadcrumbs } from "@/components/Breadcrumbs";

import { FiscalSection } from "./FiscalSection";
import { TasasSection } from "./TasasSection";
import { GastoFuncionSection } from "./GastoFuncionSection";
import { EconomiaLocalSection } from "./EconomiaLocalSection";
import { DeudaSection } from "./DeudaSection";
import { RedVialSection } from "./RedVialSection";
import { VialCrossSection } from "./VialCrossSection";

/**
 * Sprint 47D — Ficha económica del municipio.
 *
 * Antes: 734 LOC monolíticos con scores + 7 secciones inline + tablas
 * grandes + chart histórico de deuda + cross fiscal × vial.
 *
 * Ahora: orchestrator slim que importa 7 sub-componentes + helpers.
 * Cada sección por archivo. Mismo patrón que Sprint 47B
 * (/municipios/[id]).
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const municipio = getMunicipioById(id);
  return {
    title: municipio
      ? `${municipio.nombre} — Detalle económico`
      : "Municipio no encontrado",
  };
}

export function generateStaticParams() {
  return MUNICIPIOS.map((m) => ({ id: m.id }));
}

export default async function EconomiaPage({ params }: PageProps) {
  const { id } = await params;
  const detail = getMunicipioDetail(id);
  const municipio = getMunicipioById(id);
  const presion = getPresionImpositivaByMunicipio(id);
  const deudaSnapshot = getStockDeudaByMunicipio(id);
  const deudaSeries = getStockDeudaSeriesByMunicipio(id);
  const redVial = getRedVialByMunicipio(id);
  const vialCross = getVialCrossMetrics(id);

  if (!municipio) {
    notFound();
  }

  const hasAnyData = detail != null || deudaSnapshot != null || redVial != null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Inicio" },
          { href: "/municipios", label: "Municipios" },
          { href: `/municipios/${id}`, label: municipio.nombre },
          { label: "Economía" },
        ]}
        className="mb-6"
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {municipio.nombre} — Detalle económico
        </h1>
        <p className="mt-1 text-muted-foreground">
          Análisis fiscal, composición del gasto y economía local
        </p>
      </div>

      {!hasAnyData ? (
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">
            Sin datos económicos disponibles.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {detail && (
            <>
              {/* Scores resumen */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4 text-center">
                  <p className="text-xs font-medium text-amber-600 mb-2">
                    Fiscal
                  </p>
                  <ScoreBadge score={detail.scoreFiscal} size="lg" />
                </div>
                <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4 text-center">
                  <p className="text-xs font-medium text-amber-600 mb-2">
                    Gasto por función
                  </p>
                  <ScoreBadge score={detail.scoreGastoFuncion} size="lg" />
                </div>
                <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4 text-center">
                  <p className="text-xs font-medium text-amber-600 mb-2">
                    Economía local
                  </p>
                  <ScoreBadge score={detail.scoreEconomiaLocal} size="lg" />
                </div>
              </div>

              {detail.fiscal && <FiscalSection fiscal={detail.fiscal} />}
              {presion && <TasasSection presion={presion} />}
              {detail.gastoFuncion && (
                <GastoFuncionSection gastoFuncion={detail.gastoFuncion} />
              )}
              {detail.economiaLocal && (
                <EconomiaLocalSection economiaLocal={detail.economiaLocal} />
              )}
            </>
          )}

          {deudaSnapshot && (
            <DeudaSection
              snapshot={deudaSnapshot}
              series={deudaSeries}
              hasFiscalCurated={detail?.fiscal != null}
            />
          )}

          {redVial && <RedVialSection redVial={redVial} />}
          {vialCross && <VialCrossSection vialCross={vialCross} />}

          <p className="text-xs text-muted-foreground">
            <Link href="/metodologia" className="text-primary hover:underline">
              Ver metodología
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
