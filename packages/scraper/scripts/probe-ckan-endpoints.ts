/**
 * Sprint 15 — discovery probe.
 *
 * Antes de comprometernos con un parser de contrataciones, validamos que los
 * portales CKAN/Junar conocidos efectivamente exponen datasets de
 * licitaciones / compras / contrataciones. La lección de Sprint 13 (SIBOM
 * dead-end) fue: probar antes de codear, así no escribimos un parser sobre
 * un schema imaginario.
 *
 * Para cada endpoint candidato:
 *  1. Probar `/api/3/action/package_search?q=<keyword>` (CKAN action API).
 *  2. Si responde, listar los primeros datasets matcheados y sus recursos
 *     (formato + URL).
 *  3. Distinguir los datasets que parecen "lista de contrataciones tabulares"
 *     (CSV/JSON/XLSX) vs. los que son páginas estáticas o PDF.
 *
 * Output: stdout legible. NO escribe a disco. Uso:
 *   pnpm exec tsx scripts/probe-ckan-endpoints.ts
 */

interface CkanResource {
  id: string;
  name: string | null;
  format: string | null;
  url: string | null;
  description: string | null;
}

interface CkanDataset {
  id: string;
  name: string;
  title: string;
  organization?: { title?: string } | null;
  resources: CkanResource[];
  num_resources: number;
  metadata_modified: string;
}

interface CkanResponse {
  success: boolean;
  result: {
    count: number;
    results: CkanDataset[];
  };
  error?: { message?: string };
}

interface Endpoint {
  /** Etiqueta para el log */
  label: string;
  /** INDEC id si aplica */
  municipioId: string | null;
  /** Base URL sin trailing slash */
  base: string;
  /** Si es CKAN, asumimos `/api/3/action/package_search`. Junar tiene otra API. */
  kind: "CKAN" | "JUNAR";
}

// Endpoints conocidos por inspección de auto-audit.json + plan estratégico.
// La lista es chica a propósito: Sprint 15 es discovery + 1 ingest mínimo,
// no batch crawl.
const ENDPOINTS: Endpoint[] = [
  { label: "Bahía Blanca",      municipioId: "060056", base: "https://datosabiertos.bahia.gob.ar", kind: "CKAN" },
  { label: "Vicente López",     municipioId: "060861", base: "https://datos.vicentelopez.gov.ar",  kind: "JUNAR" },
  { label: "Tandil",            municipioId: "060791", base: "https://datos.tandil.gov.ar",         kind: "CKAN" },
  { label: "Avellaneda",        municipioId: "060035", base: "https://datos.avellaneda.gob.ar",     kind: "CKAN" },
  { label: "Pergamino",         municipioId: "060623", base: "https://datosabiertos.pergamino.gob.ar", kind: "CKAN" },
  { label: "Quilmes",           municipioId: "060658", base: "http://datos.quilmes.gov.ar",          kind: "CKAN" },
];

const QUERIES = ["licitaciones", "contrataciones", "compras", "adjudicaciones"];

const FETCH_TIMEOUT_MS = 15_000;

async function fetchJsonWithTimeout(url: string): Promise<unknown> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: {
        "User-Agent": "RadarMunicipal/0.1 (probe)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) {
      throw new Error(`content-type=${ct} (not JSON)`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function probeCkan(ep: Endpoint, q: string): Promise<{ ok: true; payload: CkanResponse } | { ok: false; error: string }> {
  const url = `${ep.base}/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=3`;
  try {
    const j = (await fetchJsonWithTimeout(url)) as CkanResponse;
    if (!j?.success) return { ok: false, error: `CKAN returned success=false: ${j?.error?.message ?? "?"}` };
    return { ok: true, payload: j };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function probeJunar(ep: Endpoint, q: string): Promise<{ ok: boolean; error?: string; rows?: number }> {
  // Junar no tiene un equivalente directo a CKAN package_search. Hace falta
  // API key normalmente. Para discovery, sólo verificamos que la home de
  // datos responda (HEAD) — no parseamos datasets en este sprint.
  const url = `${ep.base}/api/v2/datasets/?q=${encodeURIComponent(q)}`;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "RadarMunicipal/0.1 (probe)" } });
    clearTimeout(t);
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: `Junar requires API key (HTTP ${res.status})` };
    }
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function summarizeDataset(d: CkanDataset): string {
  const parsableFormats = new Set(["CSV", "JSON", "XLSX", "XLS"]);
  const parsable = d.resources.filter((r) => parsableFormats.has((r.format ?? "").toUpperCase()));
  const formats = Array.from(new Set(d.resources.map((r) => (r.format ?? "?").toUpperCase()))).join(",");
  const parseTag = parsable.length > 0 ? `✓parseable(${parsable.length}/${d.resources.length})` : "✗no-tabular";
  return `    · "${d.title}" [${formats}] ${parseTag}\n      mod=${d.metadata_modified.slice(0, 10)} resources=${d.num_resources}`;
}

