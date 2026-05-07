/**
 * Protected ingestion endpoints.
 *
 * These endpoints accept scraped/parsed data and write it to the database.
 * Protected by INGEST_API_KEY header.
 */

import { Hono } from "hono";
import { type DrizzleDb, invalidateScoreCache } from "@radar-municipal/core/db";
import {
  upsertDataPointsBatch,
  upsertCrawlDocuments,
  rafamToDataPoints,
  crawlToTransparenciaDataPoints,
  sibomToNormativaDataPoints,
  type DataPointInsert,
  type CrawlResultInput,
} from "@radar-municipal/ingestion";

const app = new Hono<{ Variables: { db: DrizzleDb } }>();

// Auth middleware
app.use("*", async (c, next) => {
  const apiKey = c.req.header("X-Ingest-API-Key");
  const expected = process.env.INGEST_API_KEY;

  if (!expected) {
    return c.json({ error: "Ingestion not configured (INGEST_API_KEY not set)" }, 503);
  }
  if (apiKey !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});

/**
 * POST /api/ingest/crawl-result
 * Accepts a crawl result and writes documents + boolean dataPoints.
 */
app.post("/crawl-result", async (c) => {
  const db = c.get("db");
  const body = await c.req.json<CrawlResultInput & { anio?: number }>();

  try {
    // Write documents
    await upsertCrawlDocuments(db, body);

    // Write transparency boolean dataPoints
    const anio = body.anio ?? new Date().getFullYear();
    const transparenciaPoints = crawlToTransparenciaDataPoints(body, anio);
    const result = await upsertDataPointsBatch(db, transparenciaPoints);

    return c.json({
      ok: true,
      documentsWritten: body.documentos.length,
      dataPoints: result.total,
      errors: result.errors,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * POST /api/ingest/rafam-parse
 * Accepts a RAFAM parse result and writes fiscal dataPoints.
 */
app.post("/rafam-parse", async (c) => {
  const db = c.get("db");
  const body = await c.req.json<{
    municipioId: string;
    sourceUrl: string;
    result: Parameters<typeof rafamToDataPoints>[0];
  }>();

  try {
    const points = rafamToDataPoints(body.result, body.municipioId, body.sourceUrl);
    const result = await upsertDataPointsBatch(db, points);

    return c.json({
      ok: true,
      dataPoints: result.total,
      errors: result.errors,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * POST /api/ingest/sibom
 * Accepts SIBOM scrape results and writes normativa dataPoints.
 */
app.post("/sibom", async (c) => {
  const db = c.get("db");
  const body = await c.req.json<{
    municipioId: string;
    anio?: number;
    normasEncontradas: number;
    tieneBoletinSibom: boolean;
    boletinesPublicados: number;
    ordenanzaFiscalVigente: boolean;
    ordenanzaFiscalUrl?: string | null;
  }>();

  try {
    const anio = body.anio ?? new Date().getFullYear();
    const points = sibomToNormativaDataPoints(body, anio);
    const result = await upsertDataPointsBatch(db, points);

    return c.json({
      ok: true,
      dataPoints: result.total,
      errors: result.errors,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * POST /api/ingest/bulk
 * Accepts a batch of raw DataPointInsert[] and writes them.
 */
app.post("/bulk", async (c) => {
  const db = c.get("db");
  const body = await c.req.json<{ points: DataPointInsert[] }>();

  try {
    const result = await upsertDataPointsBatch(db, body.points);
    return c.json({
      ok: true,
      dataPoints: result.total,
      errors: result.errors,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * POST /api/ingest/invalidate-cache
 * Invalidates score cache for a municipality or globally.
 */
app.post("/invalidate-cache", async (c) => {
  const db = c.get("db");
  const body = await c.req.json<{ municipioId?: string; anio?: number }>();

  try {
    await invalidateScoreCache(db, body.municipioId, body.anio);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

export default app;
