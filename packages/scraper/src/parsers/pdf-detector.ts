/**
 * PDF detector: verifica si un PDF es parseable (tiene texto) o es escaneado.
 *
 * Descarga los primeros bytes del PDF y usa pdf-parse para determinar
 * si contiene texto extraíble o es una imagen escaneada.
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buffer: Buffer, options?: { max?: number }) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;

/** Tamaño máximo a descargar para detección (2MB) */
const MAX_DOWNLOAD_SIZE = 2 * 1024 * 1024;

/** Mínimo de caracteres para considerar parseable */
const MIN_TEXT_LENGTH = 50;

/**
 * Detecta si un PDF en la URL dada es parseable (tiene texto extraíble).
 *
 * @returns true si el PDF tiene texto suficiente, false si es escaneado, null si no se pudo determinar
 */
export async function detectPdfParseable(url: string): Promise<boolean | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "RadarMunicipal/1.0 (transparencia@radarmunicipal.ar)",
        Range: `bytes=0-${MAX_DOWNLOAD_SIZE}`,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 206) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("pdf") && !url.toLowerCase().endsWith(".pdf")) {
      return null; // Not a PDF
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    const data = await pdfParse(buffer, {
      max: 5, // Solo parsear primeras 5 páginas
    });

    const text = data.text?.trim() ?? "";
    return text.length >= MIN_TEXT_LENGTH;
  } catch {
    return null;
  }
}

/**
 * Detecta formato de un archivo por su content-type y URL.
 */
export async function detectFileFormat(
  url: string
): Promise<{
  contentType: string | null;
  sizeBytes: number | null;
  isPdf: boolean;
}> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent":
          "RadarMunicipal/1.0 (transparencia@radarmunicipal.ar)",
      },
    });

    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");

    return {
      contentType,
      sizeBytes: contentLength ? parseInt(contentLength) : null,
      isPdf:
        contentType?.includes("pdf") === true ||
        url.toLowerCase().endsWith(".pdf"),
    };
  } catch {
    return { contentType: null, sizeBytes: null, isPdf: false };
  }
}
