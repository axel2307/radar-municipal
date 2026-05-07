/**
 * Parser de PDFs RAFAM (Régimen de Administración Financiera para
 * Administraciones Municipales) de la Provincia de Buenos Aires.
 *
 * Los PDFs RAFAM tienen estructuras tabulares estandarizadas:
 *   - Presupuesto aprobado (por objeto del gasto, por finalidad/función)
 *   - Ejecución presupuestaria trimestral
 *   - Estado de ejecución fiscal (SEF)
 *   - Estado de deuda pública
 *
 * Este parser extrae los montos clave y los devuelve como FiscalIndicator.
 */

import { createRequire } from "node:module";
import type { FiscalIndicator } from "@radar-municipal/core";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (
  buffer: Buffer,
  options?: { max?: number }
) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;

/** Desglose de ingresos por rubro */
export interface IngresosPorRubro {
  tributarios: number | null;
  noTributarios: number | null;
  coparticipacion: number | null;
  transferencias: number | null;
  otros: number | null;
  total: number | null;
}

/** Desglose de gasto por finalidad y función */
export interface GastoPorFinalidad {
  adminGubernamental: number | null;
  serviciosSeguridad: number | null;
  serviciosSociales: number | null;
  serviciosEconomicos: number | null;
  deudaPublica: number | null;
  total: number | null;
}

/** Resultado del parsing de un PDF RAFAM */
export interface RafamParseResult {
  success: boolean;
  tipoDocumento: "PRESUPUESTO" | "EJECUCION" | "SEF" | "DEUDA" | "DESCONOCIDO";
  anio: number | null;
  trimestre: number | null;
  datos: Partial<FiscalIndicator>;
  /** Desglose de ingresos por rubro (si disponible) */
  ingresosPorRubro: IngresosPorRubro | null;
  /** Desglose de gasto por finalidad/función (si disponible) */
  gastoPorFinalidad: GastoPorFinalidad | null;
  /** Texto sin procesar extraído (para debugging) */
  rawText: string;
  /** Warnings sobre datos parciales o incompletos */
  warnings: string[];
}

/**
 * Parsea un PDF RAFAM desde una URL y extrae indicadores fiscales.
 */
export async function parseRafamFromUrl(
  url: string,
  municipioId: string
): Promise<RafamParseResult> {
  const warnings: string[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "RadarMunicipal/1.0 (transparencia@radarmunicipal.ar)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return makeEmptyResult(`HTTP ${response.status}`, url);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return parseRafamFromBuffer(buffer, municipioId, warnings);
  } catch (err) {
    return makeEmptyResult(
      `Error descargando: ${(err as Error).message}`,
      ""
    );
  }
}

/**
 * Parsea un PDF RAFAM desde un buffer en memoria.
 */
export async function parseRafamFromBuffer(
  buffer: Buffer,
  municipioId: string,
  warnings: string[] = []
): Promise<RafamParseResult> {
  try {
    const data = await pdfParse(buffer, { max: 30 });
    const text = data.text ?? "";

    if (text.trim().length < 100) {
      return makeEmptyResult("PDF sin texto extraíble (probablemente escaneado)", text);
    }

    // Detectar tipo de documento
    const tipo = detectDocumentType(text);

    // Extraer año y trimestre
    const { anio, trimestre } = extractPeriod(text);

    // Extraer datos fiscales según tipo
    const datos: Partial<FiscalIndicator> = { municipioId };
    if (anio) datos.anio = anio;
    if (trimestre) datos.trimestre = trimestre;

    switch (tipo) {
      case "PRESUPUESTO":
        extractPresupuesto(text, datos, warnings);
        break;
      case "EJECUCION":
        extractEjecucion(text, datos, warnings);
        break;
      case "SEF":
        extractSEF(text, datos, warnings);
        break;
      case "DEUDA":
        extractDeuda(text, datos, warnings);
        break;
      default:
        // Intentar extracción genérica
        extractGeneric(text, datos, warnings);
        break;
    }

    // Calcular ratios derivados
    computeDerivedRatios(datos);

    // Extraer desgloses (disponibles en presupuesto y ejecución)
    let ingresosPorRubro: IngresosPorRubro | null = null;
    let gastoPorFinalidad: GastoPorFinalidad | null = null;

    if (tipo === "PRESUPUESTO" || tipo === "EJECUCION" || tipo === "SEF") {
      ingresosPorRubro = extractIngresosPorRubro(text, warnings);
      gastoPorFinalidad = extractGastoPorFinalidad(text, warnings);
    }

    return {
      success: Object.keys(datos).length > 3, // más que solo id/anio/trimestre
      tipoDocumento: tipo,
      anio,
      trimestre,
      datos,
      ingresosPorRubro,
      gastoPorFinalidad,
      rawText: text.slice(0, 5000),
      warnings,
    };
  } catch (err) {
    return makeEmptyResult(`Error parseando PDF: ${(err as Error).message}`, "");
  }
}

