import { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimiter } from "./middleware/rate-limit";
import { cacheControl } from "./middleware/cache";
import { municipiosRouter } from "./routes/municipios";
import { rankingRouter } from "./routes/ranking";
import { scoresRouter } from "./routes/scores";
import { exportsRouter } from "./routes/exports";
import { docsRouter } from "./routes/docs";
import { dataPointsRouter } from "./routes/data-points";
import ingestRouter from "./routes/ingest";

const app = new Hono();

// CORS: blanket allow-all is intentional — Radar Municipal is an open data
// project (CC BY 4.0) and the API is designed to be consumed by any origin.
app.use("/*", cors());

// Global rate limit: 100 requests per minute per IP
app.use("*", rateLimiter({ windowMs: 60_000, max: 100 }));

// Stricter rate limit for export endpoints (heavier responses)
app.use("/api/export/*", rateLimiter({ windowMs: 60_000, max: 10 }));

// Cache headers for read-only endpoints (1 hour)
const ONE_HOUR = 3600;
app.use("/api/ranking", cacheControl(ONE_HOUR));
app.use("/api/municipios", cacheControl(ONE_HOUR));
app.use("/api/municipios/:id/scores", cacheControl(ONE_HOUR));
app.use("/api/export/*", cacheControl(ONE_HOUR));

app.get("/", (c) =>
  c.json({
    name: "Radar Municipal API",
    version: "1.0.0",
    description:
      "API pública de Radar Municipal — datos de transparencia, fiscal y normativa de los 135 municipios de la Provincia de Buenos Aires.",
    endpoints: [
      "/api/municipios",
      "/api/municipios/:id",
      "/api/municipios/:id/scores",
      "/api/ranking",
      "/api/export/ranking.json",
      "/api/export/ranking.csv",
      "/api/export/municipios.json",
      "/api/export/municipios.csv",
      "/api/docs",
      "/api/docs/explorer",
      "/api/municipios/:id/data-gaps",
      "/api/municipios/:id/procedencia",
    ],
    licencia: "CC BY 4.0",
  })
);

app.route("/api", municipiosRouter);
app.route("/api", rankingRouter);
app.route("/api", scoresRouter);
app.route("/api", exportsRouter);
app.route("/api", docsRouter);
app.route("/api", dataPointsRouter);
app.route("/api/ingest", ingestRouter);

export { app };
