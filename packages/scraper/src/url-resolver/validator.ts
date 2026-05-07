/**
 * Validador HTTP de URLs candidatas a portal municipal.
 *
 * Dos chequeos:
 *   1. La URL responde 200/301/302 con latencia razonable.
 *   2. El cuerpo de respuesta tiene marcadores de portal municipal:
 *      - palabras clave ("municipalidad", "intendente", "intendencia")
 *      - el nombre del municipio aparece en el HTML
 *
 * Combinando los dos chequeos podemos asignar un nivel de confianza.
 * El objetivo es minimizar falsos positivos: un dominio comprado por
 * un oportunista que solo contesta 200 no debe pasar el filtro.
 */

/**
 * Resultado de la validación de una URL.
 *
 * `confidence` es un score 0..1 basado en:
 *   - +0.4 si responde 200
 *   - +0.3 si contiene palabras municipales genéricas
 *   - +0.3 si el nombre del municipio aparece en el body
 *
 * Umbral recomendado para aceptar: ≥ 0.7.
 */
export interface ValidationResult {
  url: string;
  /** URL final (post-redirects) */
  finalUrl: string | null;
  ok: boolean;
  httpStatus: number | null;
  hasMunicipalKeywords: boolean;
  hasMunicipioName: boolean;
  confidence: number;
  /** Mensaje de error si la petición falló */
  error: string | null;
  latencyMs: number;
}

export interface ValidateOptions {
  /** Timeout total en ms (default 10s) */
  timeoutMs?: number;
  /** Nombre del municipio (para buscarlo en el body) */
  municipioNombre: string;
  /** Inyección opcional de fetch (para tests) */
  fetchImpl?: typeof fetch;
}

const KEYWORDS = [
  "municipalidad",
  "municipio",
  "intendente",
  "intendencia",
  "gobierno municipal",
];

/**
 * Normaliza texto para búsqueda insensible a acentos y case.
 */
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Decide si el body HTML parece corresponder a un municipio.
 * Función pura: testeable sin red.
 */
export function evaluateBody(
  body: string,
  municipioNombre: string,
): { hasMunicipalKeywords: boolean; hasMunicipioName: boolean } {
  const norm = normalizeForMatch(body);
  const nombreNorm = normalizeForMatch(municipioNombre);
  const hasMunicipalKeywords = KEYWORDS.some((k) => norm.includes(k));
  const hasMunicipioName = nombreNorm.length >= 4 && norm.includes(nombreNorm);
  return { hasMunicipalKeywords, hasMunicipioName };
}

/**
 * Calcula confidence 0..1 a partir de los flags.
 */
export function scoreConfidence(
  flags: {
    ok: boolean;
    hasMunicipalKeywords: boolean;
    hasMunicipioName: boolean;
  },
): number {
  // Invariante: si la URL no respondió, el contenido es irrelevante.
  // Los 3 chequeos se multiplican lógicamente: ok es prerrequisito.
  if (!flags.ok) return 0;
  let score = 0.4; // por responder 200
  if (flags.hasMunicipalKeywords) score += 0.3;
  if (flags.hasMunicipioName) score += 0.3;
  return Math.round(score * 100) / 100;
}

/**
 * Valida una URL candidata.
 * Hace UN solo GET con follow-redirects y lee el body completo (trunca a 100KB).
 * No hace HEAD por separado: muchos portales municipales responden 405 a HEAD.
 */
export async function validateUrl(
  url: string,
  opt: ValidateOptions,
): Promise<ValidationResult> {
  const fetchFn = opt.fetchImpl ?? fetch;
  const timeoutMs = opt.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const res = await fetchFn(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "RadarMunicipal/1.0 (resolver@radarmunicipal.ar)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    const latencyMs = Date.now() - start;
    const ok = res.status >= 200 && res.status < 400;

    if (!ok) {
      return {
        url,
        finalUrl: res.url || null,
        ok: false,
        httpStatus: res.status,
        hasMunicipalKeywords: false,
        hasMunicipioName: false,
        confidence: 0,
        error: `HTTP ${res.status}`,
        latencyMs,
      };
    }

    // Leer body trunco (los portales pueden ser MB); 100KB basta para detectar keywords.
    const raw = await res.text();
    const body = raw.length > 100_000 ? raw.slice(0, 100_000) : raw;
    const { hasMunicipalKeywords, hasMunicipioName } = evaluateBody(body, opt.municipioNombre);
    const confidence = scoreConfidence({ ok: true, hasMunicipalKeywords, hasMunicipioName });

    return {
      url,
      finalUrl: res.url || url,
      ok: true,
      httpStatus: res.status,
      hasMunicipalKeywords,
      hasMunicipioName,
      confidence,
      error: null,
      latencyMs,
    };
  } catch (e) {
    const latencyMs = Date.now() - start;
    return {
      url,
      finalUrl: null,
      ok: false,
      httpStatus: null,
      hasMunicipalKeywords: false,
      hasMunicipioName: false,
      confidence: 0,
      error: e instanceof Error ? e.message : String(e),
      latencyMs,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Prueba candidatas en orden y devuelve la primera que supera el umbral.
 * Si ninguna supera el umbral pero alguna respondió 200, devuelve la de mejor score.
 */
export async function findBestUrl(
  candidates: string[],
  opt: ValidateOptions & { threshold?: number },
): Promise<{
  selected: ValidationResult | null;
  attempted: ValidationResult[];
}> {
  const threshold = opt.threshold ?? 0.7;
  const attempted: ValidationResult[] = [];

  for (const url of candidates) {
    const result = await validateUrl(url, opt);
    attempted.push(result);
    if (result.confidence >= threshold) {
      return { selected: result, attempted };
    }
  }

  // Fallback: la mejor candidata que al menos respondió
  const okOnes = attempted.filter((r) => r.ok);
  okOnes.sort((a, b) => b.confidence - a.confidence);
  return { selected: okOnes[0] ?? null, attempted };
}
