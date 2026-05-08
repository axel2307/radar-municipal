#!/usr/bin/env tsx
/**
 * Sprint 27 — Smoke test post-refresh.
 *
 * Lee cada archivo `auto-*.json` en `packages/web/src/data/` y aplica
 * checks de integridad básicos. Diseñado como gate del workflow
 * mensual: si exit != 0, el job NO commitea los JSONs y la corrida
 * dispara una issue.
 *
 * Karpathy "Simplicity First": sin Zod ni schema-validation library.
 * Validaciones manuales suficientes para detectar errores groseros
 * (truncate, NaN, "[object Object]", arrays vacíos cuando deberían
 * tener N entries). Si Sprint 28+ quiere schema serio, se pivotea
 * a Zod sin tocar este orquestador.
 *
 * Uso:
 *   pnpm --filter @radar-municipal/scraper validate:data
 *   exit 0 = todos los archivos pasaron
 *   exit 1 = al menos uno falló (mensaje específico stdout)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "..", "..", "web", "src", "data");

// ─────────────────────────────────────────
// Helpers de validación
// ─────────────────────────────────────────

interface CheckResult {
  file: string;
  ok: boolean;
  problems: string[];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Detecta serializaciones rotas. Si vemos `"[object Object]"` o `"NaN"` en
 * algún lugar del JSON serializado, es señal de que un toString() o
 * JSON.stringify de un objeto no-plain produjo basura.
 */
function checkSerializationGarbage(raw: string, problems: string[]): void {
  if (raw.includes('"[object Object]"')) {
    problems.push('contiene "[object Object]" (serialización rota)');
  }
  if (/[:\s]NaN[,}\]]/.test(raw)) {
    problems.push("contiene NaN literal (debería ser null o número válido)");
  }
  if (/[:\s]Infinity[,}\]]/.test(raw)) {
    problems.push("contiene Infinity literal");
  }
}

/**
 * Verifica que un valor numérico sea finito si está presente. Permite null
 * (los manifests usan null para "sin datos"). Recursivo sobre objetos y arrays.
 */
function checkNumbersAreFinite(value: unknown, path: string, problems: string[]): void {
  if (typeof value === "number" && !Number.isFinite(value)) {
    problems.push(`${path}: número no finito (${value})`);
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      checkNumbersAreFinite(value[i], `${path}[${i}]`, problems);
    }
    return;
  }
  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      checkNumbersAreFinite(v, `${path}.${k}`, problems);
    }
  }
}

// ─────────────────────────────────────────
// Specs por archivo
// ─────────────────────────────────────────

interface FileSpec {
  /** Ruta relativa a packages/web/src/data/. */
  filename: string;
  /** Si false, el archivo es opcional (no falla si no existe). */
  required: boolean;
  /** Validador específico. Recibe el JSON ya parseado. Pushea a `problems`. */
  validate: (data: unknown, problems: string[]) => void;
}

/**
 * Validador de array no vacío con elementos object que tienen ciertos
 * campos no-null requeridos.
 */
function arrayWithRequiredFields(
  minLen: number,
  requiredFields: string[],
): (data: unknown, problems: string[]) => void {
  return (data, problems) => {
    if (!Array.isArray(data)) {
      problems.push("no es un array");
      return;
    }
    if (data.length < minLen) {
      problems.push(`array tiene ${data.length} entries, esperado >= ${minLen}`);
    }
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!isPlainObject(item)) {
        problems.push(`[${i}]: no es object`);
        continue;
      }
      for (const field of requiredFields) {
        if (!(field in item) || item[field] === undefined) {
          problems.push(`[${i}].${field} ausente`);
        }
      }
    }
  };
}

/** Validador de manifest individual con shape `RefreshManifest`. */
function refreshManifestValidator(data: unknown, problems: string[]): void {
  if (!isPlainObject(data)) {
    problems.push("no es object");
    return;
  }
  for (const field of [
    "refreshedAt",
    "totalContrataciones",
    "municipiosConDatos",
    "aggregates",
    "fuentes",
  ]) {
    if (!(field in data)) problems.push(`falta campo "${field}"`);
  }
  if (typeof data.refreshedAt === "string") {
    const d = new Date(data.refreshedAt);
    if (Number.isNaN(d.getTime())) {
      problems.push(`refreshedAt no parsea como ISO date: ${data.refreshedAt}`);
    }
  }
  if (!Array.isArray(data.fuentes)) {
    problems.push("fuentes no es un array");
  }
}

