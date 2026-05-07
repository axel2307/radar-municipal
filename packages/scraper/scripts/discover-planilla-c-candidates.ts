/**
 * Sprint 21 — Discovery extendido de candidatos Planilla C.
 *
 * Sprint 19 detectó 4 municipios con XLSX de Stock de Deuda. Sprint 20
 * los ingirió. Pero los crawls del Sprint 11 cubren 122 portales no-piloto;
 * muchos podrían tener Planilla C aunque su URL no sea obvia.
 *
 * Este script:
 *  1. Scanea `output/crawl-all-135-full/crawl-NNNNNN.json`
 *  2. Extrae todas las URLs `.xlsx` de cada partido
 *  3. Filtra por keywords en URL: stock, deuda, vencimiento, planilla,
 *     endeudamiento
 *  4. Para cada candidata: HEAD request → verificar reachability
 *  5. Para reachable: GET + intentar parsePlanillaC (sólo primeros bytes
 *     suficientes para validar header)
 *  6. Imprime lista sorted por municipio con: ID, label, URL, status
 *
 * Output: stdout legible. NO modifica refresh script — el operador
 * (Sprint 21 sigue siendo manual) decide qué URLs agregar.
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePlanillaC } from "../src/parsers/planilla-c-deuda.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CRAWL_DIR = resolve(__dirname, "..", "output", "crawl-all-135-full");

const KEYWORDS = /(stock|deuda|vencimiento|planilla|endeudamiento|pasivo)/i;
const FETCH_TIMEOUT = 20_000;

// URLs ya ingestadas en Sprint 20 — skip para no duplicar.
const ALREADY_INGESTED = new Set([
  "https://berisso.gob.ar/storage/pdfs/34803f0b-dfb6-495b-9c97-9e1bdf55b257.xlsx",
  "http://carmendeareco.gob.ar/wp-content/uploads/2025/10/STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-AL-30-09-2025-.xlsx",
  "http://carmendeareco.gob.ar/wp-content/uploads/2025/02/STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-AL-31-12-2024.xlsx",
  "https://www.lincoln.gob.ar/sites/default/files/stock_de_deuda_y_p_de_vtos_06-2022.xlsx",
  "https://www.lincoln.gob.ar/sites/default/files/stock_de_deuda_y_p_de_vtos_12-2021.xlsx",
  "https://ameghino.gob.ar/wp-content/uploads/2025/10/STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-Planilla-Modelo-30-09-2025.xlsx",
  "https://ameghino.gob.ar/wp-content/uploads/2025/08/STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-Planilla-Modelo-30-06-2025.xlsx",
]);

interface Candidate {
  municipioId: string;
  nombre: string;
  url: string;
}

interface ProbeResult {
  candidate: Candidate;
  status: "OK" | "HTTP_FAIL" | "PARSE_FAIL" | "TIMEOUT" | "ALREADY";
  detail?: string;
  /** Si OK, fecha del snapshot extraída. */
  fechaSnapshot?: string;
  /** Si OK, saldo total. */
  saldoTotal?: number;
}

/**
 * Extrae URLs `.xlsx` del JSON crudo. El crawler de Sprint 11 guarda
 * algunas URLs dentro de mensajes de error ("Error al escanear https://..."),
 * que son string-values JSON. `walkXlsx` puro no los encuentra; el regex
 * sobre el texto sí.
 */
