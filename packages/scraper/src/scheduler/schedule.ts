/**
 * Scheduler: orquesta crawling periódico de municipios.
 *
 * En producción esto se ejecutaría como cron job (Railway, Fly.io, etc).
 * Aquí implementamos la lógica de scheduling: qué municipios crawlear,
 * cuándo y cómo manejar los resultados.
 */

import { MUNICIPIOS_PILOTO, type PilotAuditData } from "@radar-municipal/core";
import { crawlTransparencyPortal } from "../crawlers/transparency-crawler";
import { scrapeSibom } from "../crawlers/sibom-scraper";
import { normalizeToPilotAudit, mergeAudits } from "../normalizers/audit-normalizer";
import type { CrawlTarget, CrawlResult, SibomResult } from "../types";

export interface ScheduleConfig {
  /** Municipios a crawlear (default: todos los piloto) */
  municipioIds?: string[];
  /** Intervalo entre crawls por municipio en ms (default: 3000) */
  delayBetweenMs?: number;
  /** Si debe hacer merge con datos existentes */
  existingAudits?: PilotAuditData;
  /** Callback por municipio completado */
  onProgress?: (result: ScheduleProgress) => void;
  /** Headless mode (default: true) */
  headless?: boolean;
}

export interface ScheduleProgress {
  municipioId: string;
  nombre: string;
  index: number;
  total: number;
  status: "success" | "error";
  score?: number;
  error?: string;
  durationMs: number;
}

export interface ScheduleResult {
  audits: PilotAuditData;
  crawlResults: CrawlResult[];
  sibomResults: SibomResult[];
  errors: { municipioId: string; error: string }[];
  totalDurationMs: number;
}

/**
 * Ejecuta un ciclo completo de crawling para los municipios configurados.
 */
export async function runScheduledCrawl(
  config: ScheduleConfig = {}
): Promise<ScheduleResult> {
  const {
    delayBetweenMs = 3000,
    existingAudits,
    onProgress,
    headless = true,
  } = config;

  const startTime = Date.now();
  const existingMap = existingAudits
    ? new Map(existingAudits.map((a) => [a.municipioId, a]))
    : null;

  // Filtrar municipios
  let municipios = MUNICIPIOS_PILOTO.filter((m) => m.urlOficial);
  if (config.municipioIds?.length) {
    const ids = new Set(config.municipioIds);
    municipios = municipios.filter((m) => ids.has(m.id));
  }

  const result: ScheduleResult = {
    audits: [],
    crawlResults: [],
    sibomResults: [],
    errors: [],
    totalDurationMs: 0,
  };

  for (let i = 0; i < municipios.length; i++) {
    const m = municipios[i];
    const crawlStart = Date.now();

    try {
      const target: CrawlTarget = {
        municipioId: m.id,
        nombre: m.nombre,
        urlOficial: m.urlOficial!,
      };

      // Crawl portal
      const crawlResult = await crawlTransparencyPortal(target, { headless });
      result.crawlResults.push(crawlResult);

      // Scrape SIBOM
      const sibomResult = await scrapeSibom(m.id, m.nombre);
      result.sibomResults.push(sibomResult);

      // Normalizar
      let audit = normalizeToPilotAudit(crawlResult, sibomResult);

      // Merge si hay datos existentes
      const existing = existingMap?.get(m.id);
      if (existing) {
        audit = mergeAudits(existing, audit);
      }

      result.audits.push(audit);

      onProgress?.({
        municipioId: m.id,
        nombre: m.nombre,
        index: i,
        total: municipios.length,
        status: "success",
        durationMs: Date.now() - crawlStart,
      });
    } catch (err) {
      const error = (err as Error).message;
      result.errors.push({ municipioId: m.id, error });

      onProgress?.({
        municipioId: m.id,
        nombre: m.nombre,
        index: i,
        total: municipios.length,
        status: "error",
        error,
        durationMs: Date.now() - crawlStart,
      });
    }

    // Rate limiting
    if (i < municipios.length - 1) {
      await new Promise((r) => setTimeout(r, delayBetweenMs));
    }
  }

  result.totalDurationMs = Date.now() - startTime;
  return result;
}
