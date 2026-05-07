/**
 * Endpoints de exportación de datos.
 * Permiten descargar ranking, scores y datos fiscales en CSV y JSON.
 */

import { Hono } from "hono";
import { getRanking, getMunicipioScores, getMunicipioFiscalScore, getAllMunicipios } from "../services/scoring-data";

export const exportsRouter = new Hono();

// ─────────────────────────────────────────
// JSON exports
// ─────────────────────────────────────────

/** Exportar ranking completo en JSON */
exportsRouter.get("/export/ranking.json", (c) => {
  const ranking = getRanking();
  c.header("Content-Disposition", 'attachment; filename="radar-municipal-ranking.json"');
  c.header("Content-Type", "application/json; charset=utf-8");
  return c.json({
    meta: {
      generado: new Date().toISOString(),
      fuente: "Radar Municipal (radarmunicipal.ar)",
      licencia: "CC BY 4.0",
      descripcion: "Ranking de transparencia, fiscal y normativa de municipios piloto de la Provincia de Buenos Aires",
    },
    data: ranking,
  });
});

/** Exportar todos los municipios en JSON */
exportsRouter.get("/export/municipios.json", (c) => {
  const municipios = getAllMunicipios();
  c.header("Content-Disposition", 'attachment; filename="radar-municipal-municipios.json"');
  c.header("Content-Type", "application/json; charset=utf-8");
  return c.json({
    meta: {
      generado: new Date().toISOString(),
      fuente: "Radar Municipal",
      total: municipios.length,
    },
    data: municipios,
  });
});

// ─────────────────────────────────────────
// CSV exports
// ─────────────────────────────────────────

/** Exportar ranking completo en CSV */
exportsRouter.get("/export/ranking.csv", (c) => {
  const ranking = getRanking();

  const headers = [
    "posicion",
    "municipio_id",
    "nombre",
    "partido",
    "poblacion",
    "superficie_km2",
    "score_transparencia",
    "score_fiscal",
    "score_normativa",
    "score_total",
  ];

  const rows = ranking.map((r) => [
    r.posicion,
    r.municipioId,
    `"${r.nombre}"`,
    `"${r.partido}"`,
    r.poblacion ?? "",
    r.superficieKm2 ?? "",
    r.scoreTransparencia,
    r.scoreFiscal ?? "",
    r.scoreNormativa ?? "",
    r.scoreTotal,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  c.header("Content-Disposition", 'attachment; filename="radar-municipal-ranking.csv"');
  c.header("Content-Type", "text/csv; charset=utf-8");
  return c.text(csv);
});

/** Exportar municipios completos en CSV */
exportsRouter.get("/export/municipios.csv", (c) => {
  const municipios = getAllMunicipios();

  const headers = [
    "id",
    "nombre",
    "partido",
    "region",
    "poblacion",
    "superficie_km2",
    "densidad",
    "url_oficial",
    "es_piloto",
  ];

  const rows = municipios.map((m) => [
    m.id,
    `"${m.nombre}"`,
    `"${m.partido}"`,
    `"${m.region}"`,
    m.poblacion ?? "",
    m.superficieKm2 ?? "",
    m.densidad?.toFixed(1) ?? "",
    m.urlOficial ? `"${m.urlOficial}"` : "",
    m.esPiloto ? "true" : "false",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  c.header("Content-Disposition", 'attachment; filename="radar-municipal-municipios.csv"');
  c.header("Content-Type", "text/csv; charset=utf-8");
  return c.text(csv);
});
