/**
 * Escritor de documentos y fuentes detectados por el crawler.
 *
 * Convierte CrawlResult (del scraper) en registros de `sources` y `documents`.
 */

import { eq, and } from "drizzle-orm";
import { sources, documents, invalidateScoreCache, type DrizzleDb } from "@radar-municipal/core/db";

/** Simplified crawl document for writing to DB */
export interface CrawlDocumentInput {
  categoria: string;
  url: string | null;
  formato: string;
  anio: number;
  trimestre?: number | null;
  esParseable: boolean;
  fechaPublicacion?: Date | null;
  fechaCorte?: Date | null;
}

/** Simplified crawl result for writing to DB */
export interface CrawlResultInput {
  municipioId: string;
  portalUrl: string;
  portalAccesible: boolean;
  documentos: CrawlDocumentInput[];
}

/**
 * Upsert source + documents from a crawl result.
 */
export async function upsertCrawlDocuments(
  db: DrizzleDb,
  result: CrawlResultInput
): Promise<void> {
  // Upsert source (portal)
  const existingSources = await db
    .select()
    .from(sources)
    .where(
      and(
        eq(sources.municipioId, result.municipioId),
        eq(sources.tipo, "PORTAL_TRANSPARENCIA")
      )
    )
    .limit(1);

  let sourceId: number;

  if (existingSources.length > 0) {
    sourceId = existingSources[0].id;
    await db
      .update(sources)
      .set({
        url: result.portalUrl,
        estado: result.portalAccesible ? "ACTIVO" : "CAIDO",
        ultimoAcceso: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sources.id, sourceId));
  } else {
    const inserted = await db
      .insert(sources)
      .values({
        municipioId: result.municipioId,
        tipo: "PORTAL_TRANSPARENCIA",
        capa: "MUNICIPAL",
        url: result.portalUrl,
        estado: result.portalAccesible ? "ACTIVO" : "CAIDO",
        ultimoAcceso: new Date(),
      })
      .returning({ id: sources.id });

    sourceId = inserted[0].id;
  }

  // Upsert documents
  for (const doc of result.documentos) {
    // Check if document already exists for this municipio+category+year
    const existing = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.municipioId, result.municipioId),
          eq(documents.categoria, doc.categoria),
          eq(documents.anio, doc.anio)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(documents)
        .set({
          sourceId,
          url: doc.url,
          formato: doc.formato,
          trimestre: doc.trimestre ?? null,
          esParseable: doc.esParseable,
          fechaPublicacion: doc.fechaPublicacion ?? null,
          fechaCorte: doc.fechaCorte ?? null,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, existing[0].id));
    } else {
      await db.insert(documents).values({
        municipioId: result.municipioId,
        sourceId,
        categoria: doc.categoria,
        anio: doc.anio,
        trimestre: doc.trimestre ?? null,
        formato: doc.formato,
        url: doc.url,
        esParseable: doc.esParseable,
        fechaPublicacion: doc.fechaPublicacion ?? null,
        fechaCorte: doc.fechaCorte ?? null,
      });
    }
  }

  // Invalidate score cache
  await invalidateScoreCache(db, result.municipioId);
}
