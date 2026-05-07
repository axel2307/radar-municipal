/**
 * Scraper de SIBOM (Sistema de Boletines Oficiales Municipales)
 * URL: sibom.slyt.gba.gob.ar
 *
 * SIBOM publica boletines oficiales por municipio.
 * Cada boletín puede contener ordenanzas, decretos, resoluciones, etc.
 *
 * Estructura actual del sitio (2026):
 *   /cities/{id}          → lista de boletines del municipio (paginado)
 *   /bulletins/{id}       → boletín individual (contiene las normas)
 *   /cities               → listado de todos los municipios
 *
 * Este scraper:
 *   1. Accede a /cities/{sibomId} para listar boletines recientes
 *   2. Navega boletines individuales buscando normas (ordenanzas, decretos, etc.)
 *   3. Busca específicamente ordenanzas fiscales/tributarias
 */

import * as cheerio from "cheerio";
import type { SibomResult, SibomNorma } from "../types";
import { getSibomCityId } from "../constants/sibom-ids";

const SIBOM_BASE_URL = "https://sibom.slyt.gba.gob.ar";

type NormaTipo = SibomNorma["tipo"];

/**
 * Scrapea normas de SIBOM para un municipio dado.
 */
export async function scrapeSibom(
  municipioId: string,
  municipioNombre: string
): Promise<SibomResult> {
  const result: SibomResult = {
    municipioId,
    nombre: municipioNombre,
    fechaScrape: new Date().toISOString(),
    normasEncontradas: 0,
    normas: [],
    ordenanzaFiscalVigente: null,
    error: null,
  };

  const sibomId = getSibomCityId(municipioId);
  if (!sibomId) {
    result.error = `No se encontró ID de SIBOM para municipio ${municipioId} (${municipioNombre})`;
    return result;
  }

  try {
    // 1. Obtener los boletines más recientes (primeras 3 páginas)
    const bulletinIds = await fetchBulletinIds(sibomId, 3);

    if (bulletinIds.length === 0) {
      result.error = "No se encontraron boletines publicados";
      return result;
    }

    // 2. Scrapear cada boletín buscando normas (últimos 10 boletines)
    const boletinesToScan = bulletinIds.slice(0, 10);
    for (const bulletinId of boletinesToScan) {
      try {
        const normas = await scrapeBulletin(bulletinId, municipioId);
        result.normas.push(...normas);

        // Rate limiting
        await sleep(500);
      } catch {
        // Continuar con siguiente boletín
      }
    }

    result.normasEncontradas = result.normas.length;

    // 3. Identificar ordenanza fiscal vigente (la más reciente)
    const ordenanzasFiscales = result.normas.filter(
      (n) =>
        n.tipo === "ORDENANZA" &&
        (isFiscalKeyword(n.titulo) || isFiscalKeyword(n.numero))
    );

    if (ordenanzasFiscales.length > 0) {
      // Tomar la más reciente por año
      ordenanzasFiscales.sort((a, b) => b.anio - a.anio);
      result.ordenanzaFiscalVigente = ordenanzasFiscales[0];
    }
  } catch (err) {
    result.error = `Error scrapeando SIBOM: ${(err as Error).message}`;
  }

  return result;
}

// ─────────────────────────────────────────
// Funciones de scraping
// ─────────────────────────────────────────

/**
 * Obtiene los IDs de boletines de un municipio desde /cities/{id}.
 * Recorre múltiples páginas si se solicita.
 */