// ─────────────────────────────────────────
// Detectores
// ─────────────────────────────────────────

function detectDocumentType(
  text: string
): RafamParseResult["tipoDocumento"] {
  const lower = text.toLowerCase();

  // Orden de prioridad: más específico primero
  if (
    lower.includes("estado de ejecución fiscal") ||
    lower.includes("estado de ejecucion fiscal") ||
    /\bsef\b/.test(lower)
  ) {
    return "SEF";
  }

  if (
    lower.includes("estado de deuda") ||
    lower.includes("deuda pública") ||
    lower.includes("deuda publica") ||
    lower.includes("endeudamiento")
  ) {
    return "DEUDA";
  }

  if (
    lower.includes("ejecución presupuestaria") ||
    lower.includes("ejecucion presupuestaria") ||
    lower.includes("estado de ejecución") ||
    lower.includes("planilla de ejecución")
  ) {
    return "EJECUCION";
  }

  if (
    lower.includes("presupuesto") &&
    (lower.includes("aprobado") ||
      lower.includes("vigente") ||
      lower.includes("general de gastos") ||
      lower.includes("cálculo de recursos"))
  ) {
    return "PRESUPUESTO";
  }

  return "DESCONOCIDO";
}

function extractPeriod(text: string): {
  anio: number | null;
  trimestre: number | null;
} {
  // Buscar "Ejercicio 2025", "Año 2025", "Período 2025"
  const anioMatch = text.match(
    /(?:ejercicio|a[ñn]o|per[ií]odo|presupuesto)\s*:?\s*(20\d{2})/i
  );
  const anio = anioMatch ? parseInt(anioMatch[1]) : null;

  // Buscar trimestre
  const trimMatch = text.match(
    /(\d)[°ºer]*\s*trimestre|trimestre\s*(\d)/i
  );
  const trimestre = trimMatch
    ? parseInt(trimMatch[1] || trimMatch[2])
    : null;

  return { anio, trimestre };
}

// ─────────────────────────────────────────
// Extractores por tipo de documento
// ─────────────────────────────────────────

/** Patrones de montos: "1.234.567,89" o "1234567.89" */
const MONTO_PATTERN =
  /[\d.,]+(?:\.\d{3})*(?:,\d{1,2})?/;

function extractMonto(text: string): number | null {
  const match = text.match(MONTO_PATTERN);
  if (!match) return null;
  return parseMonto(match[0]);
}

