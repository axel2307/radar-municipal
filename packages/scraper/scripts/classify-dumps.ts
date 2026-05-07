#!/usr/bin/env tsx
/**
 * Reporte rápido: clasifica cada dump en packages/scraper/output/dumps/
 * y muestra el kind + score + top señales. Sirve para calibrar el classifier
 * y para preparar input al Sprint 9 report.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyOrdenanzaContent } from "../src/parsers/classify-ordenanza.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DUMPS_DIR = join(__dirname, "..", "output", "dumps");

const files = readdirSync(DUMPS_DIR).filter((f) => f.endsWith(".txt"));

console.log("| Municipio | Kind | Score | Top señales pro-I | Top señales pro-F | $/1k chars |");
console.log("|---|---|---:|---|---|---:|");

for (const file of files) {
  const raw = readFileSync(join(DUMPS_DIR, file), "utf-8");
  const marker = "=== PRIMEROS 8000 CHARS ===";
  const idx = raw.indexOf(marker);
  const text = idx === -1 ? raw : raw.slice(idx + marker.length);

  const result = classifyOrdenanzaContent(text);

  const topPos = Object.entries(result.signals.positiveHits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k, n]) => `${k}×${n}`)
    .join(", ");
  const topNeg = Object.entries(result.signals.negativeHits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k, n]) => `${k}×${n}`)
    .join(", ");

  const municipio = file.replace(/^\d+-/, "").replace(/\.txt$/, "").replace(/_/g, " ");
  console.log(
    `| ${municipio} | ${result.kind} | ${result.score.toFixed(2)} | ${topPos || "—"} | ${topNeg || "—"} | ${result.signals.monetaryDensity.toFixed(1)} |`,
  );
}
