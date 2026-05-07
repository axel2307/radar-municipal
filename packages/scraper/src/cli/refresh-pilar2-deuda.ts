#!/usr/bin/env tsx
/**
 * Sprint 20 — Refresh orchestrator de Pilar 2 Stock de Deuda
 * (Planilla C, Ley 12462/13295 PBA).
 *
 * Hermano de `refresh-pilar4.ts` (Sprint 18). Mismo patrón:
 *  1. Descarga XLSX por municipio confirmado en Sprint 19.
 *  2. Llama `parsePlanillaC` con manejo de fallos por-fuente.
 *  3. Escribe directo a `packages/web/src/data/auto-deuda.json` y
 *     `auto-deuda-manifest.json`.
 *  4. Sprint 21+ podrá consumirlo desde el loader del web.
 *
 * Lista de municipios: confirmados en Sprint 19 sobre 4 portales.
 * Otros candidatos (Madariaga 3 archivos, Pergamino 2 archivos, etc.)
 * quedan para extender en futuros sprints — agregar acá la URL.
 *
 * Cron sugerido (alineado con Pilar 4):
 *   `0 4 1 * *`  — primer día de cada mes, 04:00 UTC.
 *   Comando:     `pnpm --filter @radar-municipal/scraper refresh:deuda`
 *
 * Idempotencia: orden estable por `(municipioId, fechaSnapshot desc)`.
 * Sólo cambia `parsedAt` y `manifest.refreshedAt` entre corridas si
 * los datos upstream son los mismos.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePlanillaC } from "../parsers/planilla-c-deuda";
import type {
  StockDeudaSnapshot,
  RefreshManifest,
} from "@radar-municipal/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FETCH_TIMEOUT_MS = 30_000;

// ─────────────────────────────────────────
// Fuentes confirmadas (Sprint 19)
// ─────────────────────────────────────────

interface FuenteDeuda {
  label: string;
  municipioId: string;
  /**
   * URLs de XLSX a parsear. Múltiples = snapshots de distintas fechas
   * (la más reciente gana en el dedup, pero conservamos todas en el
   * array final por si el frontend quiere series).
   */
  urls: string[];
}

const FUENTES: FuenteDeuda[] = [
  {
    label: "Berisso",
    municipioId: "060098",
    urls: [
      // Sprint 19 detectó 12 UUIDs sin Content-Disposition; tomamos uno
      // confirmado. El resto pueden agregarse cuando se tenga mapeo
      // UUID → fecha.
      "https://berisso.gob.ar/storage/pdfs/34803f0b-dfb6-495b-9c97-9e1bdf55b257.xlsx",
    ],
  },
  {
    label: "Carmen de Areco",
    municipioId: "060154",
    urls: [
      "http://carmendeareco.gob.ar/wp-content/uploads/2025/10/STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-AL-30-09-2025-.xlsx",
      "http://carmendeareco.gob.ar/wp-content/uploads/2025/02/STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-AL-31-12-2024.xlsx",
      // Sprint 21 — descubierto por discover-planilla-c-candidates.
      "https://carmendeareco.gob.ar/wp-content/uploads/2024/10/03.01-STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-Planilla-Modelo-30-9-2024.xlsx",
      // Sprint 23 — recuperadas con extractFechaFromUrl (filename fallback).
      "https://carmendeareco.gob.ar/wp-content/uploads/2024/10/03.01-STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-Planilla-Modelo-30-6-2024.xlsx",
      "https://carmendeareco.gob.ar/wp-content/uploads/2024/10/03.01-STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-Planilla-Modelo-30-6-2020.xlsx",
    ],
  },
  {
    // Sprint 21 — descubierto por discover-planilla-c-candidates.
    // 3 snapshots Q3 2021, Q1 2022, Q2 2022.
    label: "General Juan Madariaga",
    municipioId: "060308",
    urls: [
      "https://www.madariaga.gob.ar/uploads_archivos/rendicion_de_cuentas/stock_deuda_30-06-22.xlsx",
      "https://www.madariaga.gob.ar/uploads_archivos/rendicion_de_cuentas/stock_deuda_31-03-2022.xlsx",
      "https://www.madariaga.gob.ar/uploads_archivos/rendicion_de_cuentas/registro_endeudamiento_30-09-2021a.xlsx",
    ],
  },
  {
    label: "Lincoln",
    municipioId: "060462",
    urls: [
      "https://www.lincoln.gob.ar/sites/default/files/stock_de_deuda_y_p_de_vtos_06-2022.xlsx",
      "https://www.lincoln.gob.ar/sites/default/files/stock_de_deuda_y_p_de_vtos_12-2021.xlsx",
    ],
  },
  {
    label: "Florentino Ameghino",
    municipioId: "060274",
    urls: [
      "https://ameghino.gob.ar/wp-content/uploads/2025/10/STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-Planilla-Modelo-30-09-2025.xlsx",
      "https://ameghino.gob.ar/wp-content/uploads/2025/08/STOCK-DE-DEUDA-Y-PERFIL-DE-VENCIMIENTOS-Planilla-Modelo-30-06-2025.xlsx",
    ],
  },
];

