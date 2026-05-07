/**
 * Buscador heurístico de URLs de Ordenanza Impositiva en HTML de portal.
 *
 * Contexto (Sprint 10): el ingestor regex-based promueve a `ORDENANZA_IMPOSITIVA`
 * cualquier URL que contenga "impositiv" o "tarifari". Esto falla cuando el
 * filename dice "Ordenanza Fiscal 2025" pero el contenido real es Código
 * Fiscal procedural. El classifier de Sprint 9 detectó 4 municipios en ese
 * estado (Cañuelas, Capitán Sarmiento, General Belgrano, General Villegas).
 *
 * Este módulo es la primera mitad del fix: dado el HTML del portal de uno
 * de esos municipios, extraer candidatos adicionales que *podrían* ser la
 * Ordenanza Impositiva real. Scoring por filename + anchor text. La segunda
 * mitad (verificar el candidato con `classifyOrdenanzaContent`) la hace el
 * CLI — este módulo es puro y testeable.
 *
 * Diseño:
 *   - Parseamos con regex (no cheerio) para mantenerlo liviano y portable
 *     a entornos sin DOM.
 *   - Extraemos `<a href="..."[>anchor text</a>` que apunte a documentos
 *     (PDF, DOC, HTML) del mismo dominio o subdominios.
 *   - Scoring (0-10) privilegia:
 *       + "impositiva" o "tarifaria" en anchor/href  → +5
 *       + Año reciente (2024, 2025, 2026) en filename → +2
 *       + "ordenanza" en anchor/href                  → +1
 *       + "tasas" o "tributaria" en contexto          → +1
 *     Y penaliza:
 *       - "fiscal" sin "impositiv/tarifari"           → −3 (señal de Código)
 *       - Año ≤ 2020 (probable obsoleto)              → −1
 *   - El score NO decide nada — es una heurística para rankear. La decisión
 *     final viene del classifier de contenido tras descargar el doc.
 */

export interface OrdenanzaCandidate {
  /** URL absoluta del documento candidato. */
  url: string;
  /** Texto del anchor (cuando existe) o filename. Para debugging/ranking. */
  anchorText: string;
  /** Score heurístico por filename + anchor. Rango aproximado [-4, +10]. */
  score: number;
  /** Razones individuales del score (p.ej. `["+5 impositiva", "+2 2025"]`). */
  reasons: string[];
}

const YEAR_CURRENT = [2024, 2025, 2026];

/**
 * Intenta resolver `href` contra `baseUrl`. Devuelve null si el href
 * es inválido o no-HTTP (mailto:, #anchor, javascript:).
 */
function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    const url = new URL(href, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Descompone una URL resuelta en filename sin extensión para matching.
 * Ejemplo: "https://x/docs/Ordenanza-Impositiva-2025.pdf" → "ordenanza-impositiva-2025"
 */
function filenameStem(url: string): string {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").pop() ?? "";
    return decodeURIComponent(base)
      .replace(/\.(pdf|docx?|html?|xlsx?)$/i, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Score individual de un candidato. Exportada para tests.
 */
export function scoreCandidate(
  anchorText: string,
  url: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const filename = filenameStem(url);
  const text = anchorText.toLowerCase();
  const haystack = `${text} ${filename} ${url.toLowerCase()}`;

  // Señales positivas
  if (/\b(impositiv[ao]s?|tarifari[ao]s?)\b/i.test(haystack)) {
    score += 5;
    reasons.push("+5 impositiva/tarifaria");
  }
  if (/\bordenanza/i.test(haystack)) {
    score += 1;
    reasons.push("+1 ordenanza");
  }
  if (/\b(tasas?|tributari[ao]s?)\b/i.test(haystack)) {
    score += 1;
    reasons.push("+1 tasa/tributaria");
  }

  // Año reciente en filename o anchor
  const yearMatch = haystack.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const y = Number(yearMatch[1]);
    if (YEAR_CURRENT.includes(y)) {
      score += 2;
      reasons.push(`+2 año ${y}`);
    } else if (y <= 2020) {
      score -= 1;
      reasons.push(`-1 año viejo ${y}`);
    }
  }

  // Señal negativa: "fiscal" sin "impositiv"/"tarifari" sugiere Código Fiscal.
  const hasFiscal = /\bfiscal(es)?\b/i.test(haystack);
  const hasImpositiva = /\b(impositiv[ao]s?|tarifari[ao]s?)\b/i.test(haystack);
  if (hasFiscal && !hasImpositiva) {
    score -= 3;
    reasons.push("-3 fiscal sin impositiva");
  }

  return { score, reasons };
}

/**
 * Heurística: ¿este href es un candidato a documento de ordenanza?
 * Descarta imágenes, CSS, JS. Acepta PDF, DOC(X), HTML sin extensión
 * que mencione "ordenanza" en URL o anchor.
 */
function looksLikeOrdenanzaDoc(url: string, anchorText: string): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerText = anchorText.toLowerCase();

  // Descartar assets
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|json|xml|woff2?|ttf)$/i.test(lowerUrl)) {
    return false;
  }

  // Nota: no usamos `\b` al final porque romperían matches de "impositiva"/"tarifaria"
  // (el siguiente char es una vocal, no un boundary).
  const hasOrdenanzaHint =
    /\b(ordenanza|impositiv|tarifari|tributari|c[óo]digo\s+fiscal)/i.test(
      `${lowerText} ${lowerUrl}`,
    );

  return hasOrdenanzaHint;
}

/**
 * Dado el HTML de una página + URL base, extraer todos los anchors que
 * apunten a documentos y mencionen "ordenanza" / "impositiva" / etc.
 *
 * Deduplica por URL absoluta. Devuelve ordenado por score descendente.
 */
export function extractOrdenanzaCandidates(
  html: string,
  baseUrl: string,
): OrdenanzaCandidate[] {
  // Regex de anchor: <a ... href="..."...>texto</a>
  // Captura href (group 1) y texto interno (group 2). Permitimos atributos
  // desordenados y multi-linea con [\s\S].
  const anchorRe = /<a\b([^>]*?)>([\s\S]*?)<\/a>/gi;
  const hrefRe = /\bhref\s*=\s*("([^"]*)"|'([^']*)')/i;

  const seen = new Map<string, OrdenanzaCandidate>();

  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null) {
    const attrs = m[1];
    const rawInner = m[2];
    const hrefMatch = attrs.match(hrefRe);
    if (!hrefMatch) continue;

    const href = (hrefMatch[2] ?? hrefMatch[3] ?? "").trim();
    if (!href) continue;

    const resolved = resolveUrl(href, baseUrl);
    if (!resolved) continue;

    // Normalizar anchor text: strip tags, collapse whitespace.
    const anchorText = rawInner
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!looksLikeOrdenanzaDoc(resolved, anchorText)) continue;

    const { score, reasons } = scoreCandidate(anchorText, resolved);

    const existing = seen.get(resolved);
    // Cuando una misma URL aparece múltiples veces (menú + cuerpo),
    // guardamos la instancia con mejor score — suele tener mejor anchor.
    if (!existing || score > existing.score) {
      seen.set(resolved, { url: resolved, anchorText, score, reasons });
    }
  }

  return [...seen.values()].sort((a, b) => b.score - a.score);
}