const SPECS: FileSpec[] = [
  {
    filename: "auto-contrataciones.json",
    required: true,
    validate: arrayWithRequiredFields(50, ["id", "municipioId", "anio", "estado"]),
  },
  {
    filename: "auto-contrataciones-aggregates.json",
    required: true,
    validate: arrayWithRequiredFields(2, [
      "municipioId",
      "anio",
      "totalContrataciones",
    ]),
  },
  {
    filename: "auto-contrataciones-manifest.json",
    required: true,
    validate: refreshManifestValidator,
  },
  {
    filename: "auto-deuda.json",
    required: true,
    validate: arrayWithRequiredFields(3, [
      "municipioId",
      "fechaSnapshot",
      "saldoTotal",
    ]),
  },
  {
    filename: "auto-deuda-manifest.json",
    required: true,
    validate: refreshManifestValidator,
  },
  {
    filename: "auto-vial.json",
    required: false, // post-Sprint-30; primer cron run lo crea
    validate: arrayWithRequiredFields(5, [
      "municipioId",
      "kmRuralEstimado",
      "kmTotalEstimado",
      "extractedAt",
    ]),
  },
  {
    filename: "auto-vial-manifest.json",
    required: false,
    validate: refreshManifestValidator,
  },
  {
    filename: "auto-refresh-manifest.json",
    required: false, // emitido sólo por consolidate-manifest (post-Sprint-27 deploy)
    validate: (data, problems) => {
      if (!isPlainObject(data)) {
        problems.push("no es object");
        return;
      }
      for (const field of ["refreshedAt", "runs", "totalMunicipiosCubiertos"]) {
        if (!(field in data)) problems.push(`falta campo "${field}"`);
      }
      if (Array.isArray(data.runs)) {
        for (let i = 0; i < data.runs.length; i++) {
          const r = data.runs[i];
          if (!isPlainObject(r)) {
            problems.push(`runs[${i}] no es object`);
            continue;
          }
          for (const field of ["target", "script", "status", "durationMs"]) {
            if (!(field in r)) problems.push(`runs[${i}].${field} ausente`);
          }
        }
      } else {
        problems.push("runs no es array");
      }
    },
  },
  {
    filename: "auto-audit.json",
    required: false, // existe pre-Sprint-27 pero no es output de un refresh activo
    validate: arrayWithRequiredFields(0, []), // shape libre por ahora
  },
  {
    filename: "auto-presion-impositiva.json",
    required: false,
    validate: arrayWithRequiredFields(0, []),
  },
];

// ─────────────────────────────────────────
// Runner
// ─────────────────────────────────────────

function checkOne(spec: FileSpec): CheckResult {
  const path = resolve(DATA_DIR, spec.filename);
  const result: CheckResult = { file: spec.filename, ok: true, problems: [] };

  if (!existsSync(path)) {
    if (spec.required) {
      result.ok = false;
      result.problems.push("archivo no existe (required)");
    }
    return result;
  }

  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (e) {
    result.ok = false;
    result.problems.push(`read fail: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }

  if (raw.trim().length === 0) {
    result.ok = false;
    result.problems.push("archivo vacío");
    return result;
  }

  // Checks string-level antes de parse.
  checkSerializationGarbage(raw, result.problems);

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    result.ok = false;
    result.problems.push(
      `JSON.parse fail: ${e instanceof Error ? e.message : String(e)}`,
    );
    return result;
  }

  // Checks de shape específico.
  spec.validate(data, result.problems);

  // Checks numéricos generales (recursivos).
  checkNumbersAreFinite(data, "$", result.problems);

  if (result.problems.length > 0) result.ok = false;
  return result;
}

function main(): void {
  console.log(`🔍 validate-data — checking ${SPECS.length} files in ${DATA_DIR}\n`);
  const results = SPECS.map(checkOne);
  let failed = 0;
  for (const r of results) {
    if (r.ok) {
      console.log(`  ✓ ${r.file}`);
    } else {
      failed++;
      console.log(`  ✗ ${r.file}`);
      for (const p of r.problems) console.log(`      · ${p}`);
    }
  }
  console.log("");
  if (failed > 0) {
    console.log(`❌ ${failed} archivo(s) con problemas`);
    process.exit(1);
  }
  console.log(`✅ Todos los archivos pasaron`);
}

main();