async function fetchBulletinIds(
  sibomCityId: number,
  maxPages: number
): Promise<number[]> {
  const bulletinIds: number[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `${SIBOM_BASE_URL}/cities/${sibomCityId}?page=${page}`;
      const response = await fetchWithRetry(url);
      if (!response.ok) break;

      const html = await response.text();
      const $ = cheerio.load(html);

      // Los boletines se listan con <form action="/bulletins/{id}"> y links <a href>
      let foundOnPage = 0;

      // Buscar en forms (estructura principal de SIBOM)
      $("form[action]").each((_, el) => {
        const action = $(el).attr("action") ?? "";
        const match = action.match(/\/bulletins\/(\d+)/);
        if (match) {
          const id = parseInt(match[1]);
          if (!bulletinIds.includes(id)) {
            bulletinIds.push(id);
            foundOnPage++;
          }
        }
      });

      // Fallback: buscar en links <a>
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const match = href.match(/\/bulletins\/(\d+)/);
        if (match) {
          const id = parseInt(match[1]);
          if (!bulletinIds.includes(id)) {
            bulletinIds.push(id);
            foundOnPage++;
          }
        }
      });

      // Si no encontramos boletines en esta página, parar
      if (foundOnPage === 0) break;

      // Rate limiting entre páginas
      if (page < maxPages) await sleep(300);
    } catch {
      break;
    }
  }

  return bulletinIds;
}

/**
 * Scrapea un boletín individual buscando normas.
 * URL: /bulletins/{id}
 */
async function scrapeBulletin(
  bulletinId: number,
  municipioId: string
): Promise<SibomNorma[]> {
  const normas: SibomNorma[] = [];
  const url = `${SIBOM_BASE_URL}/bulletins/${bulletinId}`;

  const response = await fetchWithRetry(url);
  if (!response.ok) return normas;

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extraer fecha del boletín
  const fechaBoletin = extractFechaFromPage($);
  const anioBoletin = fechaBoletin
    ? parseInt(fechaBoletin.split("-")[0])
    : new Date().getFullYear();

  // Buscar normas en el contenido del boletín
  // SIBOM típicamente estructura las normas en secciones o tablas
  const pageText = $("body").text();

  // Buscar en secciones/divs/artículos
  $("article, section, .norma, .item, tr, li, .content > div, .bulletin-content > div, p").each(
    (_, el) => {
      const text = $(el).text().trim();
      if (text.length < 10 || text.length > 5000) return;

      const norma = parseNormaFromText(text, municipioId, anioBoletin);
      if (norma) {
        // Buscar link a PDF en el mismo elemento
        const pdfLink = $(el).find('a[href*=".pdf"], a[href*="download"]');
        if (pdfLink.length > 0) {
          norma.urlPdf = normalizeUrl(pdfLink.attr("href") ?? "");
        }

        // Evitar duplicados
        const isDuplicate = normas.some(
          (n) => n.numero === norma.numero && n.tipo === norma.tipo
        );
        if (!isDuplicate) {
          normas.push(norma);
        }
      }
    }
  );

  // Fallback: buscar patrones en el texto completo de la página
  if (normas.length === 0) {
    const textNormas = extractNormasFromFullText(
      pageText,
      municipioId,
      anioBoletin
    );
    normas.push(...textNormas);
  }

  // Buscar todos los PDFs vinculados en el boletín
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().trim();

    if (href.includes(".pdf") || href.includes("download")) {
      const norma = parseNormaFromText(text, municipioId, anioBoletin);
      if (norma) {
        norma.urlPdf = normalizeUrl(href);
        const isDuplicate = normas.some(
          (n) => n.numero === norma.numero && n.tipo === norma.tipo
        );
        if (!isDuplicate) {
          normas.push(norma);
        }
      }
    }
  });

  return normas;
}

// ─────────────────────────────────────────
// Parsers
// ─────────────────────────────────────────

/**
 * Intenta extraer una norma de un bloque de texto.
 */
function parseNormaFromText(
  text: string,
  municipioId: string,
  defaultAnio: number
): SibomNorma | null {
  const tipo = detectTipo(text);
  if (tipo === "OTRO") {
    // Solo parsear si detectamos un tipo específico
    // (excepto si parece contener un número de norma)
    if (!hasNormaNumber(text)) return null;
  }

  const numero = extractNumero(text);
  if (!numero) return null;

  const anioMatch = text.match(/\b(20\d{2}|19\d{2})\b/);
  const anio = anioMatch ? parseInt(anioMatch[1]) : defaultAnio;

  const fecha = extractFecha(text);

  return {
    municipioId,
    tipo,
    numero,
    anio,
    fecha,
    titulo: cleanTitle(text),
    urlPdf: null,
  };
}

/**
 * Extrae normas buscando patrones en texto largo (fallback).
 */