function extractXlsxUrls(rawJson: string): string[] {
  const re = /https?:\/\/[^\s"\\']+\.xlsx/g;
  return [...new Set(rawJson.match(re) ?? [])];
}

function discoverCandidates(): Candidate[] {
  const out: Candidate[] = [];
  const files = readdirSync(CRAWL_DIR).filter((f) => /^crawl-\d+\.json$/.test(f));
  for (const f of files) {
    const raw = readFileSync(resolve(CRAWL_DIR, f), "utf-8");
    const data = JSON.parse(raw) as { municipioId: string; nombre: string };
    const urls = extractXlsxUrls(raw);
    for (const url of urls) {
      if (!KEYWORDS.test(url)) continue;
      out.push({ municipioId: data.municipioId, nombre: data.nombre ?? "?", url });
    }
  }
  // Dedup por URL (algunos crawls referencian la misma URL N veces).
  const seen = new Set<string>();
  return out.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

async function fetchBuffer(url: string): Promise<ArrayBuffer> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "RadarMunicipal/0.1 (discover)" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.arrayBuffer();
  } finally {
    clearTimeout(t);
  }
}

async function probeOne(c: Candidate): Promise<ProbeResult> {
  if (ALREADY_INGESTED.has(c.url)) {
    return { candidate: c, status: "ALREADY" };
  }
  let buf: ArrayBuffer;
  try {
    buf = await fetchBuffer(c.url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      candidate: c,
      status: msg.includes("abort") ? "TIMEOUT" : "HTTP_FAIL",
      detail: msg,
    };
  }
  const r = await parsePlanillaC(buf, {
    municipioId: c.municipioId,
    fuenteUrl: c.url,
  });
  if (!r.snapshot) {
    return {
      candidate: c,
      status: "PARSE_FAIL",
      detail: r.warnings.join("; "),
    };
  }
  return {
    candidate: c,
    status: "OK",
    fechaSnapshot: r.snapshot.fechaSnapshot,
    saldoTotal: r.snapshot.saldoTotal,
  };
}

async function main() {
  console.log("🔎 Sprint 21 — Discovery extendido Planilla C\n");
  const candidates = discoverCandidates();
  console.log(`📋 ${candidates.length} candidatos por keyword en URL\n`);

  const byMunicipio = new Map<string, ProbeResult[]>();
  for (const c of candidates) {
    process.stdout.write(`  ${c.municipioId} ${c.nombre.padEnd(28)} ... `);
    const r = await probeOne(c);
    const list = byMunicipio.get(c.municipioId) ?? [];
    list.push(r);
    byMunicipio.set(c.municipioId, list);
    if (r.status === "OK") {
      console.log(`✓ snap=${r.fechaSnapshot} $${Math.round(r.saldoTotal!).toLocaleString("es-AR")}`);
    } else {
      console.log(`✗ ${r.status} ${r.detail?.slice(0, 50) ?? ""}`);
    }
  }

  // Resumen ordenado por municipio
  console.log("\n━━━ Resumen ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Status legend: ✓ OK | ✗ HTTP/timeout | ⊘ already ingested | ! parse_fail");
  const allMunicipiosWithOk = new Set<string>();
  const sortedIds = [...byMunicipio.keys()].sort();
  for (const id of sortedIds) {
    const results = byMunicipio.get(id)!;
    const nombre = results[0].candidate.nombre;
    const okResults = results.filter((r) => r.status === "OK");
    if (okResults.length > 0) allMunicipiosWithOk.add(id);
    console.log(`\n${id} ${nombre}:`);
    for (const r of results) {
      const marker =
        r.status === "OK" ? "✓"
        : r.status === "ALREADY" ? "⊘"
        : r.status === "PARSE_FAIL" ? "!"
        : "✗";
      const tail = r.status === "OK"
        ? ` snap=${r.fechaSnapshot} $${Math.round(r.saldoTotal!).toLocaleString("es-AR")}`
        : ` ${r.detail?.slice(0, 60) ?? ""}`;
      console.log(`  ${marker} ${r.candidate.url}${tail}`);
    }
  }

  console.log(`\n🎯 ${allMunicipiosWithOk.size} municipios con al menos 1 URL OK (excluyendo ya ingestados):`);
  for (const id of allMunicipiosWithOk) {
    const r = byMunicipio.get(id)!;
    console.log(`   · ${id} ${r[0].candidate.nombre}`);
  }
}

void main();
