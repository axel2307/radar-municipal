/**
 * Parser de Ordenanzas Impositivas municipales de la Provincia de Buenos Aires.
 *
 * Objetivo: dado el texto de una ordenanza impositiva (extraído de HTML o PDF),
 * reconocer los 4 tributos clave y calcular el monto anual que pagaría cada
 * caso testigo estándar de Radar Municipal:
 *
 *   - TSG / ABL          → vivienda urbana 40M valuación fiscal
 *   - TISH               → comercio minorista 50M facturación anual
 *   - Tasa Vial Rural    → 100 ha zona productiva media
 *   - Derecho Construcción → 100 m² vivienda categoría media
 *
 * El parser está deliberadamente conservador: prefiere devolver null + warning
 * antes que un número inventado. Cada monto extraído queda con un
 * ConfidenceLevel que refleja la calidad de la fuente:
 *
 *   - HTML estructurado con tablas claras  → MEDIA
 *   - PDF tabular parseable                 → MEDIA
 *   - PDF escaneado con OCR (fallback)      → BAJA
 *
 * Las 3 rutas (HTML / PDF nativo / OCR) comparten el mismo extractor de
 * tarifas a partir de texto plano — la diferencia es sólo cómo se obtuvo
 * ese texto.
 */

import * as cheerio from "cheerio";
import {
  CASOS_TESTIGO_DEFAULT,
  ConfidenceLevel,
  SourceLayer,
  type CasoTestigoParams,
  type DataPointConfidence,
  type DataPointSource,
  type SourcedValue,
} from "@radar-municipal/core";

/**
 * Extrae el texto plano de un PDF nativo usando pdf-parse v2 (`PDFParse` class API).
 * El import es dinámico para evitar cargar pdfjs-dist en los paths HTML y
 * para no romper el typecheck cuando el subprocess de tsx aún no resolvió ESM.
 *
 * Devuelve `{ text, numpages }`, espejando la forma mínima que el caller necesita.
 * Cualquier excepción se traga aquí y retorna `text:""` para que buildResult()
 * emita warnings de "no se pudo extraer" en vez de tirar el batch.
 */
