#!/usr/bin/env tsx
/**
 * Sprint 42B — One-shot: convertir `partidos.json` (GeoJSON, 2.7 MB) a
 * `partidos.topo.json` (TopoJSON, ~700-900 KB esperado).
 *
 * TopoJSON deduplica arcs entre polígonos vecinos. Para partidos de PBA
 * que comparten límites el ahorro suele estar entre 60-70%. Además
 * cuantiza coordenadas a integers (quantization=1e5 = ~1m precisión, más
 * que suficiente para un mapa nacional).
 *
 * El runtime usa `topojson-client.feature()` para volver a GeoJSON
 * FeatureCollection con shape idéntico al original — los consumers no
 * cambian.
 *
 * Idempotente: re-ejecutar produce el mismo output. Comiteable.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { topology } from "topojson-server";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "..", "src", "data");
const inputPath = resolve(dataDir, "partidos.json");
const outputPath = resolve(dataDir, "partidos.topo.json");

const inputRaw = readFileSync(inputPath, "utf-8");
const inputBytes = Buffer.byteLength(inputRaw);
const geojson = JSON.parse(inputRaw);

console.log(`📥 Input:  ${inputPath}`);
console.log(`   Size:   ${(inputBytes / 1024).toFixed(0)} KB`);
console.log(`   Features: ${geojson.features?.length ?? "?"}\n`);

// topology() acepta un Record<name, GeoJSON> y produce un Topology.
// Cuantización 1e5 = ~1.1m de precisión en la PBA (≈ 1 grado / 1e5).
// Para una visualización de provincia esto es invisible al ojo.
const topo = topology({ partidos: geojson }, 1e5);

const outputRaw = JSON.stringify(topo);
const outputBytes = Buffer.byteLength(outputRaw);
writeFileSync(outputPath, outputRaw, "utf-8");

const savings = ((1 - outputBytes / inputBytes) * 100).toFixed(1);
console.log(`📤 Output: ${outputPath}`);
console.log(`   Size:   ${(outputBytes / 1024).toFixed(0)} KB`);
console.log(`   Ahorro: ${savings}% (${((inputBytes - outputBytes) / 1024).toFixed(0)} KB menos)\n`);
console.log("✓ Done");