/** Convierte string de monto argentino a number */
function parseMonto(raw: string): number | null {
  // Formato argentino: 1.234.567,89 → 1234567.89
  // Limpiar
  const cleaned = raw.replace(/\s/g, "");

  // Detectar si usa formato argentino (punto como miles, coma como decimal)
  if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    const intPart = parts[0].replace(/\./g, "");
    const decPart = parts[1] ?? "0";
    const num = parseFloat(`${intPart}.${decPart}`);
    return isNaN(num) ? null : num;
  }

  // Formato con punto como decimal (menos común en AR)
  const num = parseFloat(cleaned.replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

/**
 * Busca un monto en líneas que matcheen un patrón.
 * Retorna el primer monto encontrado.
 */
function findMontoByKeyword(
  lines: string[],
  keywords: RegExp[],
  warnings: string[]
): number | null {
  for (const line of lines) {
    for (const kw of keywords) {
      if (kw.test(line)) {
        const monto = extractMonto(line);
        if (monto !== null && monto > 0) {
          return monto;
        }
      }
    }
  }
  return null;
}

function extractPresupuesto(
  text: string,
  datos: Partial<FiscalIndicator>,
  warnings: string[]
): void {
  const lines = text.split("\n").map((l) => l.trim());

  datos.gastoTotal = findMontoByKeyword(
    lines,
    [
      /total\s*(general|gastos|de\s*gastos)/i,
      /total\s*del\s*presupuesto/i,
      /total\s*erogaciones/i,
    ],
    warnings
  );

  datos.ingresoTotal = findMontoByKeyword(
    lines,
    [
      /total\s*(de\s*)?recursos/i,
      /total\s*(de\s*)?ingresos/i,
      /c[aá]lculo\s*de\s*recursos.*total/i,
    ],
    warnings
  );

  datos.gastoPersonal = findMontoByKeyword(
    lines,
    [
      /personal\b.*total/i,
      /gastos\s*en\s*personal/i,
      /remuneraciones.*total/i,
    ],
    warnings
  );

  datos.gastoCapital = findMontoByKeyword(
    lines,
    [
      /gastos\s*de\s*capital.*total/i,
      /inversi[oó]n.*total/i,
      /bienes\s*de\s*capital/i,
    ],
    warnings
  );

  if (!datos.gastoTotal) {
    warnings.push("No se pudo extraer gasto total del presupuesto");
  }
}

function extractEjecucion(
  text: string,
  datos: Partial<FiscalIndicator>,
  warnings: string[]
): void {
  const lines = text.split("\n").map((l) => l.trim());

  // En ejecución, buscar "devengado" como columna clave
  datos.gastoTotal = findMontoByKeyword(
    lines,
    [
      /total.*devengado/i,
      /devengado.*total/i,
      /total\s*erogaciones.*devengado/i,
      /total\s*general.*devengado/i,
    ],
    warnings
  );

  datos.ingresoTotal = findMontoByKeyword(
    lines,
    [
      /total.*recaudado/i,
      /recaudado.*total/i,
      /total\s*recursos.*percibido/i,
    ],
    warnings
  );

  datos.gastoPersonal = findMontoByKeyword(
    lines,
    [
      /personal.*devengado/i,
      /remuneraciones.*devengado/i,
    ],
    warnings
  );

  datos.gastoCapital = findMontoByKeyword(
    lines,
    [
      /capital.*devengado/i,
      /inversi[oó]n.*devengado/i,
    ],
    warnings
  );

  // Resultado fiscal = ingreso - gasto (si tenemos ambos)
  if (datos.ingresoTotal != null && datos.gastoTotal != null) {
    datos.resultadoFiscal = datos.ingresoTotal - datos.gastoTotal;
  }

  if (!datos.gastoTotal) {
    warnings.push("No se pudo extraer gasto devengado de la ejecución");
  }
}

function extractSEF(
  text: string,
  datos: Partial<FiscalIndicator>,
  warnings: string[]
): void {
  const lines = text.split("\n").map((l) => l.trim());

  datos.gastoTotal = findMontoByKeyword(
    lines,
    [
      /total\s*erogaciones/i,
      /total\s*gastos\s*corrientes.*capital/i,
      /total\s*general\s*de\s*gastos/i,
    ],
    warnings
  );

  datos.ingresoTotal = findMontoByKeyword(
    lines,
    [
      /total\s*recursos/i,
      /total\s*ingresos/i,
    ],
    warnings
  );

  datos.resultadoFiscal = findMontoByKeyword(
    lines,
    [
      /resultado\s*(financiero|fiscal|econ[oó]mico)/i,
      /super[aá]vit|d[eé]ficit/i,
    ],
    warnings
  );

  if (!datos.gastoTotal) {
    warnings.push("No se pudo extraer totales del SEF");
  }
}

function extractDeuda(
  text: string,
  datos: Partial<FiscalIndicator>,
  warnings: string[]
): void {
  const lines = text.split("\n").map((l) => l.trim());

  datos.deudaTotal = findMontoByKeyword(
    lines,
    [
      /total\s*(de\s*)?(la\s*)?deuda/i,
      /saldo\s*(al|de)\s*(deuda|cierre)/i,
      /stock\s*de\s*deuda/i,
      /deuda\s*total/i,
    ],
    warnings
  );

  if (!datos.deudaTotal) {
    warnings.push("No se pudo extraer monto de deuda");
  }
}

function extractGeneric(
  text: string,
  datos: Partial<FiscalIndicator>,
  warnings: string[]
): void {
  const lines = text.split("\n").map((l) => l.trim());

  // Intentar extraer cualquier dato que encontremos
  datos.gastoTotal = findMontoByKeyword(
    lines,
    [/total\s*(general|gastos|erogaciones)/i],
    warnings
  );
  datos.ingresoTotal = findMontoByKeyword(
    lines,
    [/total\s*(recursos|ingresos)/i],
    warnings
  );
  datos.gastoPersonal = findMontoByKeyword(
    lines,
    [/personal.*total/i, /gastos\s*en\s*personal/i],
    warnings
  );
  datos.deudaTotal = findMontoByKeyword(
    lines,
    [/deuda.*total/i],
    warnings
  );

  warnings.push("Extracción genérica — datos pueden ser imprecisos");
}

// ─────────────────────────────────────────
// Extractores de desgloses
// ─────────────────────────────────────────

function extractIngresosPorRubro(
  text: string,
  warnings: string[]
): IngresosPorRubro | null {
  const lines = text.split("\n").map((l) => l.trim());

  const tributarios = findMontoByKeyword(
    lines,
    [/ingresos?\s*tributarios/i, /recursos?\s*tributarios/i],
    warnings
  );
  const noTributarios = findMontoByKeyword(
    lines,
    [/ingresos?\s*no\s*tributarios/i, /recursos?\s*no\s*tributarios/i],
    warnings
  );
  const coparticipacion = findMontoByKeyword(
    lines,
    [
      /coparticipaci[oó]n/i,
      /r[eé]gimen\s*de\s*coparticipaci[oó]n/i,
    ],
    warnings
  );
  const transferencias = findMontoByKeyword(
    lines,
    [
      /transferencias\s*(corrientes|de\s*capital|recibidas)/i,
      /aportes?\s*(no\s*reintegrables|provinciales|nacionales)/i,
    ],
    warnings
  );

  // Si no encontramos nada, no vale la pena retornar el desglose
  if (
    tributarios == null &&
    noTributarios == null &&
    coparticipacion == null &&
    transferencias == null
  ) {
    return null;
  }

  const total = findMontoByKeyword(
    lines,
    [/total\s*(de\s*)?(recursos|ingresos)/i],
    warnings
  );

  // "otros" = total - suma de los rubros conocidos (si tenemos total)
  const sumaConocidos =
    (tributarios ?? 0) +
    (noTributarios ?? 0) +
    (coparticipacion ?? 0) +
    (transferencias ?? 0);
  const otros =
    total != null && total > sumaConocidos ? total - sumaConocidos : null;

  return {
    tributarios,
    noTributarios,
    coparticipacion,
    transferencias,
    otros,
    total,
  };
}

function extractGastoPorFinalidad(
  text: string,
  warnings: string[]
): GastoPorFinalidad | null {
  const lines = text.split("\n").map((l) => l.trim());

  const adminGubernamental = findMontoByKeyword(
    lines,
    [
      /administraci[oó]n\s*gubernamental/i,
      /admin\.\s*gubernamental/i,
    ],
    warnings
  );
  const serviciosSeguridad = findMontoByKeyword(
    lines,
    [
      /servicios?\s*de\s*seguridad/i,
      /seguridad\s*(interior|ciudadana|p[uú]blica)/i,
    ],
    warnings
  );
  const serviciosSociales = findMontoByKeyword(
    lines,
    [
      /servicios?\s*sociales/i,
    ],
    warnings
  );
  const serviciosEconomicos = findMontoByKeyword(
    lines,
    [
      /servicios?\s*econ[oó]micos/i,
    ],
    warnings
  );
  const deudaPublica = findMontoByKeyword(
    lines,
    [
      /deuda\s*p[uú]blica/i,
      /servicio\s*de\s*la\s*deuda/i,
    ],
    warnings
  );

  // Si no encontramos ninguna finalidad, no retornar
  if (
    adminGubernamental == null &&
    serviciosSeguridad == null &&
    serviciosSociales == null &&
    serviciosEconomicos == null &&
    deudaPublica == null
  ) {
    return null;
  }

  const total = findMontoByKeyword(
    lines,
    [
      /total\s*(general\s*)?(de\s*)?(gastos|erogaciones)/i,
    ],
    warnings
  );

  return {
    adminGubernamental,
    serviciosSeguridad,
    serviciosSociales,
    serviciosEconomicos,
    deudaPublica,
    total,
  };
}

// ─────────────────────────────────────────
// Ratios derivados
// ─────────────────────────────────────────

function computeDerivedRatios(datos: Partial<FiscalIndicator>): void {
  if (datos.gastoPersonal != null && datos.gastoTotal != null && datos.gastoTotal > 0) {
    datos.pctPersonal = (datos.gastoPersonal / datos.gastoTotal) * 100;
  }

  if (datos.gastoCapital != null && datos.gastoTotal != null && datos.gastoTotal > 0) {
    datos.pctCapital = (datos.gastoCapital / datos.gastoTotal) * 100;
  }

  if (datos.ingresoTotal != null && datos.gastoTotal != null && !datos.resultadoFiscal) {
    datos.resultadoFiscal = datos.ingresoTotal - datos.gastoTotal;
  }
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function makeEmptyResult(
  error: string,
  rawText: string
): RafamParseResult {
  return {
    success: false,
    tipoDocumento: "DESCONOCIDO",
    anio: null,
    trimestre: null,
    datos: {},
    ingresosPorRubro: null,
    gastoPorFinalidad: null,
    rawText: rawText.slice(0, 5000),
    warnings: [error],
  };
}
