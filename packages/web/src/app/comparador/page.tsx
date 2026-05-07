"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MUNICIPIOS_PILOTO } from "@radar-municipal/core";
import { getMunicipioDetail, type MunicipioDetail } from "@/lib/scoring-data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { RadarChart, type RadarSeries } from "@/components/RadarChart";
import { ShareButton } from "@/components/ShareButton";
import { formatNumber, cn } from "@/lib/utils";

const RADAR_COLORS = ["#3b82f6", "#f59e0b", "#10b981"];

function buildRadarDimensions(d: MunicipioDetail) {
  return [
    { label: "Transparencia", shortLabel: "Transp.", score: d.scoreTransparencia },
    { label: "Normativa", shortLabel: "Norm.", score: d.scoreNormativa ?? 0 },
    { label: "Participación", shortLabel: "Partic.", score: d.scoreParticipacion ?? 0 },
    { label: "Fiscal", score: d.scoreFiscal ?? 0 },
    { label: "Gasto público", shortLabel: "Gasto", score: d.scoreGastoFuncion ?? 0 },
    { label: "Economía local", shortLabel: "Econ.", score: d.scoreEconomiaLocal ?? 0 },
    { label: "Presión impositiva", shortLabel: "Pres.Imp.", score: d.scorePresionImpositiva ?? 0 },
    { label: "Servicios básicos", shortLabel: "Serv.", score: d.scoreServiciosBasicos ?? 0 },
    { label: "Educación y salud", shortLabel: "Educ.", score: d.scoreEducacionSalud ?? 0 },
    { label: "Conectividad", shortLabel: "Conect.", score: d.scoreConectividad ?? 0 },
    { label: "Espacio público", shortLabel: "Esp.Púb.", score: d.scoreEspacioPublico ?? 0 },
    { label: "Seguridad vial", shortLabel: "Seg.Vial", score: d.scoreSeguridadVial ?? 0 },
  ];
}

function ScoreCell({ a, b }: { a: number; b: number }) {
  return (
    <>
      <td className="px-4 py-3 text-center">
        <ScoreBadge score={a} size="sm" />
      </td>
      <td className="px-4 py-3 text-center">
        <ScoreBadge score={b} size="sm" />
      </td>
    </>
  );
}