function extractNormasFromFullText(
  fullText: string,
  municipioId: string,
  defaultAnio: number
): SibomNorma[] {
  const normas: SibomNorma[] = [];

  // Patrones para detectar normas en texto corrido
  const patterns = [
    /(?:ORDENANZA|Ordenanza)\s+(?:N[°ºo]?\s*)?(\d+(?:\/\d+)?)/g,
    /(?:DECRETO|Decreto)\s+(?:N[°ºo]?\s*)?(\d+(?:\/\d+)?)/g,
    /(?:RESOLUCI[OÓ]N|Resoluci[oó]n)\s+(?:N[°ºo]?\s*)?(\d+(?:\/\d+)?)/g,
  ];

  const tipoMap: NormaTipo[] = ["ORDENANZA", "DECRETO", "RESOLUCION"];

  patterns.forEach((pattern, i) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(fullText)) !== null) {
      const numero = match[1];
      const contextStart = Math.max(0, match.index - 50);
      const contextEnd = Math.min(fullText.length, match.index + match[0].length + 200);
      const context = fullText.slice(contextStart, contextEnd);

      const anioMatch = context.match(/\b(20\d{2})\b/);
      const anio = anioMatch ? parseInt(anioMatch[1]) : defaultAnio;

      const isDuplicate = normas.some(
        (n) => n.numero === numero && n.tipo === tipoMap[i]
      );

      if (!isDuplicate) {
        normas.push({
          municipioId,
          tipo: tipoMap[i],
          numero,
          anio,
          fecha: extractFecha(context),
          titulo: cleanTitle(context),
          urlPdf: null,
        });
      }
    }
  });

  return normas;
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function detectTipo(text: string): NormaTipo {
  const lower = text.toLowerCase();
  if (/\bordenanza\b/i.test(lower)) return "ORDENANZA";
  if (/\bdecreto\b/i.test(lower)) return "DECRETO";
  if (/\bresoluci[oó]n\b/i.test(lower)) return "RESOLUCION";
  if (/\blicitaci[oó]n\b/i.test(lower)) return "OTRO";
  return "OTRO";
}

function hasNormaNumber(text: string): boolean {
  return /n[°ºo]\s*\d+/i.test(text) || /\b\d{3,6}\/\d{2,4}\b/.test(text);
}

function extractNumero(text: string): string | null {
  const patterns = [
    /n[°ºo]\s*(\d+(?:\/\d+)?)/i,
    /(?:ord|dec|res)[.\s]*n?[°ºo]?\s*(\d+(?:\/\d+)?)/i,
    /#\s*(\d+)/,
    /\b(\d{3,6}\/\d{2,4})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function extractFecha(text: string): string | null {
  // dd/mm/yyyy
  const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // yyyy-mm-dd
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  return null;
}

function extractFechaFromPage($: cheerio.CheerioAPI): string | null {
  // Buscar fecha en el header o metadata del boletín
  const datePatterns = [
    ".fecha",
    ".date",
    "time",
    "[datetime]",
    ".bulletin-date",
    ".published",
  ];

  for (const selector of datePatterns) {
    const el = $(selector).first();
    if (el.length > 0) {
      const text = el.text().trim();
      const fecha = extractFecha(text);
      if (fecha) return fecha;

      // También intentar con atributo datetime
      const datetime = el.attr("datetime");
      if (datetime) return datetime.split("T")[0];
    }
  }

  // Fallback: buscar en texto general "Publicado el dd/mm/yyyy"
  const bodyText = $("body").text();
  const pubMatch = bodyText.match(
    /publicad[oa]\s+(?:el\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})/i
  );
  if (pubMatch) {
    const [, day, month, year] = pubMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function isFiscalKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("fiscal") ||
    lower.includes("tributari") ||
    lower.includes("tarifari") ||
    lower.includes("impositi")
  );
}

function cleanTitle(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function normalizeUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${SIBOM_BASE_URL}${url}`;
  return `${SIBOM_BASE_URL}/${url}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
  url: string,
  retries = 2
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "RadarMunicipal/1.0 (transparencia@radarmunicipal.ar)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      if (i === retries) throw err;
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error("Unreachable");
}
