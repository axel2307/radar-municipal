/**
 * Clasificador de contenido de ordenanzas municipales.
 *
 * Distingue entre dos tipos de documentos que el crawler suele agrupar bajo
 * `ORDENANZA_FISCAL`:
 *
 *   - **IMPOSITIVA** (también llamada "tarifaria"): publica las alícuotas,
 *     montos y bases imponibles del año. Contiene tablas de tarifas, `%`,
 *     `por mil`, `$/m²`, `$/ha`. Es la que le importa al parser de tarifas.
 *
 *   - **FISCAL** (también llamada "código fiscal / tributario"): define el
 *     procedimiento administrativo, infracciones, prescripción, domicilio
 *     fiscal, recursos. Es un texto normativo procedural — no tiene tarifas
 *     concretas. Parsear tarifas acá siempre falla.
 *
 * El classifier es una función pura que opera sobre texto plano. No hace I/O.
 * Se usa:
 *   1. Para ordenar candidatos en `ingest-crawl-to-audit` cuando hay múltiples
 *      documentos ORDENANZA_FISCAL y la URL regex no alcanza a desambiguar.
 *   2. Para emitir una warning accionable en batch-parse cuando el parser
 *      no encontró tarifas pero el contenido es claramente FISCAL procedural
 *      ("este documento parece ser Código Fiscal — buscar Ordenanza
 *      Impositiva/Tarifaria separada").
 *
 * El approach es heurístico por diseño: contamos señales de cada tipo,
 * normalizamos por longitud y devolvemos un score ∈ [-1, 1]. El umbral de
 * clasificación es deliberadamente conservador (±0.15) — preferimos
 * `UNKNOWN` a una clasificación confundida.
 */

export type OrdenanzaKind = "IMPOSITIVA" | "FISCAL" | "UNKNOWN";

export interface ClassificationSignals {
  /** Cuenta cruda de hits pro-IMPOSITIVA */
  positiveHits: Record<string, number>;
  /** Cuenta cruda de hits pro-FISCAL */
  negativeHits: Record<string, number>;
  /** Densidad de $ o % por cada 1000 chars (señal de tablas tarifarias) */
  monetaryDensity: number;
  /** Longitud del texto normalizado usado (chars) */
  textLength: number;
}

export interface ClassificationResult {
  /** Score en [-1, +1]. +1 = seguro IMPOSITIVA. -1 = seguro FISCAL. */
  score: number;
  /** Clasificación discreta basada en umbrales. */
  kind: OrdenanzaKind;
  /** Detalle de señales encontradas (útil para debugging y reportes). */
  signals: ClassificationSignals;
}

// ─────────────────────────────────────────
// Señales
// ─────────────────────────────────────────

/**
 * Cada señal tiene:
 *   - pattern: regex global case-insensitive (debe tener flag `g`).
 *   - weight: peso del hit. Positivo = pro-IMPOSITIVA; negativo = pro-FISCAL.
 *
 * Los pesos están calibrados para que un documento típico de cada clase
 * acumule ~5-15 puntos (antes de normalizar). Cambios suaves; evitamos pesos
 * extremos porque un PDF con extracción rota puede generar falsas señales.
 */
interface Signal {
  name: string;
  pattern: RegExp;
  weight: number;
}

const POSITIVE_SIGNALS: Signal[] = [
  // Las 3 señales más fuertes: sólo aparecen en ordenanzas impositivas reales.
  { name: "por_mil", pattern: /\bpor\s+mil\b/gi, weight: 3 },
  { name: "alicuota", pattern: /\bal[ií]cuota/gi, weight: 1 },
  { name: "valuacion_fiscal", pattern: /\bvaluaci[oó]n\s+(?:fiscal|municipal)/gi, weight: 2 },

  // Vocabulario específico de tarifas.
  { name: "tsg", pattern: /\btsg\b/gi, weight: 2 },
  { name: "tish", pattern: /\btish\b/gi, weight: 2 },
  { name: "tasa_servicios_generales", pattern: /tasa[\s\S]{0,30}servicios\s+generales/gi, weight: 2 },
  { name: "tasa_servicios_urbanos", pattern: /tasa[\s\S]{0,30}servicios\s+urbanos/gi, weight: 2 },
  { name: "seguridad_e_higiene", pattern: /seguridad\s+e\s+higiene/gi, weight: 1 },
  { name: "derecho_construccion", pattern: /derecho[s]?\s+de\s+(?:construcci[oó]n|edificaci[oó]n)/gi, weight: 1 },
  { name: "tasa_vial_rural", pattern: /tasa\s+vial\s+rural|red\s+vial\s+rural/gi, weight: 2 },
  { name: "por_metro_lineal", pattern: /por\s+metro\s+lineal/gi, weight: 1 },

  // Títulos canónicos.
  { name: "titulo_impositiva", pattern: /ordenanza\s+(?:impositiva|tarifaria)/gi, weight: 2 },
  { name: "titulo_ejercicio", pattern: /ejercicio\s+fiscal\s+\d{4}/gi, weight: 1 },
];