export default function ComparadorPage() {
  const searchParams = useSearchParams();
  const [idA, setIdA] = useState<string>(searchParams.get("a") ?? "");
  const [idB, setIdB] = useState<string>(searchParams.get("b") ?? "");
  const [idC, setIdC] = useState<string>(searchParams.get("c") ?? "");

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (idA) params.set("a", idA);
    if (idB) params.set("b", idB);
    if (idC) params.set("c", idC);
    const newUrl = params.toString() ? `?${params.toString()}` : "/comparador";
    window.history.replaceState(null, "", newUrl);
  }, [idA, idB, idC]);

  const detailA = idA ? getMunicipioDetail(idA) : null;
  const detailB = idB ? getMunicipioDetail(idB) : null;
  const detailC = idC ? getMunicipioDetail(idC) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comparador</h1>
          <p className="mt-2 text-muted-foreground">
            Seleccioná dos municipios piloto para compararlos lado a lado.
          </p>
        </div>
        <ShareButton title="Comparador de Municipios - Radar Municipal" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div>
          <label className="block text-sm font-medium mb-1">Municipio A</label>
          <select
            value={idA}
            onChange={(e) => setIdA(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {MUNICIPIOS_PILOTO.map((m) => (
              <option key={m.id} value={m.id} disabled={m.id === idB || m.id === idC}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Municipio B</label>
          <select
            value={idB}
            onChange={(e) => setIdB(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {MUNICIPIOS_PILOTO.map((m) => (
              <option key={m.id} value={m.id} disabled={m.id === idA || m.id === idC}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Municipio C <span className="text-muted-foreground font-normal">(opcional)</span></label>
          <select
            value={idC}
            onChange={(e) => setIdC(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">Ninguno</option>
            {MUNICIPIOS_PILOTO.map((m) => (
              <option key={m.id} value={m.id} disabled={m.id === idA || m.id === idB}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {detailA && detailB ? (
        <div className="space-y-8">
          {/* Radar superpuesto */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-center mb-2">Comparación multidimensional</p>
            <RadarChart
              height={380}
              series={[
                {
                  name: detailA.municipio.nombre,
                  color: RADAR_COLORS[0],
                  fillOpacity: 0.1,
                  dimensions: buildRadarDimensions(detailA),
                },
                {
                  name: detailB.municipio.nombre,
                  color: RADAR_COLORS[1],
                  fillOpacity: 0.1,
                  dimensions: buildRadarDimensions(detailB),
                },
                ...(detailC
                  ? [
                      {
                        name: detailC.municipio.nombre,
                        color: RADAR_COLORS[2],
                        fillOpacity: 0.1,
                        dimensions: buildRadarDimensions(detailC),
                      },
                    ]
                  : []),
              ]}
            />
          </div>

          {/* Datos generales + scores */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Indicador
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-primary">
                    {detailA.municipio.nombre}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-primary">
                    {detailB.municipio.nombre}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground">Población</td>
                  <td className="px-4 py-3 text-center">{formatNumber(detailA.municipio.poblacion)}</td>
                  <td className="px-4 py-3 text-center">{formatNumber(detailB.municipio.poblacion)}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground">Superficie</td>
                  <td className="px-4 py-3 text-center">{formatNumber(detailA.municipio.superficieKm2)} km²</td>
                  <td className="px-4 py-3 text-center">{formatNumber(detailB.municipio.superficieKm2)} km²</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground">Densidad</td>
                  <td className="px-4 py-3 text-center">{detailA.municipio.densidad?.toFixed(1) ?? "—"} hab/km²</td>
                  <td className="px-4 py-3 text-center">{detailB.municipio.densidad?.toFixed(1) ?? "—"} hab/km²</td>
                </tr>
                <tr className="border-b border-border bg-muted/30">
                  <td className="px-4 py-3 font-medium">Score transparencia</td>
                  <ScoreCell a={detailA.scoreTransparencia} b={detailB.scoreTransparencia} />
                </tr>
                <tr className="border-b border-border bg-muted/30">
                  <td className="px-4 py-3 font-medium">Score fiscal</td>
                  <td className="px-4 py-3 text-center">
                    {detailA.scoreFiscal != null ? (
                      <ScoreBadge score={detailA.scoreFiscal} size="sm" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin datos</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {detailB.scoreFiscal != null ? (
                      <ScoreBadge score={detailB.scoreFiscal} size="sm" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin datos</span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-border bg-muted/30">
                  <td className="px-4 py-3 font-medium">Score normativa</td>
                  <td className="px-4 py-3 text-center">
                    {detailA.scoreNormativa != null ? (
                      <ScoreBadge score={detailA.scoreNormativa} size="sm" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin datos</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {detailB.scoreNormativa != null ? (
                      <ScoreBadge score={detailB.scoreNormativa} size="sm" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin datos</span>
                    )}
                  </td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="px-4 py-3 font-semibold">Score total</td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={detailA.scoreTotal} size="lg" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={detailB.scoreTotal} size="lg" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Desglose de criterios */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Desglose por criterio</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Criterio</th>
                    <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-16">Peso</th>
                    <th className="px-4 py-2 text-center font-semibold text-primary">
                      {detailA.municipio.nombre}
                    </th>
                    <th className="px-4 py-2 text-center font-semibold text-primary">
                      {detailB.municipio.nombre}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detailA.breakdown.map((rowA, i) => {
                    const rowB = detailB.breakdown[i];
                    return (
                      <tr key={rowA.criterio} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 font-medium">{rowA.descripcion}</td>
                        <td className="px-4 py-2 text-center text-muted-foreground">
                          {(rowA.peso * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={cn(
                              "font-medium",
                              rowA.valor >= 0.7
                                ? "text-score-high"
                                : rowA.valor >= 0.4
                                  ? "text-score-mid"
                                  : "text-score-low"
                            )}
                          >
                            {(rowA.valor * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {rowB ? (
                            <span
                              className={cn(
                                "font-medium",
                                rowB.valor >= 0.7
                                  ? "text-score-high"
                                  : rowB.valor >= 0.4
                                    ? "text-score-mid"
                                    : "text-score-low"
                              )}
                            >
                              {(rowB.valor * 100).toFixed(0)}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Documentos fiscales */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Documentos fiscales</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Documento</th>
                    <th className="px-4 py-2 text-center font-semibold text-primary">
                      {detailA.municipio.nombre}
                    </th>
                    <th className="px-4 py-2 text-center font-semibold text-primary">
                      {detailB.municipio.nombre}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detailA.documentos.map((docA) => {
                    const docB = detailB.documentos.find(
                      (d) => d.categoria === docA.categoria
                    );
                    return (
                      <tr key={docA.categoria} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 font-medium">{docA.categoriaLabel}</td>
                        <td className="px-4 py-2 text-center">
                          {docA.publicado ? (
                            <span className="text-score-high font-medium">
                              {docA.formato ?? "Sí"}
                            </span>
                          ) : (
                            <span className="text-score-low font-medium">No</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {docB?.publicado ? (
                            <span className="text-score-high font-medium">
                              {docB.formato ?? "Sí"}
                            </span>
                          ) : (
                            <span className="text-score-low font-medium">No</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Accesibilidad */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Accesibilidad</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Indicador</th>
                    <th className="px-4 py-2 text-center font-semibold text-primary">
                      {detailA.municipio.nombre}
                    </th>
                    <th className="px-4 py-2 text-center font-semibold text-primary">
                      {detailB.municipio.nombre}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2 text-muted-foreground">Clicks desde home</td>
                    <td className="px-4 py-2 text-center font-medium">
                      {detailA.accesibilidad.clicksDesdeHome ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-center font-medium">
                      {detailB.accesibilidad.clicksDesdeHome ?? "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2 text-muted-foreground">Menú transparencia</td>
                    <td className="px-4 py-2 text-center">
                      {detailA.accesibilidad.menuTransparenciaVisible ? (
                        <span className="text-score-high font-medium">Visible</span>
                      ) : (
                        <span className="text-score-low font-medium">No visible</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {detailB.accesibilidad.menuTransparenciaVisible ? (
                        <span className="text-score-high font-medium">Visible</span>
                      ) : (
                        <span className="text-score-low font-medium">No visible</span>
                      )}
                    </td>
                  </tr>
                  <tr className="last:border-0">
                    <td className="px-4 py-2 text-muted-foreground">Portal transparencia</td>
                    <td className="px-4 py-2 text-center">
                      {detailA.accesibilidad.urlPortal ? (
                        <span className="text-score-high text-xs">Tiene</span>
                      ) : (
                        <span className="text-score-low text-xs">No tiene</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {detailB.accesibilidad.urlPortal ? (
                        <span className="text-score-high text-xs">Tiene</span>
                      ) : (
                        <span className="text-score-low text-xs">No tiene</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Indicadores fiscales */}
          {(detailA.fiscal || detailB.fiscal) && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Indicadores fiscales</h2>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                        Indicador
                      </th>
                      <th className="px-4 py-2 text-center font-semibold text-primary">
                        {detailA.municipio.nombre}
                      </th>
                      <th className="px-4 py-2 text-center font-semibold text-primary">
                        {detailB.municipio.nombre}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="px-4 py-2 text-muted-foreground">Gasto per cápita</td>
                      <td className="px-4 py-2 text-center font-medium">
                        {detailA.fiscal?.gastoPcapita != null
                          ? `$${Math.round(detailA.fiscal.gastoPcapita).toLocaleString("es-AR")}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-center font-medium">
                        {detailB.fiscal?.gastoPcapita != null
                          ? `$${Math.round(detailB.fiscal.gastoPcapita).toLocaleString("es-AR")}`
                          : "—"}
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-4 py-2 text-muted-foreground">Deuda per cápita</td>
                      <td className="px-4 py-2 text-center font-medium">
                        {detailA.fiscal?.deudaPcapita != null
                          ? `$${Math.round(detailA.fiscal.deudaPcapita).toLocaleString("es-AR")}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-center font-medium">
                        {detailB.fiscal?.deudaPcapita != null
                          ? `$${Math.round(detailB.fiscal.deudaPcapita).toLocaleString("es-AR")}`
                          : "—"}
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-4 py-2 text-muted-foreground">% Gasto en personal</td>
                      <td className="px-4 py-2 text-center font-medium">
                        {detailA.fiscal?.pctPersonal != null
                          ? `${detailA.fiscal.pctPersonal.toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-center font-medium">
                        {detailB.fiscal?.pctPersonal != null
                          ? `${detailB.fiscal.pctPersonal.toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-4 py-2 text-muted-foreground">% Gasto de capital</td>
                      <td className="px-4 py-2 text-center font-medium">
                        {detailA.fiscal?.pctCapital != null
                          ? `${detailA.fiscal.pctCapital.toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-center font-medium">
                        {detailB.fiscal?.pctCapital != null
                          ? `${detailB.fiscal.pctCapital.toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-4 py-2 text-muted-foreground">Resultado per cápita</td>
                      <td className="px-4 py-2 text-center font-medium">
                        <span className={cn(
                          detailA.fiscal?.resultadoPcapita != null
                            ? detailA.fiscal.resultadoPcapita >= 0 ? "text-score-high" : "text-score-low"
                            : ""
                        )}>
                          {detailA.fiscal?.resultadoPcapita != null
                            ? `$${Math.round(detailA.fiscal.resultadoPcapita).toLocaleString("es-AR")}`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center font-medium">
                        <span className={cn(
                          detailB.fiscal?.resultadoPcapita != null
                            ? detailB.fiscal.resultadoPcapita >= 0 ? "text-score-high" : "text-score-low"
                            : ""
                        )}>
                          {detailB.fiscal?.resultadoPcapita != null
                            ? `$${Math.round(detailB.fiscal.resultadoPcapita).toLocaleString("es-AR")}`
                            : "—"}
                        </span>
                      </td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="px-4 py-2 font-semibold">Score fiscal</td>
                      <td className="px-4 py-2 text-center">
                        {detailA.fiscal ? (
                          <ScoreBadge score={detailA.fiscal.scoreTotal} size="sm" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin datos</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {detailB.fiscal ? (
                          <ScoreBadge score={detailB.fiscal.scoreTotal} size="sm" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin datos</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Scores calculados a partir de auditoría manual y datos fiscales curados.{" "}
            <Link href="/metodologia" className="text-primary hover:underline">
              Ver metodología
            </Link>
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <p className="text-muted-foreground">
            Seleccioná dos municipios para ver la comparación.
          </p>
        </div>
      )}
    </div>
  );
}