// ─────────────────────────────────────────
// HTTP
// ─────────────────────────────────────────

async function fetchBuffer(url: string): Promise<ArrayBuffer> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "RadarMunicipal/0.1 (refresh)" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.arrayBuffer();
  } finally {
    clearTimeout(t);
  }
}

// ─────────────────────────────────────────
// Pipeline
// ─────────────────────────────────────────

interface FuenteResult {
  label: string;
  municipioId: string;
  datasetsParseados: number;
  snapshots: StockDeudaSnapshot[];
}

async function refreshFuente(f: FuenteDeuda): Promise<FuenteResult> {
  console.log(`📡 ${f.label} (${f.municipioId}) — ${f.urls.length} XLSX`);
  const snapshots: StockDeudaSnapshot[] = [];
  let datasetsParseados = 0;
  for (const url of f.urls) {
    console.log(`   ↓ ${url.slice(-60)}`);
    let buf: ArrayBuffer;
    try {
      buf = await fetchBuffer(url);
    } catch (e) {
      console.log(`     ✗ ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const r = await parsePlanillaC(buf, {
      municipioId: f.municipioId,
      fuenteUrl: url,
    });
    if (r.snapshot) {
      console.log(
        `     ✓ snapshot ${r.snapshot.fechaSnapshot} | saldo=$${Math.round(
          r.snapshot.saldoTotal,
        ).toLocaleString("es-AR")} | ${r.snapshot.acreedoresConSaldo} acreedores`,
      );
      snapshots.push(r.snapshot);
      datasetsParseados++;
    } else {
      console.log(`     ✗ parser warnings: ${r.warnings.join("; ")}`);
    }
  }
  return {
    label: f.label,
    municipioId: f.municipioId,
    datasetsParseados,
    snapshots,
  };
}

function buildManifest(
  fuentes: FuenteResult[],
  refreshedAt: string,
): RefreshManifest {
  const totalSnapshots = fuentes.reduce((s, f) => s + f.snapshots.length, 0);
  const municipioIds = new Set(fuentes.map((f) => f.municipioId).filter(() => true));
  return {
    refreshedAt,
    totalContrataciones: totalSnapshots, // reutilizamos el campo: total snapshots
    municipiosConDatos: municipioIds.size,
    aggregates: totalSnapshots,
    fuentes: fuentes
      .map((f) => ({
        label: f.label,
        municipioId: f.municipioId,
        datasetsParseados: f.datasetsParseados,
        contrataciones: f.snapshots.length, // snapshots por fuente
      }))
      .sort((a, b) => a.municipioId.localeCompare(b.municipioId)),
  };
}

function webDataDir(): string {
  return resolve(__dirname, "..", "..", "..", "web", "src", "data");
}

async function main() {
  console.log(`📊 Sprint 20 — Refresh Pilar 2 Stock de Deuda (Planilla C)\n`);

  const fuentes: FuenteResult[] = [];
  for (const f of FUENTES) {
    try {
      fuentes.push(await refreshFuente(f));
    } catch (e) {
      console.error(`❌ ${f.label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Aplanar todos los snapshots; orden estable por municipio asc, fecha desc.
  const allSnapshots: StockDeudaSnapshot[] = [];
  for (const f of fuentes) allSnapshots.push(...f.snapshots);
  allSnapshots.sort(
    (a, b) =>
      a.municipioId.localeCompare(b.municipioId) ||
      b.fechaSnapshot.localeCompare(a.fechaSnapshot),
  );

  const refreshedAt = new Date().toISOString();
  const manifest = buildManifest(fuentes, refreshedAt);

  const dir = webDataDir();
  mkdirSync(dir, { recursive: true });
  const dataPath = resolve(dir, "auto-deuda.json");
  const manifestPath = resolve(dir, "auto-deuda-manifest.json");
  writeFileSync(dataPath, JSON.stringify(allSnapshots, null, 2), "utf-8");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`\n📊 Resumen:`);
  console.log(`   · Snapshots: ${allSnapshots.length}`);
  console.log(`   · Municipios: ${manifest.municipiosConDatos} / 135`);
  console.log(`   · Fuentes activas: ${manifest.fuentes.length}`);
  for (const f of manifest.fuentes) {
    console.log(`     · ${f.label} → ${f.contrataciones} snapshots`);
  }
  console.log(`\n💾 ${dataPath}`);
  console.log(`💾 ${manifestPath}`);
}

const invokedAs = process.argv[1] ?? "";
if (invokedAs.endsWith("refresh-pilar2-deuda.ts")) {
  main().catch((e) => {
    console.error("Error fatal:", e);
    process.exitCode = 1;
  });
}
