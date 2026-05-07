import { chromium, type Browser, type Page } from "playwright";
import { DocumentCategory, DocumentFormat } from "@radar-municipal/core";
import type {
  CrawlTarget,
  CrawlOptions,
  CrawlResult,
  DetectedDocument,
  AccessibilityResult,
} from "../types";
import { DEFAULT_CRAWL_OPTIONS } from "../types";
import { detectPdfParseable } from "../parsers/pdf-detector";

// ─────────────────────────────────────────
// Patrones de detección
// ─────────────────────────────────────────

/** Palabras clave para detectar secciones de transparencia */
const TRANSPARENCY_KEYWORDS = [
  "transparencia",
  "gobierno abierto",
  "datos abiertos",
  "rendición de cuentas",
  "accountability",
  "open data",
  "presupuesto",
  "información pública",
];

/** Patrones para detectar menú de transparencia */
const MENU_PATTERNS = [
  /transparencia/i,
  /gobierno\s*abierto/i,
  /datos\s*abiertos/i,
  /rendici[oó]n/i,
];

/** Mapeo de palabras clave → categoría de documento */
const DOCUMENT_PATTERNS: {
  categoria: DocumentCategory;
  keywords: RegExp[];
  /** Peso de prioridad (más alto = más relevante) */
  priority: number;
}[] = [
  {
    categoria: DocumentCategory.PRESUPUESTO,
    keywords: [
      /presupuesto\s*(aprobado|vigente|general|municipal|\d{4})/i,
      /presupuesto\b/i,
      /ordenanza\s*de\s*presupuesto/i,
      /presupuesto\s*de\s*(gastos|recursos)/i,
    ],
    priority: 3,
  },
  {
    categoria: DocumentCategory.EJECUCION,
    keywords: [
      /ejecuci[oó]n\s*(presupuestaria|del\s*presupuesto)/i,
      /ejecuci[oó]n\s*(trimestral|\d)/i,
      /estado\s*de\s*ejecuci[oó]n/i,
      /planilla\s*de\s*ejecuci[oó]n/i,
    ],
    priority: 3,
  },
  {
    categoria: DocumentCategory.SEF,
    keywords: [
      /estado\s*de\s*ejecuci[oó]n\s*financier/i,
      /\bSEF\b/,
      /situaci[oó]n\s*econ[oó]mic/i,
      /estado\s*financiero/i,
    ],
    priority: 2,
  },
  {
    categoria: DocumentCategory.DEUDA,
    keywords: [
      /deuda\s*(p[uú]blica|municipal|flotante|consolidada)/i,
      /endeudamiento/i,
      /estado\s*de\s*(la\s*)?deuda/i,
    ],
    priority: 2,
  },
  {
    categoria: DocumentCategory.FINALIDAD_FUNCION,
    keywords: [
      /finalidad\s*(y|\/)\s*funci[oó]n/i,
      /gasto\s*por\s*finalidad/i,
      /clasificaci[oó]n\s*funcional/i,
      /por\s*finalidad/i,
    ],
    priority: 2,
  },
  {
    categoria: DocumentCategory.ORDENANZA_FISCAL,
    keywords: [
      /ordenanza\s*(fiscal|tributaria|impositiva)/i,
      /tarifaria/i,
      /c[oó]digo\s*fiscal/i,
    ],
    priority: 1,
  },
  {
    categoria: DocumentCategory.LICITACION,
    keywords: [
      /licitaci[oó]n/i,
      /compras\s*(y\s*contrataciones|p[uú]blicas)/i,
      /contrataciones/i,
      /concurso\s*de\s*precios/i,
    ],
    priority: 1,
  },
];

/** Extensiones → formato */
const FORMAT_MAP: Record<string, DocumentFormat> = {
  ".pdf": DocumentFormat.PDF,
  ".csv": DocumentFormat.CSV,
  ".xls": DocumentFormat.XLS,
  ".xlsx": DocumentFormat.XLS,
  ".json": DocumentFormat.JSON,
  ".html": DocumentFormat.HTML,
  ".htm": DocumentFormat.HTML,
};

