import { Hono } from "hono";
import { getAllMunicipios, getMunicipioById } from "../services/scoring-data";

export const municipiosRouter = new Hono();

municipiosRouter.get("/municipios", (c) => {
  const piloto = c.req.query("piloto") === "true" ? true : undefined;
  const q = c.req.query("q") || undefined;
  const municipios = getAllMunicipios({ piloto, q });
  return c.json({ total: municipios.length, data: municipios });
});

municipiosRouter.get("/municipios/:id", (c) => {
  const id = c.req.param("id");
  const municipio = getMunicipioById(id);
  if (!municipio) {
    return c.json({ error: "Municipio no encontrado" }, 404);
  }
  return c.json(municipio);
});