const NEGATIVE_SIGNALS: Signal[] = [
  // Vocabulario específico de código fiscal procedural.
  { name: "domicilio_fiscal", pattern: /domicilio\s+fiscal/gi, weight: 2 },
  { name: "responsable_solidario", pattern: /responsab(?:le|ilidad)\s+solidari/gi, weight: 2 },
  { name: "prescripcion", pattern: /\bprescripci[oó]n\b/gi, weight: 1 },
  { name: "infracciones", pattern: /\binfracciones?\b/gi, weight: 1 },
  { name: "procedimiento_determinacion", pattern: /procedimiento\s+de\s+determinaci[oó]n/gi, weight: 2 },
  { name: "recurso_reconsideracion", pattern: /recurso\s+de\s+reconsideraci[oó]n/gi, weight: 2 },
  { name: "juez_administrativo", pattern: /juez\s+administrativo/gi, weight: 2 },
  { name: "contribuyente_responsable", pattern: /contribuyentes?\s+y\s+responsables?/gi, weight: 1 },
  { name: "hecho_imponible", pattern: /hecho\s+imponible/gi, weight: 1 },
  { name: "declaraciones_juradas", pattern: /declaraciones?\s+juradas?/gi, weight: 1 },
  { name: "apremio_judicial", pattern: /juicio\s+de\s+apremio/gi, weight: 2 },

  // Títulos canónicos del código.
  { name: "titulo_fiscal", pattern: /c[oó]digo\s+(?:fiscal|tributario)/gi, weight: 2 },
  { name: "titulo_parte_fiscal", pattern: /parte\s+fiscal/gi, weight: 1 },
];

// ─────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────

function countMatches(text: string, re: RegExp): number {
  // `g` flag es obligatoria; matchAll lanzaría. Validamos silenciosamente.
  if (!re.flags.includes("g")) {
    return (text.match(new RegExp(re.source, re.flags + "g")) ?? []).length;
  }
  return (text.match(re) ?? []).length;
}

/**
 * Densidad monetaria: cuántos símbolos $ o números con $ aparecen por cada
 * 1000 chars. Los documentos impositivos tienen densidad >10/1000, los
 * códigos fiscales típicamente <2/1000.
 */
function computeMonetaryDensity(text: string): number {
  // Contamos $ (peso símbolo) y patrones "$ 1.234" / "1.234,00".
  const dollarHits = countMatches(text, /\$/g);
  const percentHits = countMatches(text, /\d+(?:[.,]\d+)?\s*%/g);
  return ((dollarHits + percentHits) * 1000) / Math.max(text.length, 1);
}

export function classifyOrdenanzaContent(rawText: string): ClassificationResult {
  // Trabajamos sobre los primeros ~30k chars para acotar tiempo + ruido.
  // Ordenanzas típicas cabezas con tarifas en las primeras 20k chars; los
  // códigos fiscales largos suelen tener su "TOC + procedimientos" allí
  // también — tomar sólo el prefijo es una muestra representativa.
  const text = rawText.slice(0, 30_000);

  const positiveHits: Record<string, number> = {};
  let positiveScore = 0;
  for (const sig of POSITIVE_SIGNALS) {
    const count = countMatches(text, sig.pattern);
    if (count > 0) {
      positiveHits[sig.name] = count;
      positiveScore += Math.min(count, 5) * sig.weight;
    }
  }

  const negativeHits: Record<string, number> = {};
  let negativeScore = 0;
  for (const sig of NEGATIVE_SIGNALS) {
    const count = countMatches(text, sig.pattern);
    if (count > 0) {
      negativeHits[sig.name] = count;
      negativeScore += Math.min(count, 5) * sig.weight;
    }
  }

  const monetaryDensity = computeMonetaryDensity(text);
  // La densidad monetaria se suma al lado positivo cuando es alta (>5),
  // y resta cuando es muy baja en documentos largos (<1 sobre >10k chars).
  if (monetaryDensity >= 5) positiveScore += Math.min(monetaryDensity / 5, 3);
  else if (text.length > 10_000 && monetaryDensity < 1) negativeScore += 2;

  // Normalizar a [-1, +1]. La escala empírica: score absoluto >20 satura a 1.
  const raw = positiveScore - negativeScore;
  const normalized = Math.max(-1, Math.min(1, raw / 20));

  let kind: OrdenanzaKind;
  if (normalized >= 0.15) kind = "IMPOSITIVA";
  else if (normalized <= -0.15) kind = "FISCAL";
  else kind = "UNKNOWN";

  return {
    score: Number(normalized.toFixed(3)),
    kind,
    signals: {
      positiveHits,
      negativeHits,
      monetaryDensity: Number(monetaryDensity.toFixed(2)),
      textLength: text.length,
    },
  };
}