// ─────────────────────────────────────────
// Crawler principal
// ─────────────────────────────────────────

export async function crawlTransparencyPortal(
  target: CrawlTarget,
  options?: CrawlOptions
): Promise<CrawlResult> {
  const opts = { ...DEFAULT_CRAWL_OPTIONS, ...options };
  const startTime = Date.now();
  const warnings: string[] = [];
  let browser: Browser | null = null;

  const result: CrawlResult = {
    municipioId: target.municipioId,
    nombre: target.nombre,
    fechaCrawl: new Date().toISOString(),
    duracionMs: 0,
    sitioOnline: false,
    error: null,
    accesibilidad: {
      urlPortal: null,
      portalAccesible: false,
      clicksDesdeHome: null,
      menuTransparenciaVisible: false,
      rutaNavegacion: [],
      urlsTransparencia: [],
    },
    documentos: [],
    paginasVisitadas: 0,
    warnings: [],
  };

  try {
    browser = await chromium.launch({ headless: opts.headless });
    const context = await browser.newContext({
      userAgent: opts.userAgent,
      locale: "es-AR",
      timezoneId: "America/Argentina/Buenos_Aires",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(opts.pageTimeout);

    // 1. Verificar que el sitio está online
    try {
      await page.goto(target.urlOficial, { waitUntil: "domcontentloaded" });
      result.sitioOnline = true;
      result.paginasVisitadas++;
    } catch (err) {
      result.error = `Sitio no accesible: ${(err as Error).message}`;
      result.duracionMs = Date.now() - startTime;
      return result;
    }

    // 2. Detectar menú de transparencia y accesibilidad
    result.accesibilidad = await detectAccessibility(
      page,
      target.urlOficial,
      opts
    );

    // 3. Navegar las URLs de transparencia y buscar documentos
    const urlsToScan = new Set<string>([
      target.urlOficial,
      ...result.accesibilidad.urlsTransparencia,
      ...(target.urlsConocidas ?? []),
    ]);

    const visitedUrls = new Set<string>();

    for (const url of urlsToScan) {
      if (visitedUrls.has(url)) continue;
      if (result.paginasVisitadas >= opts.maxPages) {
        warnings.push(
          `Límite de páginas alcanzado (${opts.maxPages})`
        );
        break;
      }

      try {
        visitedUrls.add(url);
        if (url !== target.urlOficial) {
          await page.goto(url, { waitUntil: "domcontentloaded" });
          result.paginasVisitadas++;
        }

        // Extraer documentos de la página
        const docs = await detectDocumentsOnPage(page, target.municipioId);
        result.documentos.push(...docs);

        // Descubrir más links — pass current page URL for broader subdomain discovery
        const currentPageUrl = page.url();
        const newLinks = await discoverRelevantLinks(page, target.urlOficial);
        // Also discover from current page's origin (handles subdomains)
        if (new URL(currentPageUrl).origin !== new URL(target.urlOficial).origin) {
          const subdomainLinks = await discoverRelevantLinks(page, currentPageUrl);
          for (const link of subdomainLinks) {
            newLinks.push(link);
          }
        }

        for (const link of newLinks) {
          if (!visitedUrls.has(link)) {
            urlsToScan.add(link);
          }
        }
      } catch (err) {
        warnings.push(`Error al escanear ${url}: ${(err as Error).message}`);
      }
    }

    // 4. Deduplicar documentos (mantener mayor confianza)
    result.documentos = deduplicateDocuments(result.documentos);

    // 5. Verificar PDFs (parseable check)
    for (const doc of result.documentos) {
      if (doc.formato === DocumentFormat.PDF && !doc.verificado) {
        try {
          const parseable = await detectPdfParseable(doc.url);
          doc.esParseable = parseable;
          doc.verificado = true;
        } catch {
          warnings.push(`No se pudo verificar PDF: ${doc.url}`);
        }
      }
    }
  } catch (err) {
    result.error = `Error de crawling: ${(err as Error).message}`;
  } finally {
    if (browser) await browser.close();
  }

  result.duracionMs = Date.now() - startTime;
  result.warnings = warnings;
  return result;
}

// ─────────────────────────────────────────
// Detección de accesibilidad
// ─────────────────────────────────────────

async function detectAccessibility(
  page: Page,
  baseUrl: string,
  opts: Required<CrawlOptions>
): Promise<AccessibilityResult> {
  const result: AccessibilityResult = {
    urlPortal: null,
    portalAccesible: true,
    clicksDesdeHome: null,
    menuTransparenciaVisible: false,
    rutaNavegacion: ["Home"],
    urlsTransparencia: [],
  };

  try {
    // Buscar links de transparencia en la navegación principal
    const navLinks = await page.evaluate(() => {
      const links: { text: string; href: string; isNav: boolean }[] = [];
      // Buscar en nav, header, menú principal
      const selectors = [
        "nav a",
        "header a",
        '[role="navigation"] a',
        ".menu a",
        ".navbar a",
        "#menu a",
        ".nav a",
        "#nav a",
      ];

      for (const selector of selectors) {
        document.querySelectorAll<HTMLAnchorElement>(selector).forEach((a) => {
          if (a.href && a.textContent?.trim()) {
            links.push({
              text: a.textContent.trim().toLowerCase(),
              href: a.href,
              isNav: true,
            });
          }
        });
      }

      // También buscar en todos los links de la página
      document.querySelectorAll<HTMLAnchorElement>("a").forEach((a) => {
        if (a.href && a.textContent?.trim()) {
          links.push({
            text: a.textContent.trim().toLowerCase(),
            href: a.href,
            isNav: false,
          });
        }
      });

      return links;
    });

    // Buscar links de transparencia
    for (const link of navLinks) {
      if (
        MENU_PATTERNS.some((p) => p.test(link.text)) ||
        TRANSPARENCY_KEYWORDS.some((kw) => link.text.includes(kw))
      ) {
        if (link.isNav) {
          result.menuTransparenciaVisible = true;
        }

        // Normalizar URL
        try {
          const url = new URL(link.href, baseUrl).href;
          if (!result.urlsTransparencia.includes(url)) {
            result.urlsTransparencia.push(url);
          }
        } catch {
          // URL inválida, ignorar
        }
      }
    }

    // Determinar clicks hasta transparencia
    if (result.menuTransparenciaVisible && result.urlsTransparencia.length > 0) {
      result.clicksDesdeHome = 1; // Link directo en nav
      result.urlPortal = result.urlsTransparencia[0];
      result.rutaNavegacion.push("Transparencia");
    } else if (result.urlsTransparencia.length > 0) {
      // Encontramos link pero no en nav principal
      result.clicksDesdeHome = 2;
      result.urlPortal = result.urlsTransparencia[0];
      result.rutaNavegacion.push("...", "Transparencia");
    }

    // Si encontramos portal, navegar y buscar subsecciones
    if (result.urlPortal) {
      try {
        await page.goto(result.urlPortal, { waitUntil: "domcontentloaded" });

        // Buscar sublinks fiscales (podrían requerir un click más)
        const subLinks = await page.evaluate(() => {
          const links: { text: string; href: string }[] = [];
          document
            .querySelectorAll<HTMLAnchorElement>("a")
            .forEach((a) => {
              if (a.href && a.textContent?.trim()) {
                links.push({
                  text: a.textContent.trim().toLowerCase(),
                  href: a.href,
                });
              }
            });
          return links;
        });

        // Si hay subpáginas fiscales, sumar un click
        const fiscalKeywords = [
          /presupuesto/i,
          /ejecuci[oó]n/i,
          /fiscal/i,
          /financiero/i,
        ];
        const hasFiscalSubpage = subLinks.some((l) =>
          fiscalKeywords.some((kw) => kw.test(l.text))
        );
        if (hasFiscalSubpage && result.clicksDesdeHome === 1) {
          // Los datos están a 1 click del portal de transparencia = 2 desde home
          result.clicksDesdeHome = 2;
        }

        // Agregar URLs de subpáginas relevantes
        for (const link of subLinks) {
          if (
            TRANSPARENCY_KEYWORDS.some((kw) => link.text.includes(kw)) ||
            fiscalKeywords.some((kw) => kw.test(link.text))
          ) {
            try {
              const url = new URL(link.href, result.urlPortal).href;
              if (!result.urlsTransparencia.includes(url)) {
                result.urlsTransparencia.push(url);
              }
            } catch {
              // URL inválida
            }
          }
        }
      } catch {
        // No pudimos navegar al portal
      }
    }
  } catch (err) {
    result.portalAccesible = false;
  }

  return result;
}

// ─────────────────────────────────────────
// Detección de documentos en una página
// ─────────────────────────────────────────

async function detectDocumentsOnPage(
  page: Page,
  municipioId: string
): Promise<DetectedDocument[]> {
  const documents: DetectedDocument[] = [];

  // Extraer todos los links con contexto
  const pageLinks = await page.evaluate(() => {
    const results: {
      href: string;
      text: string;
      parentText: string;
      headingContext: string;
    }[] = [];

    document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
      const href = a.href;
      const text = a.textContent?.trim() ?? "";
      const parentText =
        a.closest("li,td,div,p,section")?.textContent?.trim().slice(0, 200) ??
        "";

      // Buscar heading más cercano
      let headingContext = "";
      let el: Element | null = a;
      while (el && !headingContext) {
        el = el.previousElementSibling;
        if (
          el &&
          /^H[1-6]$/i.test(el.tagName)
        ) {
          headingContext = el.textContent?.trim() ?? "";
        }
      }
      // También buscar en parent
      if (!headingContext) {
        const section = a.closest("section,article,div");
        const heading = section?.querySelector("h1,h2,h3,h4,h5,h6");
        headingContext = heading?.textContent?.trim() ?? "";
      }

      results.push({ href, text, parentText, headingContext });
    });

    return results;
  });

  for (const link of pageLinks) {
    const fullContext = `${link.text} ${link.parentText} ${link.headingContext}`;
    const formato = detectFormat(link.href);

    // Considerar links a archivos descargables, datasets CKAN, o páginas con keywords
    const isDownloadable = formato !== null;
    const isDatasetLink =
      link.href.includes("/dataset/") ||
      link.href.includes("/dataviews/") ||
      link.href.includes("/resource/") ||
      link.href.includes("/download");
    const isRelevantPage =
      !isDownloadable &&
      !isDatasetLink &&
      TRANSPARENCY_KEYWORDS.some((kw) =>
        fullContext.toLowerCase().includes(kw)
      );

    if (!isDownloadable && !isDatasetLink && !isRelevantPage) continue;

    // Detectar categoría por contexto
    for (const pattern of DOCUMENT_PATTERNS) {
      const matched = pattern.keywords.some((kw) => kw.test(fullContext));
      if (matched && (isDownloadable || isDatasetLink)) {
        const anioMatch = fullContext.match(/\b(20\d{2})\b/);
        const trimestreMatch = fullContext.match(
          /(\d)[°ºer]*\s*trim|trim[a-z]*\s*(\d)/i
        );

        // Para datasets CKAN, considerar formato HTML si no tiene extensión
        const effectiveFormato = formato ?? (isDatasetLink ? DocumentFormat.HTML : null);

        documents.push({
          categoria: pattern.categoria,
          url: link.href,
          formato: effectiveFormato,
          textoContexto: link.text.slice(0, 200),
          confianza: calculateConfidence(pattern, link.text, fullContext),
          verificado: false,
          tamanoBytes: null,
          esParseable:
            effectiveFormato === DocumentFormat.CSV ||
            effectiveFormato === DocumentFormat.XLS ||
            effectiveFormato === DocumentFormat.JSON ||
            effectiveFormato === DocumentFormat.HTML
              ? true
              : null,
          anioDetectado: anioMatch ? parseInt(anioMatch[1]) : null,
          trimestreDetectado: trimestreMatch
            ? parseInt(trimestreMatch[1] || trimestreMatch[2])
            : null,
        });
      }
    }
  }

  return documents;
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function detectFormat(url: string): DocumentFormat | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    for (const [ext, fmt] of Object.entries(FORMAT_MAP)) {
      if (pathname.endsWith(ext)) return fmt;
    }
  } catch {
    // URL inválida
  }
  return null;
}

