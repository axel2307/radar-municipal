import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getMunicipioById,
  MUNICIPIOS,
  ScoringDimension,
} from "@radar-municipal/core";
import { getMunicipioDetail, getRanking } from "@/lib/scoring-data";
import { DetailSectionNav } from "@/components/DetailSectionNav";
import { JsonLd } from "@/components/JsonLd";

import { MunicipioIntro } from "./MunicipioIntro";
import { MunicipioOverview } from "./MunicipioOverview";
import { MunicipioScoreGrid } from "./MunicipioScoreGrid";
import { GobiernoSection } from "./GobiernoSection";
import { EconomiaSection } from "./EconomiaSection";
import { CalidadSection } from "./CalidadSection";
import { InfraSection } from "./InfraSection";
import { DataAndGapsSection } from "./DataAndGapsSection";
import {
  SECTION_NAV,
  buildGovernmentOrgJsonLd,
  buildBreadcrumbJsonLd,
} from "./page-helpers";

/**
 * Sprint 47B — Ficha de municipio.
 *
 * Antes: 897 LOC monolíticos (JsonLd + header + datos base + 4 secciones
 * de dimension cards + datos y brechas, todo inline).
 *
 * Ahora: orchestrator slim que importa 8 sub-componentes + 2 helpers.
 * Cada concern en su archivo:
 *   - MunicipioIntro: breadcrumbs + header + datos base
 *   - MunicipioOverview: citizen summary + score + radar
 *   - MunicipioScoreGrid: scores por dimensión agrupada (4 categorías)
 *   - GobiernoSection, EconomiaSection, CalidadSection, InfraSection
 *   - DataAndGapsSection
 *   - page-helpers: SECTION_NAV + JSON-LD builders
 *
 * El comportamiento es 100% equivalente al monolítico. Cada cambio
 * futuro a una dimensión se hace en su archivo, sin riesgo de afectar
 * el resto.
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const municipio = getMunicipioById(id);
  return {
    title: municipio?.nombre ?? "Municipio no encontrado",
  };
}

export function generateStaticParams() {
  return MUNICIPIOS.map((m) => ({ id: m.id }));
}

export default async function MunicipioPage({ params }: PageProps) {
  const { id } = await params;
  const detail = getMunicipioDetail(id);
  const municipio = getMunicipioById(id);

  if (!municipio) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd data={buildGovernmentOrgJsonLd(municipio)} />
      <JsonLd data={buildBreadcrumbJsonLd(municipio)} />

      <MunicipioIntro municipio={municipio} />

      {detail ? (
        (() => {
          const ranking = getRanking();
          const pos =
            ranking.find((r) => r.municipio.id === id)?.posicion ?? 0;
          const dimScores: Record<string, number | null> = {
            [ScoringDimension.TRANSPARENCIA]: detail.scoreTransparencia,
            [ScoringDimension.FISCAL]: detail.scoreFiscal,
            [ScoringDimension.NORMATIVA]: detail.scoreNormativa,
            [ScoringDimension.PARTICIPACION_CIUDADANA]: detail.scoreParticipacion,
            [ScoringDimension.GASTO_POR_FUNCION]: detail.scoreGastoFuncion,
            [ScoringDimension.ECONOMIA_LOCAL]: detail.scoreEconomiaLocal,
            [ScoringDimension.PRESION_IMPOSITIVA]: detail.scorePresionImpositiva,
            [ScoringDimension.SERVICIOS_BASICOS]: detail.scoreServiciosBasicos,
            [ScoringDimension.EDUCACION_SALUD]: detail.scoreEducacionSalud,
            [ScoringDimension.CONECTIVIDAD_DIGITAL]: detail.scoreConectividad,
            [ScoringDimension.ESPACIO_PUBLICO]: detail.scoreEspacioPublico,
            [ScoringDimension.SEGURIDAD_VIAL]: detail.scoreSeguridadVial,
          };
          return (
            <>
              <MunicipioOverview
                municipio={municipio}
                detail={detail}
                ranking={pos}
                totalMunicipios={ranking.length}
                dimensionScores={dimScores}
              />

              <DetailSectionNav sections={SECTION_NAV} />

              <MunicipioScoreGrid detail={detail} id={id} />
              <GobiernoSection detail={detail} />
              <EconomiaSection detail={detail} id={id} />
              <CalidadSection detail={detail} />
              <InfraSection detail={detail} />
              <DataAndGapsSection detail={detail} />
            </>
          );
        })()
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">
            Este municipio aún no tiene datos detallados. Los scores se
            calcularán cuando se incorpore a la cobertura del proyecto.
          </p>
        </div>
      )}
    </div>
  );
}