async function main() {
  console.log(`🔎 Sprint 15 — Probe de endpoints CKAN/Junar (queries: ${QUERIES.join(", ")})`);
  console.log(`   timeout por request: ${FETCH_TIMEOUT_MS}ms\n`);

  const summary: { endpoint: string; reachable: boolean; bestQuery: string | null; bestCount: number; bestParseable: number; note: string }[] = [];

  for (const ep of ENDPOINTS) {
    console.log(`━━━ ${ep.label} (${ep.municipioId ?? "—"}) — ${ep.kind} ${ep.base}`);

    if (ep.kind === "JUNAR") {
      const r = await probeJunar(ep, "compras");
      if (!r.ok) {
        console.log(`  ✗ ${r.error}\n`);
        summary.push({ endpoint: ep.label, reachable: false, bestQuery: null, bestCount: 0, bestParseable: 0, note: r.error ?? "" });
        continue;
      }
      console.log(`  (Junar reachable, datasets API requiere keys — saltamos detalle)\n`);
      summary.push({ endpoint: ep.label, reachable: true, bestQuery: null, bestCount: -1, bestParseable: 0, note: "Junar API reachable; integration requires key" });
      continue;
    }

    let bestQ: string | null = null;
    let bestCount = -1;
    let bestParseable = 0;
    let lastErr = "";
    let reachable = false;
    for (const q of QUERIES) {
      const r = await probeCkan(ep, q);
      if (!r.ok) {
        lastErr = r.error;
        continue;
      }
      reachable = true;
      const datasets = r.payload.result.results ?? [];
      const parsableCount = datasets.reduce((s, d) => {
        const has = d.resources.some((res) =>
          ["CSV", "JSON", "XLSX", "XLS"].includes((res.format ?? "").toUpperCase())
        );
        return s + (has ? 1 : 0);
      }, 0);
      console.log(`  ?q=${q.padEnd(15)} count=${r.payload.result.count} parseable=${parsableCount}/${datasets.length}`);
      for (const d of datasets) console.log(summarizeDataset(d));

      if (r.payload.result.count > bestCount) {
        bestCount = r.payload.result.count;
        bestQ = q;
        bestParseable = parsableCount;
      }
    }
    if (!reachable) {
      console.log(`  ✗ ningún query funcionó. último error: ${lastErr}`);
    }
    console.log("");
    summary.push({
      endpoint: ep.label,
      reachable,
      bestQuery: bestQ,
      bestCount,
      bestParseable,
      note: reachable ? "" : lastErr,
    });
  }

  console.log("\n━━━ Resumen final ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("| Endpoint           | Reach | bestQ           | count | parseable | nota |");
  console.log("|--------------------|-------|-----------------|-------|-----------|------|");
  for (const s of summary) {
    console.log(
      `| ${s.endpoint.padEnd(18)} | ${s.reachable ? "✓" : "✗"}     | ${(s.bestQuery ?? "—").padEnd(15)} | ${String(s.bestCount).padStart(5)} | ${String(s.bestParseable).padStart(9)} | ${s.note.slice(0, 50)} |`,
    );
  }
}

void main();