function calculateConfidence(
  pattern: (typeof DOCUMENT_PATTERNS)[number],
  linkText: string,
  fullContext: string
): number {
  let confidence = 0.3; // Base

  // Más confianza si el link text matchea directamente
  if (pattern.keywords.some((kw) => kw.test(linkText))) {
    confidence += 0.4;
  }

  // Más confianza según prioridad del patrón
  confidence += pattern.priority * 0.05;

  // Más confianza si tiene año
  if (/\b20\d{2}\b/.test(fullContext)) {
    confidence += 0.1;
  }

  return Math.min(1, confidence);
}

async function discoverRelevantLinks(
  page: Page,
  baseUrl: string
): Promise<string[]> {
  const links = await page.evaluate(
    ({ base }) => {
      const results: string[] = [];
      const baseHost = new URL(base).hostname;
      // Extraer dominio base (e.g. "tandil.gov.ar" de "www.tandil.gov.ar")
      const baseParts = baseHost.split(".");
      const baseDomain =
        baseParts.length >= 2
          ? baseParts.slice(-3).join(".")  // e.g. tandil.gov.ar
          : baseHost;

      document
        .querySelectorAll<HTMLAnchorElement>("a[href]")
        .forEach((a) => {
          try {
            const url = new URL(a.href, base);
            const linkHost = url.hostname;
            const text = (a.textContent ?? "").toLowerCase();
            const href = url.href.toLowerCase();

            // Permitir: mismo dominio, subdominios (gobiernoabierto.tandil.gov.ar),
            // portales CKAN (datos.tandil.gov.ar), y plataformas conocidas
            const isSameDomain = linkHost.endsWith(baseDomain);
            const isKnownPlatform =
              linkHost.includes("opendata") ||
              linkHost.includes("junar") ||
              linkHost.includes("ckan") ||
              linkHost.includes("datos.") ||
              linkHost.includes("data.");

            if (!isSameDomain && !isKnownPlatform) return;

            const keywords = [
              "transparencia",
              "presupuesto",
              "ejecución",
              "ejecucion",
              "fiscal",
              "datos abiertos",
              "gobierno abierto",
              "datos-abiertos",
              "deuda",
              "finanzas",
              "hacienda",
              "contaduría",
              "contaduria",
              "informacion-presupuestaria",
              "informacion-financiera",
              "open-data",
              "opendata",
              "dataset",
              "rendicion",
            ];

            const matchesKeyword = keywords.some(
              (kw) => text.includes(kw) || href.includes(kw)
            );

            // Siempre incluir portales de datos abiertos y transparencia
            const isDataPortal =
              linkHost.startsWith("datos.") ||
              linkHost.includes("opendata") ||
              href.includes("/dataset/") ||
              href.includes("/transparencia");

            if (matchesKeyword || isDataPortal) {
              results.push(url.href);
            }
          } catch {
            // URL inválida
          }
        });
      return [...new Set(results)];
    },
    { base: baseUrl }
  );

  return links;
}

function deduplicateDocuments(docs: DetectedDocument[]): DetectedDocument[] {
  const seen = new Map<string, DetectedDocument>();

  for (const doc of docs) {
    const key = `${doc.categoria}:${doc.url}`;
    const existing = seen.get(key);
    if (!existing || doc.confianza > existing.confianza) {
      seen.set(key, doc);
    }
  }

  // También deduplicate by category (keep highest confidence per category)
  const byCategory = new Map<DocumentCategory, DetectedDocument[]>();
  for (const doc of seen.values()) {
    const list = byCategory.get(doc.categoria) ?? [];
    list.push(doc);
    byCategory.set(doc.categoria, list);
  }

  // Keep top 3 per category
  const result: DetectedDocument[] = [];
  for (const [, docs] of byCategory) {
    docs.sort((a, b) => b.confianza - a.confianza);
    result.push(...docs.slice(0, 3));
  }

  return result;
}
