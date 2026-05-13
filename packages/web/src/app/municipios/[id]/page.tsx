import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMunicipioById, MUNICIPIOS, ScoringDimension } from "@radar-municipal/core";
import { getMunicipioDetail, getRanking } from "@/lib/scoring-data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { RadarChart } from "@/components/RadarChart";
import { CitizenSummary } from "@/components/CitizenSummary";
import { SpendingBreakdown } from "@/components/SpendingBreakdown";
import { ShareButton } from "@/components/ShareButton";
import { DetailSectionNav } from "@/components/DetailSectionNav";
import { DimensionCard } from "@/components/DimensionCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatNumber, cn } from "@/lib/utils";
import { JsonLd } from "@/components/JsonLd";

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

const SECTION_NAV = [
  { id: "resumen", label: "Resumen" },
  { id: "gobierno", label: "Gobierno Abierto", color: "blue" },
  { id: "economia", label: "Economía", color: "amber" },
  { id: "calidad", label: "Calidad de Vida", color: "green" },
  { id: "infra", label: "Infraestructura", color: "purple" },
  { id: "datos", label: "Datos y Brechas" },
];

/** Reusable criteria table for dimension breakdowns with normalized values */
function CriteriaTable({ criterios, totalLabel, totalScore, type }: {
  criterios: { descripcion: string; indicador: string; peso: number; valorNormalizado?: number; valor?: number; interpretacion?: string; evidencia?: string }[];
  totalLabel: string;
  totalScore: number;
  type: "normalized" | "binary";
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground">{type === "binary" ? "Criterio" : "Indicador"}</th>
            <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-16">Peso</th>
            <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-20">Score</th>
            <th className="px-4 py-2 text-left font-semibold text-muted-foreground hidden md:table-cell">{type === "binary" ? "Evidencia" : "Detalle"}</th>
          </tr>
        </thead>
        <tbody>
          {criterios.map((c) => {
            const val = c.valorNormalizado ?? c.valor ?? 0;
            return (
              <tr key={c.indicador} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-medium">{c.descripcion}</td>
                <td className="px-4 py-2 text-center text-muted-foreground">{(c.peso * 100).toFixed(0)}%</td>
                <td className="px-4 py-2 text-center">
                  <span className={cn(
                    "font-medium",
                    val >= 0.7 ? "text-score-high" : val >= 0.4 ? "text-score-mid" : "text-score-low"
                  )}>
                    {(val * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{c.interpretacion ?? c.evidencia ?? ""}</td>
              </tr>
            );
          })}
          <tr className="bg-muted/30 font-semibold">
            <td className="px-4 py-2">{totalLabel}</td>
            <td className="px-4 py-2 text-center">100%</td>
            <td className="px-4 py-2 text-center">
              <ScoreBadge score={totalScore} size="sm" />
            </td>
            <td className="px-4 py-2 hidden md:table-cell" />
          </tr>
        </tbody>
      </table>
    </div>
  );
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
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "GovernmentOrganization",
        "name": `Municipio de ${municipio.nombre}`,
        "areaServed": {
          "@type": "AdministrativeArea",
          "name": `Partido de ${municipio.partido}, Provincia de Buenos Aires, Argentina`,
        },
        ...(municipio.urlOficial ? { "url": municipio.urlOficial } : {}),
        "description": `Ficha municipal de ${municipio.nombre} con scores en 11 dimensiones de gestión pública.`,
      }} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://radarmunicipal.ar" },
          { "@type": "ListItem", "position": 2, "name": "Municipios", "item": "https://radarmunicipal.ar/municipios" },
          { "@type": "ListItem", "position": 3, "name": municipio.nombre },
        ],
      }} />
      <Breadcrumbs
        items={[
          { href: "/", label: "Inicio" },
          { href: "/municipios", label: "Municipios" },
          { label: municipio.nombre },
        ]}
        className="mb-6"
      />

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{municipio.nombre}</h1>
          {municipio.esPiloto && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Piloto
            </span>
          )}
          <ShareButton title={`${municipio.nombre} - Radar Municipal`} />
        </div>
        <p className="mt-1 text-muted-foreground">
          Partido de {municipio.partido} &middot; {municipio.region}
        </p>
      </div>

      {/* Datos base */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Población</p>
          <p className="text-xl font-semibold">{formatNumber(municipio.poblacion)}</p>
          <p className="text-xs text-muted-foreground">Censo 2022</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Superficie</p>
          <p className="text-xl font-semibold">{formatNumber(municipio.superficieKm2)} km²</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Densidad</p>
          <p className="text-xl font-semibold">{municipio.densidad?.toFixed(1) ?? "—"} hab/km²</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Sitio oficial</p>
          {municipio.urlOficial ? (
            <a
              href={municipio.urlOficial}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline break-all"
            >
              {municipio.urlOficial.replace("https://", "")}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">No registrado</p>
          )}
        </div>
      </div>

      {detail ? (
        (() => {
          const ranking = getRanking();
          const pos = ranking.find((r) => r.municipio.id === id)?.posicion ?? 0;
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
          return <>
          {/* Resumen ciudadano */}
          <CitizenSummary
            municipioName={municipio.nombre}
            ranking={pos}
            totalMunicipios={ranking.length}
            dimensionScores={dimScores}
            categoryScores={detail.categoryScores}
          />

          {/* Score Total + Radar */}
          <div className="grid gap-6 lg:grid-cols-2 my-6">
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">Score Total</p>
              <ScoreBadge score={detail.scoreTotal} size="lg" />
            </div>
            <RadarChart
              series={[{
                name: municipio.nombre,
                color: "#3b82f6",
                dimensions: [
                  { label: "Transparencia", shortLabel: "Transp.", score: detail.scoreTransparencia },
                  { label: "Normativa", shortLabel: "Norm.", score: detail.scoreNormativa ?? 0 },
                  { label: "Participación", shortLabel: "Partic.", score: detail.scoreParticipacion ?? 0 },
                  { label: "Fiscal", score: detail.scoreFiscal ?? 0 },
                  { label: "Gasto público", shortLabel: "Gasto", score: detail.scoreGastoFuncion ?? 0 },
                  { label: "Economía local", shortLabel: "Econ.", score: detail.scoreEconomiaLocal ?? 0 },
                  { label: "Presión impositiva", shortLabel: "Pres.Imp.", score: detail.scorePresionImpositiva ?? 0 },
                  { label: "Servicios básicos", shortLabel: "Serv.", score: detail.scoreServiciosBasicos ?? 0 },
                  { label: "Educación y salud", shortLabel: "Educ.", score: detail.scoreEducacionSalud ?? 0 },
                  { label: "Conectividad", shortLabel: "Conect.", score: detail.scoreConectividad ?? 0 },
                  { label: "Espacio público", shortLabel: "Esp.Púb.", score: detail.scoreEspacioPublico ?? 0 },
                  { label: "Seguridad vial", shortLabel: "Seg.Vial", score: detail.scoreSeguridadVial ?? 0 },
                ],
              }]}
            />
          </div>

          {/* ═══ Tab Navigation ═══ */}
          <DetailSectionNav sections={SECTION_NAV} />

          {/* ═══ RESUMEN ═══ */}
          <div id="resumen" className="scroll-target">
            <h2 className="text-lg font-semibold mb-4">Scores por dimensión</h2>

            {/* Gobierno Abierto */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">Gobierno Abierto</p>
              <div className="grid gap-3 sm:grid-cols-3 mb-2">
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Transparencia</p>
                  <ScoreBadge score={detail.scoreTransparencia} size="md" />
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Normativa</p>
                  <ScoreBadge score={detail.scoreNormativa} size="md" />
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Participación</p>
                  <ScoreBadge score={detail.scoreParticipacion} size="md" />
                </div>
              </div>
            </div>

            {/* Economía y Finanzas */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Economía y Finanzas</p>
                <Link href={`/municipios/${id}/economia`} className="text-xs text-amber-600 hover:underline">
                  Ver detalle &rarr;
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-2">
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Fiscal</p>
                  <ScoreBadge score={detail.scoreFiscal} size="md" />
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Gasto por función</p>
                  <ScoreBadge score={detail.scoreGastoFuncion} size="md" />
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Economía local</p>
                  <ScoreBadge score={detail.scoreEconomiaLocal} size="md" />
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Presión impositiva</p>
                  <ScoreBadge score={detail.scorePresionImpositiva} size="md" />
                </div>
              </div>
            </div>

            {/* Calidad de Vida */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-green-600 mb-2 uppercase tracking-wide">Calidad de Vida</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-2">
                <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Servicios básicos</p>
                  <ScoreBadge score={detail.scoreServiciosBasicos} size="md" />
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Educación y salud</p>
                  <ScoreBadge score={detail.scoreEducacionSalud} size="md" />
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Conectividad</p>
                  <ScoreBadge score={detail.scoreConectividad} size="md" />
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Espacio público</p>
                  <ScoreBadge score={detail.scoreEspacioPublico} size="md" />
                </div>
              </div>
            </div>

            {/* Infraestructura */}
            <div className="mb-8">
              <p className="text-xs font-semibold text-purple-600 mb-2 uppercase tracking-wide">Infraestructura y Movilidad</p>
              <div className="grid gap-3 sm:grid-cols-1 mb-2">
                <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Seguridad vial</p>
                  <ScoreBadge score={detail.scoreSeguridadVial} size="md" />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ GOBIERNO ABIERTO ═══ */}
          <div id="gobierno" className="scroll-target">
            <h2 className="text-lg font-semibold text-blue-700 mb-4">Gobierno Abierto</h2>

            <DimensionCard title="Transparencia" score={detail.scoreTransparencia} color="blue">
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
              <DimensionCard title="Normativa y compras" score={detail.normativa.scoreTotal} color="blue">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Boletín SIBOM</p>
                    <p className={cn("text-lg font-semibold", detail.normativa.tieneBoletinSibom ? "text-score-high" : "text-score-low")}>
                      {detail.normativa.tieneBoletinSibom ? "Sí" : "No"}
                    </p>
                    {detail.normativa.tieneBoletinSibom && (
                      <p className="text-xs text-muted-foreground">{detail.normativa.boletinesPublicados} boletines</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Ord. fiscal vigente</p>
                    <p className={cn("text-sm font-semibold", detail.normativa.ordenanzaFiscal ? "text-score-high" : "text-score-low")}>
                      {detail.normativa.ordenanzaFiscal ?? "No encontrada"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Licitaciones</p>
                    <p className={cn("text-lg font-semibold", detail.normativa.compras.publicaLicitaciones ? "text-score-high" : "text-score-low")}>
                      {detail.normativa.compras.publicaLicitaciones
                        ? `${detail.normativa.compras.licitacionesDetectadas} detectadas`
                        : "No publica"}
                    </p>
                    {detail.normativa.compras.plataforma && (
                      <p className="text-xs text-muted-foreground">{detail.normativa.compras.plataforma}</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Adjudicaciones</p>
                    <p className={cn("text-lg font-semibold", detail.normativa.compras.publicaAdjudicaciones ? "text-score-high" : "text-score-low")}>
                      {detail.normativa.compras.publicaAdjudicaciones ? "Publica" : "No publica"}
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
                  Normas extraídas de SIBOM. {detail.normativa.normasEncontradas} normas encontradas en total.
                  {detail.normativa.compras.urlPortalCompras && (
                    <> Portal de compras: <a href={detail.normativa.compras.urlPortalCompras} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">visitar</a>.</>
                  )}
                </p>
              </DimensionCard>
            )}

            {detail.participacion && (
              <DimensionCard title="Participación ciudadana" score={detail.participacion.scoreTotal} color="blue">
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

            {/* Documentos fiscales */}
            <DimensionCard title="Documentos fiscales detectados" score={null} color="blue" defaultOpen={false}>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Documento</th>
                      <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Publicado</th>
                      <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Formato</th>
                      <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Parseable</th>
                      <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Rezago</th>
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground hidden md:table-cell">Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.documentos.map((doc) => (
                      <tr
                        key={doc.categoria}
                        className={cn(
                          "border-b border-border last:border-0",
                          doc.publicado ? "" : "bg-score-low/5"
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
                        <td className="px-4 py-2 text-center text-muted-foreground">{doc.formato ?? "—"}</td>
                        <td className="px-4 py-2 text-center">
                          {doc.publicado ? (
                            doc.esParseable ? <span className="text-score-high text-xs">Sí</span> : <span className="text-score-low text-xs">No</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center text-muted-foreground">{doc.rezagoDias != null ? `${doc.rezagoDias} días` : "—"}</td>
                        <td className="px-4 py-2 hidden md:table-cell">
                          {doc.url ? (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline break-all">Ver fuente</a>
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

          {/* ═══ ECONOMÍA ═══ */}
          <div id="economia" className="scroll-target">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-amber-700">Economía y Finanzas</h2>
              <Link href={`/municipios/${id}/economia`} className="text-xs text-amber-600 hover:underline">
                Ver detalle completo &rarr;
              </Link>
            </div>

            {detail.fiscal && (
              <DimensionCard title="Indicadores fiscales" score={detail.fiscal.scoreTotal} color="amber">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Gasto per cápita</p>
                    <p className="text-lg font-semibold">
                      {detail.fiscal.gastoPcapita != null ? `$${formatNumber(Math.round(detail.fiscal.gastoPcapita))}` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">$/habitante/año</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Deuda per cápita</p>
                    <p className="text-lg font-semibold">
                      {detail.fiscal.deudaPcapita != null ? `$${formatNumber(Math.round(detail.fiscal.deudaPcapita))}` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">$/habitante</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">% Personal</p>
                    <p className={cn(
                      "text-lg font-semibold",
                      detail.fiscal.pctPersonal != null
                        ? detail.fiscal.pctPersonal < 55 ? "text-score-high" : detail.fiscal.pctPersonal < 65 ? "text-score-mid" : "text-score-low"
                        : ""
                    )}>
                      {detail.fiscal.pctPersonal != null ? `${detail.fiscal.pctPersonal.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">% Capital</p>
                    <p className={cn(
                      "text-lg font-semibold",
                      detail.fiscal.pctCapital != null
                        ? detail.fiscal.pctCapital >= 15 ? "text-score-high" : detail.fiscal.pctCapital >= 10 ? "text-score-mid" : "text-score-low"
                        : ""
                    )}>
                      {detail.fiscal.pctCapital != null ? `${detail.fiscal.pctCapital.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                </div>
                <CriteriaTable
                  criterios={detail.fiscal.criterios}
                  totalLabel="Total fiscal"
                  totalScore={detail.fiscal.scoreTotal}
                  type="normalized"
                />
                <p className="text-xs text-muted-foreground mt-2">{detail.fiscal.notas}</p>
                {detail.fiscal.procedencia.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium">Fuentes:</span>{" "}
                    {[...new Set(detail.fiscal.procedencia.filter((p) => p.capa).map((p) => `${p.organismo} (${p.capa})`))].join(", ")}
                  </div>
                )}
              </DimensionCard>
            )}

            {detail.gastoFuncion && (
              <DimensionCard title="Gasto por función" score={detail.gastoFuncion.scoreTotal} color="amber">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <p className="text-xs text-muted-foreground">% Servicios sociales</p>
                    <p className="text-xl font-semibold">{detail.gastoFuncion.pctServiciosSociales != null ? `${detail.gastoFuncion.pctServiciosSociales.toFixed(1)}%` : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <p className="text-xs text-muted-foreground">% Servicios económicos</p>
                    <p className="text-xl font-semibold">{detail.gastoFuncion.pctServiciosEconomicos != null ? `${detail.gastoFuncion.pctServiciosEconomicos.toFixed(1)}%` : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <p className="text-xs text-muted-foreground">% Administración</p>
                    <p className={cn(
                      "text-xl font-semibold",
                      detail.gastoFuncion.pctAdminGubernamental != null
                        ? detail.gastoFuncion.pctAdminGubernamental <= 25 ? "text-score-high" : detail.gastoFuncion.pctAdminGubernamental <= 35 ? "text-score-mid" : "text-score-low"
                        : ""
                    )}>{detail.gastoFuncion.pctAdminGubernamental != null ? `${detail.gastoFuncion.pctAdminGubernamental.toFixed(1)}%` : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <p className="text-xs text-muted-foreground">HHI diversificación</p>
                    <p className="text-xl font-semibold">{detail.gastoFuncion.diversificacionHhi != null ? detail.gastoFuncion.diversificacionHhi.toFixed(3) : "—"}</p>
                    <p className="text-xs text-muted-foreground">Menor = más diversificado</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 mb-4">
                  <p className="text-sm font-medium text-center mb-2">Composición del gasto por función</p>
                  <SpendingBreakdown
                    data={[
                      { nombre: "Servicios sociales", pct: detail.gastoFuncion.pctServiciosSociales ?? 0 },
                      { nombre: "Servicios económicos", pct: detail.gastoFuncion.pctServiciosEconomicos ?? 0 },
                      { nombre: "Administración", pct: detail.gastoFuncion.pctAdminGubernamental ?? 0 },
                      { nombre: "Otros / Deuda", pct: Math.max(0, 100 - (detail.gastoFuncion.pctServiciosSociales ?? 0) - (detail.gastoFuncion.pctServiciosEconomicos ?? 0) - (detail.gastoFuncion.pctAdminGubernamental ?? 0)) },
                    ]}
                    height={260}
                  />
                </div>
                <CriteriaTable
                  criterios={detail.gastoFuncion.criterios}
                  totalLabel="Total gasto por función"
                  totalScore={detail.gastoFuncion.scoreTotal}
                  type="normalized"
                />
                <p className="text-xs text-muted-foreground mt-2">Fuente: Ejecución presupuestaria RAFAM. {detail.gastoFuncion.notas}</p>
              </DimensionCard>
            )}

            {detail.economiaLocal && (
              <DimensionCard title="Economía local" score={detail.economiaLocal.scoreTotal} color="amber">
                <div className="grid gap-4 sm:grid-cols-3 mb-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Empleo per cápita</p>
                    <p className="text-xl font-semibold">{detail.economiaLocal.empleoPcapita != null ? detail.economiaLocal.empleoPcapita.toFixed(2) : "—"}</p>
                    <p className="text-xs text-muted-foreground">empleo registrado / habitante</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Variación empleo</p>
                    <p className={cn(
                      "text-xl font-semibold",
                      detail.economiaLocal.variacionEmpleo != null ? (detail.economiaLocal.variacionEmpleo >= 0 ? "text-score-high" : "text-score-low") : ""
                    )}>
                      {detail.economiaLocal.variacionEmpleo != null
                        ? `${detail.economiaLocal.variacionEmpleo > 0 ? "+" : ""}${detail.economiaLocal.variacionEmpleo.toFixed(1)}%`
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">interanual</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Empresas / 1000 hab.</p>
                    <p className="text-xl font-semibold">{detail.economiaLocal.empresasPer1000 != null ? detail.economiaLocal.empresasPer1000.toFixed(1) : "—"}</p>
                  </div>
                </div>
                <CriteriaTable
                  criterios={detail.economiaLocal.criterios}
                  totalLabel="Total economía local"
                  totalScore={detail.economiaLocal.scoreTotal}
                  type="normalized"
                />
                <p className="text-xs text-muted-foreground mt-2">Fuente: OEDE (Min. Trabajo), AFIP, IERIC. {detail.economiaLocal.notas}</p>
              </DimensionCard>
            )}
          </div>

          {/* ═══ CALIDAD DE VIDA ═══ */}
          <div id="calidad" className="scroll-target">
            <h2 className="text-lg font-semibold text-green-700 mb-4">Calidad de Vida</h2>

            {detail.serviciosBasicos && (
              <DimensionCard title="Servicios básicos" score={detail.serviciosBasicos.scoreTotal} color="green">
                <div className="grid gap-4 sm:grid-cols-3 mb-4">
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Agua de red</p>
                    <p className="text-xl font-semibold">{detail.serviciosBasicos.pctAguaRed != null ? `${detail.serviciosBasicos.pctAguaRed.toFixed(1)}%` : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Red cloacal</p>
                    <p className="text-xl font-semibold">{detail.serviciosBasicos.pctCloaca != null ? `${detail.serviciosBasicos.pctCloaca.toFixed(1)}%` : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Gas de red</p>
                    <p className="text-xl font-semibold">{detail.serviciosBasicos.pctGasRed != null ? `${detail.serviciosBasicos.pctGasRed.toFixed(1)}%` : "—"}</p>
                  </div>
                </div>
                <CriteriaTable
                  criterios={detail.serviciosBasicos.criterios}
                  totalLabel="Total servicios básicos"
                  totalScore={detail.serviciosBasicos.scoreTotal}
                  type="normalized"
                />
                <p className="text-xs text-muted-foreground mt-2">Fuente: INDEC Censo 2022 + relevamiento municipal. {detail.serviciosBasicos.notas}</p>
              </DimensionCard>
            )}

            {detail.educacionSalud && (
              <DimensionCard title="Educación y salud" score={detail.educacionSalud.scoreTotal} color="green">
                <div className="grid gap-4 sm:grid-cols-3 mb-4">
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Escuelas / 10k hab.</p>
                    <p className="text-xl font-semibold">{detail.educacionSalud.escuelasPer10k != null ? detail.educacionSalud.escuelasPer10k.toFixed(1) : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Centros salud / 10k hab.</p>
                    <p className="text-xl font-semibold">{detail.educacionSalud.centrosSaludPer10k != null ? detail.educacionSalud.centrosSaludPer10k.toFixed(1) : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Camas hosp. / 10k hab.</p>
                    <p className="text-xl font-semibold">{detail.educacionSalud.camasPer10k != null ? detail.educacionSalud.camasPer10k.toFixed(1) : "—"}</p>
                  </div>
                </div>
                <CriteriaTable
                  criterios={detail.educacionSalud.criterios}
                  totalLabel="Total educación y salud"
                  totalScore={detail.educacionSalud.scoreTotal}
                  type="normalized"
                />
                <p className="text-xs text-muted-foreground mt-2">Fuente: Mapa Educativo Nacional, REFES, INDEC Censo 2022. {detail.educacionSalud.notas}</p>
              </DimensionCard>
            )}

            {detail.conectividad && (
              <DimensionCard title="Conectividad digital" score={detail.conectividad.scoreTotal} color="green">
                <div className="grid gap-4 sm:grid-cols-3 mb-4">
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Hogares con internet</p>
                    <p className="text-xl font-semibold">{detail.conectividad.pctInternet != null ? `${detail.conectividad.pctInternet.toFixed(1)}%` : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Banda ancha / 100 hab.</p>
                    <p className="text-xl font-semibold">{detail.conectividad.bandaAnchaPer100 != null ? detail.conectividad.bandaAnchaPer100.toFixed(1) : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Hogares con computadora</p>
                    <p className="text-xl font-semibold">{detail.conectividad.pctComputadora != null ? `${detail.conectividad.pctComputadora.toFixed(1)}%` : "—"}</p>
                  </div>
                </div>
                <CriteriaTable
                  criterios={detail.conectividad.criterios}
                  totalLabel="Total conectividad"
                  totalScore={detail.conectividad.scoreTotal}
                  type="normalized"
                />
                <p className="text-xs text-muted-foreground mt-2">Fuente: ENACOM, INDEC Censo 2022, auditoría portal municipal. {detail.conectividad.notas}</p>
              </DimensionCard>
            )}

            {detail.espacioPublico && (
              <DimensionCard title="Espacio público y ambiente" score={detail.espacioPublico.scoreTotal} color="green">
                <div className="grid gap-4 sm:grid-cols-3 mb-4">
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Espacio verde</p>
                    <p className="text-xl font-semibold">{detail.espacioPublico.espacioVerdePcapita != null ? `${detail.espacioPublico.espacioVerdePcapita.toFixed(1)} m²/hab` : "—"}</p>
                    <p className="text-xs text-muted-foreground">OMS rec: 10-15 m²/hab</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Arbolado urbano</p>
                    <p className="text-xl font-semibold">{detail.espacioPublico.coberturaArbolado != null ? `${detail.espacioPublico.coberturaArbolado.toFixed(1)}%` : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Separación residuos</p>
                    <p className={cn(
                      "text-lg font-semibold",
                      detail.espacioPublico.separacionResiduos != null
                        ? detail.espacioPublico.separacionResiduos >= 1.0 ? "text-score-high" : detail.espacioPublico.separacionResiduos >= 0.5 ? "text-score-mid" : "text-score-low"
                        : ""
                    )}>
                      {detail.espacioPublico.separacionResiduos != null
                        ? detail.espacioPublico.separacionResiduos >= 1.0 ? "Consolidado" : detail.espacioPublico.separacionResiduos >= 0.5 ? "Parcial" : "No tiene"
                        : "—"}
                    </p>
                  </div>
                </div>
                <CriteriaTable
                  criterios={detail.espacioPublico.criterios}
                  totalLabel="Total espacio público"
                  totalScore={detail.espacioPublico.scoreTotal}
                  type="normalized"
                />
                <p className="text-xs text-muted-foreground mt-2">Fuente: OPDS, Global Forest Watch, relevamiento municipal. {detail.espacioPublico.notas}</p>
              </DimensionCard>
            )}
          </div>

          {/* ═══ INFRAESTRUCTURA ═══ */}
          <div id="infra" className="scroll-target">
            <h2 className="text-lg font-semibold text-purple-700 mb-4">Infraestructura y Movilidad</h2>

            {detail.seguridadVial && (
              <DimensionCard title="Seguridad vial" score={detail.seguridadVial.scoreTotal} color="purple">
                <div className="grid gap-4 sm:grid-cols-3 mb-4">
                  <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Siniestros / 100k hab</p>
                    <p className={cn(
                      "text-xl font-semibold",
                      detail.seguridadVial.siniestrosPer100k != null
                        ? detail.seguridadVial.siniestrosPer100k <= 8 ? "text-score-high" : detail.seguridadVial.siniestrosPer100k <= 12 ? "text-score-mid" : "text-score-low"
                        : ""
                    )}>
                      {detail.seguridadVial.siniestrosPer100k != null ? detail.seguridadVial.siniestrosPer100k.toFixed(1) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
                    <p className="text-xs text-muted-foreground">km pavimento / km²</p>
                    <p className="text-xl font-semibold">{detail.seguridadVial.kmPavimentadoPerKm2 != null ? detail.seguridadVial.kmPavimentadoPerKm2.toFixed(2) : "—"}</p>
                  </div>
                  <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
                    <p className="text-xs text-muted-foreground">Ciclovías</p>
                    <p className="text-xl font-semibold">{detail.seguridadVial.kmCiclovias != null ? `${detail.seguridadVial.kmCiclovias.toFixed(1)} km` : "—"}</p>
                  </div>
                </div>
                <CriteriaTable
                  criterios={detail.seguridadVial.criterios}
                  totalLabel="Total seguridad vial"
                  totalScore={detail.seguridadVial.scoreTotal}
                  type="normalized"
                />
                <p className="text-xs text-muted-foreground mt-2">Fuente: ANSV, OSM, relevamiento municipal. {detail.seguridadVial.notas}</p>
              </DimensionCard>
            )}
          </div>

          {/* ═══ DATOS Y BRECHAS ═══ */}
          <div id="datos" className="scroll-target">
            <h2 className="text-lg font-semibold mb-4">Datos y Brechas</h2>

            {/* Accesibilidad */}
            <div className="mb-6">
              <h3 className="text-base font-medium mb-3">Accesibilidad del portal</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Clicks desde home</p>
                  <p className="text-xl font-semibold">{detail.accesibilidad.clicksDesdeHome ?? "—"}</p>
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
                    <a href={detail.accesibilidad.urlPortal} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">Visitar portal</a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tiene</p>
                  )}
                </div>
              </div>
            </div>

            {/* Brechas de datos */}
            {detail.dataGaps.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base font-medium mb-3">Brechas de datos detectadas ({detail.dataGaps.length})</h3>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Campo</th>
                        <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Año</th>
                        <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Trim.</th>
                        <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Municipal</th>
                        <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Provincial</th>
                        <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.dataGaps.map((gap, i) => (
                        <tr key={`${gap.campo}-${gap.anio}-${gap.trimestre}-${i}`} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 font-medium">{gap.campo}</td>
                          <td className="px-4 py-2 text-center text-muted-foreground">{gap.anio}</td>
                          <td className="px-4 py-2 text-center text-muted-foreground">Q{gap.trimestre}</td>
                          <td className="px-4 py-2 text-center">
                            {gap.existeEnMunicipal ? <span className="text-score-high">Sí</span> : <span className="text-score-low">No</span>}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {gap.existeEnProvincial ? <span className="text-score-high">Sí</span> : <span className="text-score-low">No</span>}
                          </td>
                          <td className="px-4 py-2 text-center text-xs text-muted-foreground">{gap.tipo}</td>
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
                <h3 className="text-base font-medium mb-3">Procedencia de datos fiscales</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-score-high">{detail.procedenciaSummary.totalConDato}</p>
                    <p className="text-xs text-muted-foreground">Campos con dato</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-score-low">{detail.procedenciaSummary.totalSinDato}</p>
                    <p className="text-xs text-muted-foreground">Campos sin dato</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground mb-1">Por capa</p>
                    {Object.entries(detail.procedenciaSummary.porCapa).map(([capa, count]) => (
                      <p key={capa} className="text-sm"><span className="font-medium">{capa}:</span> {count}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Auditoría realizada el {detail.fechaAuditoria}. Todos los scores
              son trazables a fuentes públicas.{" "}
              <Link href="/metodologia" className="text-primary hover:underline">
                Ver metodología
              </Link>
            </p>
          </div>
        </>;
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
