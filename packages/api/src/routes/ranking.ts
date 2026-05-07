import { Hono } from "hono";
import { getRanking } from "../services/scoring-data";
import { ScoringCategory } from "@radar-municipal/core";

export const rankingRouter = new Hono();

const VALID_CATEGORIES = new Set(Object.values(ScoringCategory));

rankingRouter.get("/ranking", (c) => {
  const categoriaParam = c.req.query("categoria");
  let categoria: ScoringCategory | undefined;

  if (categoriaParam) {
    if (!VALID_CATEGORIES.has(categoriaParam as ScoringCategory)) {
      return c.json(
        {
          error: "Categoría inválida",
          valid: Object.values(ScoringCategory),
        },
        400
      );
    }
    categoria = categoriaParam as ScoringCategory;
  }

  const ranking = getRanking({ categoria });
  return c.json({ total: ranking.length, data: ranking });
});