async function extractTextFromPdf(
  buffer: Buffer
): Promise<{ text: string; numpages: number }> {
  const mod = (await import("pdf-parse")) as typeof import("pdf-parse");
  const PDFParseCtor = mod.PDFParse;
  // pdf-parse v2 quiere Uint8Array; Buffer ya es compatible pero en algunos
  // runtimes tsx el prototype chain del Buffer varía — normalizamos.
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const parser = new PDFParseCtor({ data });
  try {
    const result = await parser.getText();
    return { text: result.text ?? "", numpages: result.total ?? 0 };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

// ─────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────

/**
 * Tarifas crudas extraídas de la ordenanza. Cada campo puede ser null si la
 * ordenanza no lo publica o el parser no lo pudo reconocer.
 */
export interface TarifasExtraidas {
  /** Alícuota TSG / ABL (por mil sobre valuación fiscal) */
  tsgPorMil: number | null;
  /** Alícuota TISH (% sobre ingresos brutos) */
  tishPorciento: number | null;
  /** Importe anual Tasa Vial Rural por hectárea, en ARS */
  tasaVialRuralPorHa: number | null;
  /** Derecho de construcción por m², en ARS */
  derechoConstruccionPorM2: number | null;
  /**
   * Modelo alternativo de Derecho de Construcción: alícuota (en %) sobre el
   * valor de la obra. Usado por municipios como General Belgrano (1%). Sólo
   * se computa el monto a partir de este campo cuando `derechoConstruccionPorM2`
   * es null (es decir, cuando la ordenanza no publica $/m² directo). Sprint 13.
   */
  derechoConstruccionAlicuota: number | null;
}

/**
 * Resultado de parsear una ordenanza impositiva.
 * Contiene tanto las tarifas crudas como los 4 montos ya aplicados al caso
 * testigo estándar. La capa de ingestión usa los montos + provenance para
 * armar un `PresionImpositivaData`.
 */
export interface OrdenanzaImpositivaParseResult {
  success: boolean;
  /** Año fiscal si el parser pudo inferirlo del título o cabecera */
  anioFiscal: number | null;
  tarifas: TarifasExtraidas;
  /** Los 4 montos computados con los caso testigo default */
  montoVivienda: SourcedValue<number>;
  montoComercio: SourcedValue<number>;
  montoRural: SourcedValue<number>;
  montoConstruccion: SourcedValue<number>;
  /** Advertencias del parser (campos no encontrados, valores fuera de rango, etc.) */
  warnings: string[];
  /** Texto plano de entrada (útil para debugging + golden tests) */
  rawText: string;
}

export interface ParseOptions {
  /** URL del documento original (para procedencia) */
  url: string;
  /** Casos testigo a usar (default: CASOS_TESTIGO_DEFAULT) */
  casos?: CasoTestigoParams;
  /** Fecha de acceso ISO 8601 (default: now) */
  fechaAcceso?: string;
  /** Fecha de publicación ISO 8601 (si se conoce) */
  fechaPublicacion?: string | null;
  /**
   * Nivel de confianza a usar para los montos encontrados. El caller sabe
   * si el texto viene de HTML estructurado, PDF nativo u OCR. Default: MEDIA.
   */
  confianza?: ConfidenceLevel;
}

/**
 * Backend de OCR inyectable. Si el caller tiene Tesseract/similar configurado
 * puede pasarlo; si no, `parseOrdenanzaImpositivaFromPdf()` no intenta OCR
 * y emite una warning cuando el PDF no tiene texto extraíble.
 */
export interface OcrBackend {
  /**
   * Dado un buffer de PDF escaneado, devolver el texto plano extraído.
   * Idealmente debería ya concatenar todas las páginas.
   */
  extractText(pdfBuffer: Buffer): Promise<string>;
}

// ─────────────────────────────────────────
// Extractor de tarifas desde texto plano
// ─────────────────────────────────────────

// Patrones de números argentinos: "12,50", "1.234,56", "0,005", etc.
// La ordenanza suele usar coma decimal.
// El lookbehind `(?<![0-9,.])` impide que el engine arranque a la mitad de un
// número (ej. "10,50" no debe capturarse como "0,50" ni "50") cuando un
// cuantificador lazy/greedy anterior acorta su match por backtracking.
const NUM_AR = /(?<![0-9,.])(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)/;

function parseArNumber(raw: string): number | null {
  if (!raw) return null;
  const clean = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

/**
 * Algunos PDFs (p.ej. Chivilcoy 2026) rinden cada glifo dos veces por un
 * problema de fuentes dobles, de modo que el extractor de pdf.js devuelve
 * "OOrrddeennaannzzaa" o "O O r r d d e e n n a a n n z z a a" en vez de
 * "Ordenanza". Esta función corrige el artefacto *por línea*: si la línea,
 * ignorando espacios, tiene >50% de pares de caracteres consecutivos iguales,
 * se asume doblado y se colapsan los espacios intermedios + los pares.
 *
 * Se analiza por línea para no destruir texto español normal (donde "a a"
 * en "cada alumno" es una coincidencia puntual, no un patrón global).
 *
 * Las líneas normales (densidad de doblado < 0.5) pasan sin cambios.
 */
export function collapseDoubledGlyphs(text: string): string {
  const lines = text.split(/\r?\n/);
  const fixed = lines.map((line) => {
    const stripped = line.replace(/\s+/g, "");
    if (stripped.length < 10) return line;
    let doubled = 0;
    for (let i = 0; i < stripped.length - 1; i++) {
      if (stripped[i].toLowerCase() === stripped[i + 1].toLowerCase()) doubled++;
    }
    if (doubled / stripped.length < 0.5) return line;
    // Patrón doblado confirmado — quitar espacios intermedios y colapsar pares.
    return stripped.replace(/([A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9])\1/g, "$1");
  });
  return fixed.join("\n");
}

/**
 * Normaliza texto: colapsa whitespace, baja mayúsculas iniciales a lower,
 * preserva acentos. Usado para que los regex no dependan del formato.
 * Si detecta el artefacto de glifos duplicados (ver `collapseDoubledGlyphs`)
 * lo corrige antes del resto del pipeline.
 */
export function normalizeText(text: string): string {
  return collapseDoubledGlyphs(text)
    .replace(/\r\n/g, "\n")
    .replace(/[\t\u00a0]+/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Busca el año fiscal en el texto. Convenciones típicas:
 *   "Ordenanza Impositiva 2026"
 *   "Ejercicio Fiscal 2026"
 *   "Año Fiscal 2026"
 */
export function extractAnioFiscal(text: string): number | null {
  // Orden importante: en ordenanzas típicas, el año FISCAL aparece como
  // "Ejercicio Fiscal YYYY" o "Ordenanza Impositiva YYYY" (título). El número
  // de ordenanza como "N° 2150/2025" tiene el año de SANCIÓN, no el fiscal.
  // Por eso priorizamos "ejercicio fiscal" y "ordenanza impositiva YYYY"
  // (sin "/") antes de los patrones que capturan el año detrás de la barra.
  const patterns = [
    /ejercicio\s+fiscal\s+(\d{4})/i,
    /a[ñn]o\s+fiscal\s+(\d{4})/i,
    /ordenanza\s+impositiva\s+(\d{4})/i,
    /ordenanza\s+impositiva\s+n[°º]?\s*\d+\s*\/\s*(\d{4})/i,
    // Sprint 11: muchos municipios publican un único documento "Fiscal e
    // Impositiva" con el año en el título (Belgrano 2024 dice "ORDENANZA FISCAL\n
    // E IMPOSITIVA 2024", Cañuelas suele decir "ORDENANZA FISCAL 2025"). Aceptamos
    // las dos variantes.
    /ordenanza\s+fiscal\s+e\s+impositiva\s+(\d{4})/i,
    /ordenanza\s+fiscal\s+(\d{4})/i,
    /ejercicio\s+(\d{4})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const y = Number(m[1]);
      if (y >= 2015 && y <= 2040) return y;
    }
  }
  return null;
}

/**
 * Tasa de Servicios Generales (ABL / TSG). Se expresa en ‰ (por mil) sobre la
 * valuación fiscal. Patrones típicos:
 *   "alícuota del 12,50 por mil"
 *   "12,50 ‰"
 *   "Tasa por Servicios Generales: 10,00 por mil sobre valuación"
 *
 * Algunos municipios (p.ej. San Antonio de Areco 2025) publican la alícuota
 * como *porcentaje* de la valuación fiscal: "Base Imponible: Valuación Fiscal
 * suministrada por ARBA. 0,25%". Como matemáticamente % × 10 = ‰, aceptamos
 * esa variante como fallback, con un guard lookahead que impide que matchee
 * TISH (que también es "X%" pero en contexto "sobre ingresos brutos").
 */
export function extractTsgPorMil(text: string): number | null {
  const t = text.toLowerCase();
  // [\s\S] permite cruzar saltos de línea y puntos de sección; el límite
  // numérico evita matches espurios a la otra punta del documento.
  const patterns: Array<{ re: RegExp; convert: (n: number) => number }> = [
    // Canónico: "X por mil" / "X ‰" en contexto TSG/ABL.
    {
      re: new RegExp(
        `(?:tsg|tasa[\\s\\S]{0,80}servicios\\s+generales|abl|alumbrado[\\s\\S]{0,40}barrido)[\\s\\S]{0,160}?${NUM_AR.source}\\s*(?:por\\s+mil|‰|%o)`,
        "i"
      ),
      convert: (n) => n,
    },
    {
      re: new RegExp(
        `al[ií]cuota[\\s\\S]{0,60}?${NUM_AR.source}\\s*(?:por\\s+mil|‰|%o)[\\s\\S]{0,80}valuaci[oó]n`,
        "i"
      ),
      convert: (n) => n,
    },
    // Fallback: "X%" precedido por "valuación fiscal" cerca y sin contexto TISH
    // inmediato. Convertir a por mil multiplicando por 10.
    {
      re: new RegExp(
        `valuaci[oó]n\\s+fiscal[\\s\\S]{0,100}?${NUM_AR.source}\\s*%(?![\\s\\S]{0,40}(?:ingresos|iibb|seguridad\\s+e\\s+higiene|inspecci[oó]n[\\s\\S]{0,10}seguridad))`,
        "i"
      ),
      convert: (n) => n * 10,
    },
  ];
  for (const { re, convert } of patterns) {
    const m = t.match(re);
    if (m) {
      const raw = parseArNumber(m[1]);
      if (raw == null) continue;
      const n = convert(raw);
      // TSG razonable: entre 0.5 y 80 por mil anual.
      if (n >= 0.5 && n <= 80) return n;
    }
  }
  return null;
}

/**
 * Tasa de Inspección Seguridad e Higiene (TISH). Se expresa en % sobre ingresos
 * brutos (típicamente 0,5% a 8%). Patrones:
 *   "alícuota general del 0,6 %"
 *   "TISH: 0,80%"
 *   "Tasa por Inspección de Seguridad e Higiene - Alícuota general: 1,00%"
 */
export function extractTishPorciento(text: string): number | null {
  const t = text.toLowerCase();
  const patterns = [
    new RegExp(
      `(?:tish|tasa[\\s\\S]{0,80}(?:inspecci[oó]n[\\s\\S]{0,40}seguridad[\\s\\S]{0,40}higiene|seguridad[\\s\\S]{0,40}higiene)|tasa[\\s\\S]{0,40}higiene)[\\s\\S]{0,200}?${NUM_AR.source}\\s*%`,
      "i"
    ),
    new RegExp(`al[ií]cuota\\s+general[\\s\\S]{0,40}?${NUM_AR.source}\\s*%[\\s\\S]{0,100}(?:comercio|minorista|ingresos)`, "i"),
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const n = parseArNumber(m[1]);
      // TISH razonable: entre 0,1% y 10%
      if (n != null && n >= 0.05 && n <= 10) return n;
    }
  }
  return null;
}

/**
 * Tasa Vial Rural: típicamente en $/ha anual.
 * Patrones:
 *   "Tasa Vial Rural: $ 850 por hectárea"
 *   "Red Vial Rural — 850 pesos por ha"
 *
 * Sprint 11: algunos municipios (San Vicente 2023) llaman al mismo concepto
 * "Red Vial Municipal" — el caso de uso es idéntico (cobro por hectárea
 * a propietarios de campos rurales), sólo cambia el nombre. Aceptamos
 * "municipal" como variante. La cobertura per-ha del lookahead bloquea
 * matches espurios contra tasas urbanas (que jamás se cobran por hectárea).
 */
export function extractTasaVialRuralPorHa(text: string): number | null {
  const t = text.toLowerCase();
  const patterns = [
    // Canónico: "Tasa Vial Rural ... 850 por hectárea"
    new RegExp(
      `(?:tasa\\s+vial\\s+(?:rural|municipal)|red\\s+vial\\s+(?:rural|municipal)|vial\\s+(?:rural|municipal))[\\s\\S]{0,300}?\\$?\\s*${NUM_AR.source}\\s*(?:\\$)?\\s*(?:por\\s+(?:ha|hect[aá]rea)|\\/\\s*ha)`,
      "i"
    ),
    // Sprint 11: orden invertido. "Red Vial Municipal ... Por hectárea $71,00"
    // (San Vicente 2023). El keyword va primero y el monto después de "por
    // hectárea" — necesario porque San Vicente publica el header del concepto
    // y luego el valor, no la unidad pegada al número.
    new RegExp(
      `(?:tasa\\s+vial\\s+(?:rural|municipal)|red\\s+vial\\s+(?:rural|municipal))[\\s\\S]{0,300}?por\\s+(?:ha|hect[aá]rea)\\s*\\$?\\s*${NUM_AR.source}`,
      "i"
    ),
    // Fallback inverso: NUMBER por ha ... seguido de vial/rural en proximidad.
    new RegExp(`${NUM_AR.source}\\s*\\$?\\s*(?:por\\s+(?:ha|hect[aá]rea)|\\/\\s*ha)[\\s\\S]{0,80}(?:vial|rural)`, "i"),
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const n = parseArNumber(m[1]);
      // Tasa vial rural razonable: entre $50 y $50000 por ha anual
      if (n != null && n >= 50 && n <= 50000) return n;
    }
  }
  return null;
}

/**
 * Derecho de Construcción: típicamente en $/m² de superficie cubierta.
 * Patrones:
 *   "Derecho de Construcción: $ 5.500 por m²"
 *   "Derechos de edificación 5500 pesos el m2"
 */
export function extractDerechoConstruccionPorM2(text: string): number | null {
  const t = text.toLowerCase();
  const patterns = [
    new RegExp(
      `(?:derecho[s]?\\s+de\\s+(?:construcci[oó]n|edificaci[oó]n))[\\s\\S]{0,300}?\\$?\\s*${NUM_AR.source}\\s*\\$?\\s*(?:por\\s+m\\s*[2²]|\\/\\s*m\\s*[2²]|el\\s+m\\s*[2²])`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const n = parseArNumber(m[1]);
      // Derecho construcción razonable: entre $500 y $500000 por m²
      if (n != null && n >= 500 && n <= 500000) return n;
    }
  }
  return null;
}

/**
 * Modelo alternativo: alícuota (en %) sobre el valor de la obra.
 *
 * Sprint 12 confirmó (vía `scripts/inspect-construccion.ts` sobre Belgrano)
 * que muchos municipios PBA NO publican un $/m² fijo sino un porcentaje
 * sobre el valor de obra estimado: típicamente 1% en Belgrano, 1,5% en
 * otros. La estructura típica del articulado es:
 *
 *   TÍTULO XIII - DERECHOS DE CONSTRUCCIÓN
 *   ARTÍCULO 35°. La base imponible estará dada por el valor de la obra
 *   determinada.
 *   ARTÍCULO 36°. Establécese en el uno por ciento (1%) el alícuota...
 *
 * El extractor:
 *  1. Localiza el header "DERECHO[S] DE CONSTRUCCIÓN" / "EDIFICACIÓN".
 *  2. Toma una ventana de 3000 chars desde ese punto.
 *  3. Verifica que la ventana mencione "obra" / "edificación" / "valor"
 *     (necesario para distinguir alícuota-sobre-obra de tasas fijas que
 *     pueden tener un % en otro contexto).
 *  4. Busca un patrón de porcentaje en proximidad de "alícuota",
 *     "establécese", o entre paréntesis "(N%)".
 *  5. Filtra por rango razonable: 0,1% – 10%.
 *
 * El range bound impide capturar ruido como "5% de descuento por pago
 * adelantado" (que también contiene un %). El cap de 10% impide capturar
 * por error montos en pesos seguidos de cualquier "%" suelto.
 */
export function extractDerechoConstruccionAlicuota(text: string): number | null {
  const t = text.toLowerCase();
  const headerRe = /derecho[s]?\s+de\s+(?:construcci[oó]n|edificaci[oó]n)/gi;
  // Iteramos por TODAS las apariciones del header. El primer match suele
  // ser el índice / TOC del PDF (donde no hay artículos), y el segundo (o
  // posterior) es el header real del título tributario en el cuerpo. Sin
  // este loop, Belgrano y otros multi-parte fallan porque su TOC inicial
  // captura el header pero la ventana subsiguiente es sólo más TOC.
  const headerMatches = Array.from(t.matchAll(headerRe));
  if (headerMatches.length === 0) return null;

  // Cada patrón requiere un anchor semántico (alícuota/establécese/sobre el
  // valor) — sin él, un % parentizado en código procedural (recargos,
  // multas, intereses) genera falsos positivos. Cañuelas Sprint 13 es el
  // ejemplo: su Código Fiscal procedural mencionaba "(2%)" en contexto de
  // recargo y el extractor lo confundía con alícuota de obra.
  const patterns: RegExp[] = [
    // Canónico: "alícuota ... N%"
    new RegExp(`al[ií]cuota[\\s\\S]{0,200}?${NUM_AR.source}\\s*%`, "i"),
    // "Establécese en el N%" / "Establécese en (N%)" — el verbo es marcador
    // específico de fijación de tarifa.
    new RegExp(`establ[eé]cese[\\s\\S]{0,300}?${NUM_AR.source}\\s*%`, "i"),
    // "N% sobre el valor / la obra"
    new RegExp(
      `${NUM_AR.source}\\s*%\\s*(?:sobre\\s+(?:el\\s+valor|la\\s+obra)|del\\s+valor\\s+de\\s+la\\s+obra)`,
      "i"
    ),
  ];

  for (const headerMatch of headerMatches) {
    const idx = headerMatch.index ?? 0;
    // Ventana acotada: ~3000 chars cubre el típico título completo
    // (artículos de base imponible + alícuota + exenciones).
    const window = t.slice(idx, idx + 3000);
    // Guard: la ventana debe mencionar "obra/edificación/valor" para
    // distinguir alícuota-sobre-obra de un $/m² accidentalmente cercano.
    // Si solo hay TOC, este guard típicamente falla y pasamos al siguiente.
    if (!/(obra|edificaci[oó]n|valor)/i.test(window)) continue;
    for (const re of patterns) {
      const m = window.match(re);
      if (m) {
        const n = parseArNumber(m[1]);
        if (n != null && n >= 0.1 && n <= 10) return n;
      }
    }
  }
  return null;
}

/**
 * Extrae las 5 tarifas del texto normalizado. No hace I/O.
 */
export function extractTarifas(rawText: string): TarifasExtraidas {
  const text = normalizeText(rawText);
  return {
    tsgPorMil: extractTsgPorMil(text),
    tishPorciento: extractTishPorciento(text),
    tasaVialRuralPorHa: extractTasaVialRuralPorHa(text),
    derechoConstruccionPorM2: extractDerechoConstruccionPorM2(text),
    derechoConstruccionAlicuota: extractDerechoConstruccionAlicuota(text),
  };
}

// ─────────────────────────────────────────
// Aplicación de caso testigo → monto anual
// ─────────────────────────────────────────

/**
 * Dado el vector de tarifas y los parámetros de caso testigo, devuelve los
 * 4 montos anuales esperados. Pure function — es la base para golden tests.
 */
export function computeMontosFromTarifas(
  tarifas: TarifasExtraidas,
  casos: CasoTestigoParams = CASOS_TESTIGO_DEFAULT
): { vivienda: number | null; comercio: number | null; rural: number | null; construccion: number | null } {
  // Vivienda: TSG es por mil sobre valuación, multiplicado por 12 meses si la
  // ordenanza la expresa mensual — pero la convención en PBA es que la
  // alícuota publicada ya es efectiva anual. Mantenemos esa convención.
  const vivienda =
    tarifas.tsgPorMil != null
      ? (tarifas.tsgPorMil / 1000) * casos.vivienda.valuacionFiscal
      : null;

  // Comercio: TISH es % anual sobre IIBB.
  const comercio =
    tarifas.tishPorciento != null
      ? (tarifas.tishPorciento / 100) * casos.comercio.iibbAnual
      : null;

  // Rural: $/ha × hectáreas.
  const rural =
    tarifas.tasaVialRuralPorHa != null
      ? tarifas.tasaVialRuralPorHa * casos.rural.hectareas
      : null;

  // Construcción: prefer $/m² directo. Si la ordenanza usa alícuota sobre
  // valor de obra (Belgrano 1%, Sprint 13), usar el costo de referencia.
  // El fallback requiere que el caller suministre `costoReferenciaPorM2`
  // — sin él, no se puede computar y el monto queda null (con warning).
  let construccion: number | null = null;
  if (tarifas.derechoConstruccionPorM2 != null) {
    construccion = tarifas.derechoConstruccionPorM2 * casos.construccion.metrosCuadrados;
  } else if (
    tarifas.derechoConstruccionAlicuota != null &&
    casos.construccion.costoReferenciaPorM2 != null
  ) {
    construccion =
      (tarifas.derechoConstruccionAlicuota / 100) *
      casos.construccion.costoReferenciaPorM2 *
      casos.construccion.metrosCuadrados;
  }

  return { vivienda, comercio, rural, construccion };
}

// ─────────────────────────────────────────
// Helpers de SourcedValue
// ─────────────────────────────────────────

function buildSource(
  url: string,
  formato: string,
  fechaAcceso: string,
  fechaPublicacion: string | null
): DataPointSource {
  return {
    capa: SourceLayer.MUNICIPAL,
    organismo: "PORTAL_MUNICIPAL",
    url,
    formato,
    fechaAcceso,
    fechaPublicacion,
  };
}

function buildConfianza(
  nivel: ConfidenceLevel,
  notas: string | null
): DataPointConfidence {
  return { nivel, notas, validadoContra: null };
}

function wrap(
  valor: number | null,
  url: string,
  formato: string,
  fechaAcceso: string,
  fechaPublicacion: string | null,
  nivel: ConfidenceLevel,
  notaSiNull: string
): SourcedValue<number> {
  if (valor == null) {
    return {
      valor: null,
      fuente: buildSource(url, formato, fechaAcceso, fechaPublicacion),
      confianza: buildConfianza(ConfidenceLevel.ESTIMACION, notaSiNull),
    };
  }
  return {
    valor: Math.round(valor),
    fuente: buildSource(url, formato, fechaAcceso, fechaPublicacion),
    confianza: buildConfianza(nivel, null),
  };
}

function buildResult(
  rawText: string,
  formato: string,
  opt: ParseOptions,
  extraWarnings: string[] = []
): OrdenanzaImpositivaParseResult {
  const text = normalizeText(rawText);
  const tarifas = extractTarifas(text);
  const anioFiscal = extractAnioFiscal(text);
  const montos = computeMontosFromTarifas(tarifas, opt.casos ?? CASOS_TESTIGO_DEFAULT);
  const nivel = opt.confianza ?? ConfidenceLevel.MEDIA;
  const fechaAcceso = opt.fechaAcceso ?? new Date().toISOString().slice(0, 10);
  const fechaPub = opt.fechaPublicacion ?? null;

  const warnings = [...extraWarnings];
  if (tarifas.tsgPorMil == null) warnings.push("No se encontró alícuota TSG/ABL en la ordenanza");
  if (tarifas.tishPorciento == null) warnings.push("No se encontró alícuota TISH en la ordenanza");
  if (tarifas.tasaVialRuralPorHa == null) warnings.push("No se encontró Tasa Vial Rural en la ordenanza");
  // Sprint 13: la warning de Construcción se emite sólo si NINGUNA de las dos
  // rutas (importe $/m² o alícuota sobre obra) fue detectada.
  if (tarifas.derechoConstruccionPorM2 == null && tarifas.derechoConstruccionAlicuota == null) {
    warnings.push("No se encontró Derecho de Construcción en la ordenanza");
  }

  const success = Object.values(tarifas).some((v) => v != null);

  return {
    success,
    anioFiscal,
    tarifas,
    montoVivienda: wrap(montos.vivienda, opt.url, formato, fechaAcceso, fechaPub, nivel, "TSG no detectada"),
    montoComercio: wrap(montos.comercio, opt.url, formato, fechaAcceso, fechaPub, nivel, "TISH no detectada"),
    montoRural: wrap(montos.rural, opt.url, formato, fechaAcceso, fechaPub, nivel, "Tasa Vial Rural no detectada"),
    montoConstruccion: wrap(
      montos.construccion,
      opt.url,
      formato,
      fechaAcceso,
      fechaPub,
      nivel,
      "Derecho de Construcción no detectado"
    ),
    warnings,
    rawText: text,
  };
}

// ─────────────────────────────────────────
// Entry points públicos
// ─────────────────────────────────────────

/**
 * Parsea una ordenanza impositiva desde HTML.
 * Usa cheerio para extraer texto plano, limpiando scripts/estilos, y luego
 * aplica el extractor de tarifas. La estructura de tablas se preserva como
 * saltos de línea: cheerio.text() ya lo hace razonablemente bien.
 */
export function parseOrdenanzaImpositivaFromHtml(
  html: string,
  opt: ParseOptions
): OrdenanzaImpositivaParseResult {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const text = $("body").length ? $("body").text() : $.root().text();
  return buildResult(text, "HTML", { ...opt, confianza: opt.confianza ?? ConfidenceLevel.MEDIA });
}

/**
 * Parsea una ordenanza impositiva desde un PDF nativo (con capa de texto).
 * Si el PDF devuelve texto vacío (típico de escaneados), intenta OCR si se
 * pasa un backend; si no, retorna success=false con una warning.
 */
export async function parseOrdenanzaImpositivaFromPdf(
  buffer: Buffer,
  opt: ParseOptions & { ocr?: OcrBackend }
): Promise<OrdenanzaImpositivaParseResult> {
  const result = await extractTextFromPdf(buffer).catch((e) => ({
    text: "",
    numpages: 0,
    __err: e instanceof Error ? e.message : String(e),
  }));
  let rawText = result.text ?? "";
  const extraWarnings: string[] = [];
  let confianza = opt.confianza ?? ConfidenceLevel.MEDIA;
  let formato = "PDF";

  const looksScanned = rawText.trim().length < 200;
  if (looksScanned) {
    if (opt.ocr) {
      try {
        rawText = await opt.ocr.extractText(buffer);
        confianza = ConfidenceLevel.BAJA;
        formato = "PDF (OCR)";
        extraWarnings.push("PDF sin capa de texto — se usó OCR. Confianza baja.");
      } catch (e) {
        extraWarnings.push(
          `PDF sin capa de texto y OCR falló: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    } else {
      extraWarnings.push(
        "PDF parece escaneado (texto <200 chars) y no se proveyó OCR backend. No se pudieron extraer tarifas."
      );
    }
  }

  return buildResult(rawText, formato, { ...opt, confianza }, extraWarnings);
}

/**
 * Convenience: descarga la URL (HTML o PDF según Content-Type) y parsea.
 * No se expone en el index del package por ahora — la ingestión decide
 * cómo orquestar la descarga (timeouts, caché, rate limit).
 *
 * Sprint 8: muchos portales municipales responden lento/intermitente (9/29
 * "aborted" en el batch Sprint 7). Agregamos retry con backoff exponencial
 * y timeout más generoso por intento.
 */
export async function parseOrdenanzaImpositivaFromUrl(
  url: string,
  opt: Omit<ParseOptions, "url"> & {
    ocr?: OcrBackend;
    /** Intentos adicionales tras el primer fetch fallido. Default: 2 (total 3). */
    retries?: number;
    /** Timeout por intento en ms. Default: 60_000. */
    timeoutMs?: number;
  } = {}
): Promise<OrdenanzaImpositivaParseResult> {
  const retries = opt.retries ?? 2;
  const timeoutMs = opt.timeoutMs ?? 60_000;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "RadarMunicipal/1.0 (transparencia@radarmunicipal.ar)" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const contentType = response.headers.get("content-type") ?? "";
      const bytes = Buffer.from(await response.arrayBuffer());
      const baseOpt: ParseOptions = { ...opt, url };

      if (contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
        return await parseOrdenanzaImpositivaFromPdf(bytes, { ...baseOpt, ocr: opt.ocr });
      }
      return parseOrdenanzaImpositivaFromHtml(bytes.toString("utf-8"), baseOpt);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        // backoff exponencial: 1s, 3s, 9s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(3, attempt)));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`fetch failed after ${retries + 1} attempts: ${String(lastErr)}`);
}
