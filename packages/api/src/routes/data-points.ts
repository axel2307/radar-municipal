import { Hono } from "hono";
import {
  getMunicipioById,
  getMunicipioDataGaps,
  getMunicipioFiscalProvenance,
} from "../services/scoring-data";

export const dataPointsRouter = new Hono();

/**
 * GET /municipios/:id/data-gaps
 * Devuelve las brechas de datos detectadas para un municipio.
 */
dataPointsRouter.get("/municipios/:id/data-gaps", (c) => {
  const id = c.req.param("id");
  const municipio = getMunicipioById(id);
  if (!municipio) {
    return c.json({ error: "Municipio no encontrado" }, 404);
  }

  const gaps = getMunicipioDataGaps(id);

  // Filtro opcional por tipo
  const tipo = c.req.query("tipo");
  const filtered = tipo
    ? gaps.filter((g) => g.tipo === tipo)
    : gaps;

  return c.json({
    municipioId: id,
    nombre: municipio.nombre,
    total: filtered.length,
    data: filtered,
  });
});

/**
 * GET /municipios/:id/procedencia
 * Devuelve la procedencia de cada campo fiscal primario.
 */
dataPointsRouter.get("/municipios/:id/procedencia", (c) => {
  const id = c.req.param("id");
  const municipio = getMunicipioById(id);
  if (!municipio) {
    return c.json({ error: "Municipio no encontrado" }, 404);
  }

  const provenance = getMunicipioFiscalProvenance(id);
  if (!provenance) {
    return c.json({
      municipioId: id,
      nombre: municipio.nombre,
      mensaje: "Sin datos fiscales disponibles",
      data: [],
    });
  }

  // Resumen por capa
  const porCapa: Record<string, number> = {};
  for (const p of provenance) {
    if (p.capa) {
      porCapa[p.capa] = (porCapa[p.capa] ?? 0) + 1;
    }
  }

  return c.json({
    municipioId: id,
    nombre: municipio.nombre,
    resumen: {
      totalCampos: provenance.length,
      porCapa,
    },
    data: provenance,
  });
});
