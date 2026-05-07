#!/usr/bin/env tsx
/**
 * Script de verificación de migración JSON → DB.
 *
 * Compara los scores calculados desde los JSONs estáticos (lógica actual)
 * con los scores calculados desde la DB (lógica nueva) para los 13 municipios piloto.
 *
 * El objetivo es garantizar que la migración no introduce regresiones:
 * todos los scores deben coincidir dentro de un margen ε = 0.01.
 *
 * Uso:
 *   tsx scripts/verify-migration.ts
 *   tsx scripts/verify-migration.ts --verbose
 *   tsx scripts/verify-migration.ts --epsilon=0.05
 *
 * Requisitos:
 *   - DATABASE_URL configurada
 *   - DB poblada con db:seed-pilots
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MUNICIPIOS_PILOTO,
  getMunicipioById,
  ScoringDimension,
  ScoringCategory,
  computeWeightedTotal,
  type FiscalIndicatorSourced,
  type NormativaData,
  type ComprasData,
  type SourcedValue,
  type PilotAuditData,
} from "@radar-municipal/core";
import {
  calculateTransparencyScore,
  scoreFiscalSourced,
  scoreNormativa,
  scoreServiciosBasicos,
  scoreParticipacion,
  scoreEducacionSalud,
  scoreConectividad,
  scoreEconomiaLocal,
  scoreGastoFuncion,
  scoreSeguridadVial,
  scoreEspacioPublico,
} from "@radar-municipal/scoring";
import { createDb } from "@radar-municipal/core/db";
import {
  getAllScoringInputs,
  type AllScoringInputs,
} from "@radar-municipal/core/db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../data");

// ─────────────────────────────────────────
// Args
// ─────────────────────────────────────────

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const epsilonArg = args.find((a) => a.startsWith("--epsilon="));
const EPSILON = epsilonArg ? parseFloat(epsilonArg.split("=")[1]) : 0.01;

// ─────────────────────────────────────────
// Load JSON data
// ─────────────────────────────────────────

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(resolve(DATA_DIR, filename), "utf-8")) as T;
}

interface SimpleEntry {
  municipioId: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────
// Calculate scores from JSON (reference implementation)
// ─────────────────────────────────────────

function computeJsonScores(municipioId: string): Map<ScoringDimension, number | null> {
  const scores = new Map<ScoringDimension, number | null>();

  // Transparencia
  const auditData = loadJson<PilotAuditData>("pilot-audit.json");
  const audit = auditData.find((a) => a.municipioId === municipioId);
  if (audit) {
    const result = calculateTransparencyScore(audit);
    scores.set(ScoringDimension.TRANSPARENCIA, result.scoreTotal);
  } else {
    scores.set(ScoringDimension.TRANSPARENCIA, null);
  }

  // Fiscal
  const fiscalData = loadJson<SimpleEntry[]>("pilot-fiscal.json");
  const fiscalEntry = fiscalData.find((e) => e.municipioId === municipioId);
  const mun = getMunicipioById(municipioId);
  if (fiscalEntry && mun?.poblacion) {
    const sourced: FiscalIndicatorSourced = {
      id: 0,
      municipioId,
      anio: (fiscalEntry.anio as number) ?? 2024,
      trimestre: (fiscalEntry.trimestre as number) ?? 1,
      gastoTotal: fiscalEntry.gastoTotal as SourcedValue<number>,
      gastoPersonal: fiscalEntry.gastoPersonal as SourcedValue<number>,
      gastoCapital: fiscalEntry.gastoCapital as SourcedValue<number>,
      deudaTotal: fiscalEntry.deudaTotal as SourcedValue<number>,
      ingresoTotal: fiscalEntry.ingresoTotal as SourcedValue<number>,
      resultadoFiscal: fiscalEntry.resultadoFiscal as SourcedValue<number>,
      gastoPcapita: fiscalEntry.gastoPcapita as SourcedValue<number>,
      deudaPcapita: fiscalEntry.deudaPcapita as SourcedValue<number>,
      pctPersonal: fiscalEntry.pctPersonal as SourcedValue<number>,
      pctCapital: fiscalEntry.pctCapital as SourcedValue<number>,
      ...(fiscalEntry.autonomiaFiscal
        ? { autonomiaFiscal: fiscalEntry.autonomiaFiscal as SourcedValue<number> }
        : {}),
      ...(fiscalEntry.presionTributaria
        ? { presionTributaria: fiscalEntry.presionTributaria as SourcedValue<number> }
        : {}),
      ...(fiscalEntry.eficienciaAdmin
        ? { eficienciaAdmin: fiscalEntry.eficienciaAdmin as SourcedValue<number> }
        : {}),
    };
    const result = scoreFiscalSourced({ fiscal: sourced, poblacion: mun.poblacion });
    scores.set(ScoringDimension.FISCAL, result.scoreTotal);
  } else {
    scores.set(ScoringDimension.FISCAL, null);
  }

  // Normativa
  const normData = loadJson<SimpleEntry[]>("pilot-normativa.json");
  const normEntry = normData.find((e) => e.municipioId === municipioId);
  if (normEntry) {
    const nd: NormativaData = {
      municipioId,
      nombre: normEntry.nombre as string,
      fechaScrape: normEntry.fechaScrape as string,
      normasEncontradas: normEntry.normasEncontradas as number,
      normas: [],
      ordenanzaFiscalVigente: normEntry.ordenanzaFiscalVigente as NormativaData["ordenanzaFiscalVigente"],
      tieneBoletinSibom: normEntry.tieneBoletinSibom as boolean,
      boletinesPublicados: normEntry.boletinesPublicados as number,
      ultimoBoletinAnio: normEntry.ultimoBoletinAnio as number | null,
    };
    const compras = normEntry.compras as {
      publicaLicitaciones: boolean;
      urlPortalCompras: string | null;
      publicaAdjudicaciones: boolean;
      licitacionesDetectadas: number;
      plataforma: string | null;
      notas: string | null;
    };
    const cd: ComprasData = { municipioId, ...compras };
    const result = scoreNormativa({ normativa: nd, compras: cd });
    scores.set(ScoringDimension.NORMATIVA, result.scoreTotal);
  } else {
    scores.set(ScoringDimension.NORMATIVA, null);
  }

  // Simple dimensions
  const simpleDims: [string, ScoringDimension, (input: Record<string, unknown>) => { scoreTotal: number }, Record<string, string>][] = [
    ["pilot-servicios-basicos.json", ScoringDimension.SERVICIOS_BASICOS, scoreServiciosBasicos as never, {
      pctAguaRed: "pctAguaRed", pctCloaca: "pctCloaca", pctGasRed: "pctGasRed",
      recoleccionResiduos: "recoleccionResiduos", alumbradoPublico: "alumbradoPublico",
    }],
    ["pilot-participacion.json", ScoringDimension.PARTICIPACION_CIUDADANA, scoreParticipacion as never, {
      presupuestoParticipativo: "presupuestoParticipativo", audienciasPublicas: "audienciasPublicas",
      sistemaReclamos: "sistemaReclamos", transparenciaHcd: "transparenciaHcd",
      evidenciaPresupuesto: "evidenciaPresupuesto", evidenciaAudiencias: "evidenciaAudiencias",
      urlReclamos: "urlReclamos", urlHcd: "urlHcd",
    }],
    ["pilot-educacion-salud.json", ScoringDimension.EDUCACION_SALUD, scoreEducacionSalud as never, {
      escuelasPer10k: "escuelasPer10k", centrosSaludPer10k: "centrosSaludPer10k",
      camasPer10k: "camasPer10k", jardinesPerNinos: "jardinesPerNinos",
    }],
    ["pilot-conectividad.json", ScoringDimension.CONECTIVIDAD_DIGITAL, scoreConectividad as never, {
      pctInternet: "pctInternet", bandaAnchaPer100: "bandaAnchaPer100",
      pctComputadora: "pctComputadora", serviciosDigitales: "serviciosDigitales",
    }],
    ["pilot-economia-local.json", ScoringDimension.ECONOMIA_LOCAL, scoreEconomiaLocal as never, {
      empleoPcapita: "empleoPcapita", variacionEmpleo: "variacionEmpleo",
      empresasPer1000: "empresasPer1000", construccion: "construccion",
      recaudacionPcapita: "recaudacionPcapita",
    }],
    ["pilot-gasto-funcion.json", ScoringDimension.GASTO_POR_FUNCION, scoreGastoFuncion as never, {
      pctServiciosSociales: "pctServiciosSociales", pctServiciosEconomicos: "pctServiciosEconomicos",
      pctAdminGubernamental: "pctAdminGubernamental", pctDeudaPublica: "pctDeudaPublica",
    }],
    ["pilot-seguridad-vial.json", ScoringDimension.SEGURIDAD_VIAL, scoreSeguridadVial as never, {
      siniestrosPer100k: "siniestrosPer100k", kmPavimentadoPerKm2: "kmPavimentadoPerKm2",
      transitoPublico: "transitoPublico", kmCiclovias: "kmCiclovias",
    }],
    ["pilot-espacio-publico.json", ScoringDimension.ESPACIO_PUBLICO, scoreEspacioPublico as never, {
      espacioVerdePcapita: "espacioVerdePcapita", coberturaArbolado: "coberturaArbolado",
      separacionResiduos: "separacionResiduos", incidentesAmbientales: "incidentesAmbientales",
    }],
  ];

  for (const [file, dim, scoreFn, fieldMap] of simpleDims) {
    const data = loadJson<SimpleEntry[]>(file);
    const entry = data.find((e) => e.municipioId === municipioId);
    if (entry) {
      const input: Record<string, unknown> = {};
      for (const [key, jsonKey] of Object.entries(fieldMap)) {
        input[key] = entry[jsonKey] ?? null;
      }
      const result = (scoreFn as (i: Record<string, unknown>) => { scoreTotal: number })(input);
      scores.set(dim, result.scoreTotal);
    } else {
      scores.set(dim, null);
    }
  }

  return scores;
}

function computeJsonTotal(dimScores: Map<ScoringDimension, number | null>): number {
  return computeWeightedTotal(dimScores).scoreTotal;
}

// ─────────────────────────────────────────
// Calculate scores from DB
// ─────────────────────────────────────────

async function computeDbScores(
  db: ReturnType<typeof createDb>,
  municipioId: string,
  anio: number
): Promise<Map<ScoringDimension, number | null>> {
  const inputs = await getAllScoringInputs(db as never, municipioId, anio);
  const scores = new Map<ScoringDimension, number | null>();

  // Transparencia
  if (inputs.transparencia) {
    const result = calculateTransparencyScore(inputs.transparencia);
    scores.set(ScoringDimension.TRANSPARENCIA, result.scoreTotal);
  } else {
    scores.set(ScoringDimension.TRANSPARENCIA, null);
  }

  // Fiscal
  if (inputs.fiscal) {
    const result = scoreFiscalSourced(inputs.fiscal);
    scores.set(ScoringDimension.FISCAL, result.scoreTotal);
  } else {
    scores.set(ScoringDimension.FISCAL, null);
  }

  // Normativa
  if (inputs.normativa) {
    const result = scoreNormativa(inputs.normativa);
    scores.set(ScoringDimension.NORMATIVA, result.scoreTotal);
  } else {
    scores.set(ScoringDimension.NORMATIVA, null);
  }

  // Simple dimensions
  const simplePairs: [keyof AllScoringInputs, ScoringDimension, (input: never) => { scoreTotal: number }][] = [
    ["serviciosBasicos", ScoringDimension.SERVICIOS_BASICOS, scoreServiciosBasicos as never],
    ["participacion", ScoringDimension.PARTICIPACION_CIUDADANA, scoreParticipacion as never],
    ["educacionSalud", ScoringDimension.EDUCACION_SALUD, scoreEducacionSalud as never],
    ["conectividad", ScoringDimension.CONECTIVIDAD_DIGITAL, scoreConectividad as never],
    ["economiaLocal", ScoringDimension.ECONOMIA_LOCAL, scoreEconomiaLocal as never],
    ["gastoFuncion", ScoringDimension.GASTO_POR_FUNCION, scoreGastoFuncion as never],
    ["seguridadVial", ScoringDimension.SEGURIDAD_VIAL, scoreSeguridadVial as never],
    ["espacioPublico", ScoringDimension.ESPACIO_PUBLICO, scoreEspacioPublico as never],
  ];

  for (const [key, dim, scoreFn] of simplePairs) {
    const input = inputs[key];
    if (input) {
      const result = scoreFn(input as never);
      scores.set(dim, result.scoreTotal);
    } else {
      scores.set(dim, null);
    }
  }

  return scores;
}

// ─────────────────────────────────────────
// Comparison
// ─────────────────────────────────────────

interface DimensionComparison {
  dimension: ScoringDimension;
  jsonScore: number | null;
  dbScore: number | null;
  diff: number | null;
  match: boolean;
}

interface MunicipioComparison {
  municipioId: string;
  nombre: string;
  dimensions: DimensionComparison[];
  jsonTotal: number;
  dbTotal: number;
  totalDiff: number;
  totalMatch: boolean;
  allMatch: boolean;
}

function compare(
  jsonScores: Map<ScoringDimension, number | null>,
  dbScores: Map<ScoringDimension, number | null>,
  epsilon: number
): DimensionComparison[] {
  const results: DimensionComparison[] = [];

  for (const dim of Object.values(ScoringDimension)) {
    const jsonVal = jsonScores.get(dim) ?? null;
    const dbVal = dbScores.get(dim) ?? null;

    let diff: number | null = null;
    let match = true;

    if (jsonVal === null && dbVal === null) {
      // Both null = match
    } else if (jsonVal === null || dbVal === null) {
      // One null, other not = mismatch
      match = false;
      diff = jsonVal ?? dbVal;
    } else {
      diff = Math.abs(jsonVal - dbVal);
      match = diff <= epsilon;
    }

    results.push({ dimension: dim, jsonScore: jsonVal, dbScore: dbVal, diff, match });
  }

  return results;
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

async function main() {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  VERIFICACIÓN DE MIGRACIÓN JSON → DB`);
  console.log(`  Epsilon: ${EPSILON} | Verbose: ${verbose}`);
  console.log(`${"═".repeat(70)}\n`);

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL no definida. Abortando.");
    console.error("   Asegurate de tener PostgreSQL corriendo y la variable configurada.");
    process.exit(1);
  }

  const db = createDb();
  const pilotos = MUNICIPIOS_PILOTO;
  const anio = 2024; // Año de referencia para datos piloto

  console.log(`📋 Comparando ${pilotos.length} municipios piloto...\n`);

  const comparisons: MunicipioComparison[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const m of pilotos) {
    process.stdout.write(`  ${m.nombre.padEnd(28)}`);

    try {
      // Compute from JSON
      const jsonScores = computeJsonScores(m.id);
      const jsonTotal = computeJsonTotal(jsonScores);

      // Compute from DB
      const dbScores = await computeDbScores(db, m.id, anio);
      const dbTotal = computeWeightedTotal(dbScores).scoreTotal;

      // Compare
      const dimComparisons = compare(jsonScores, dbScores, EPSILON);
      const totalDiff = Math.abs(jsonTotal - dbTotal);
      const totalMatch = totalDiff <= EPSILON;
      const allMatch = dimComparisons.every((d) => d.match) && totalMatch;

      const comp: MunicipioComparison = {
        municipioId: m.id,
        nombre: m.nombre,
        dimensions: dimComparisons,
        jsonTotal,
        dbTotal,
        totalDiff,
        totalMatch,
        allMatch,
      };
      comparisons.push(comp);

      if (allMatch) {
        totalPassed++;
        console.log(`✅ PASS  (total: ${jsonTotal.toFixed(1)} ≈ ${dbTotal.toFixed(1)})`);
      } else {
        totalFailed++;
        const mismatches = dimComparisons.filter((d) => !d.match);
        console.log(
          `❌ FAIL  (total: ${jsonTotal.toFixed(1)} vs ${dbTotal.toFixed(1)}, ` +
            `${mismatches.length} dim mismatch${!totalMatch ? " + total" : ""})`
        );
      }

      // Verbose output
      if (verbose || !allMatch) {
        for (const d of dimComparisons) {
          if (!d.match || verbose) {
            const jStr = d.jsonScore?.toFixed(1) ?? "null";
            const dStr = d.dbScore?.toFixed(1) ?? "null";
            const icon = d.match ? "  " : "⚠️";
            const diffStr = d.diff != null ? `Δ=${d.diff.toFixed(3)}` : "";
            console.log(
              `    ${icon} ${d.dimension.padEnd(25)} JSON=${jStr.padEnd(7)} DB=${dStr.padEnd(7)} ${diffStr}`
            );
          }
        }
      }
    } catch (err) {
      totalFailed++;
      console.log(`❌ ERROR: ${(err as Error).message}`);
      comparisons.push({
        municipioId: m.id,
        nombre: m.nombre,
        dimensions: [],
        jsonTotal: 0,
        dbTotal: 0,
        totalDiff: Infinity,
        totalMatch: false,
        allMatch: false,
      });
    }
  }

  // ─────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────

  console.log(`\n${"═".repeat(70)}`);
  console.log(`  RESULTADO`);
  console.log(`${"═".repeat(70)}`);
  console.log(`  Pasaron:  ${totalPassed}/${pilotos.length}`);
  console.log(`  Fallaron: ${totalFailed}/${pilotos.length}`);

  if (totalFailed > 0) {
    console.log(`\n  ⚠️  Municipios con discrepancias:`);
    for (const c of comparisons.filter((c) => !c.allMatch)) {
      const mismatches = c.dimensions.filter((d) => !d.match);
      console.log(
        `     ${c.nombre}: ${mismatches.length} dimensiones, total Δ=${c.totalDiff.toFixed(3)}`
      );
      for (const d of mismatches) {
        console.log(
          `       - ${d.dimension}: JSON=${d.jsonScore?.toFixed(1) ?? "null"} DB=${d.dbScore?.toFixed(1) ?? "null"}`
        );
      }
    }
  }

  // Dimension-level summary
  const dimMismatches = new Map<ScoringDimension, number>();
  for (const c of comparisons) {
    for (const d of c.dimensions.filter((d) => !d.match)) {
      dimMismatches.set(d.dimension, (dimMismatches.get(d.dimension) ?? 0) + 1);
    }
  }

  if (dimMismatches.size > 0) {
    console.log(`\n  Discrepancias por dimensión:`);
    for (const [dim, count] of [...dimMismatches.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`     ${dim.padEnd(25)} ${count} municipios`);
    }
  }

  console.log(`\n${"═".repeat(70)}`);

  if (totalFailed === 0) {
    console.log(`  ✅ MIGRACIÓN VERIFICADA: Todos los scores coinciden (ε < ${EPSILON})`);
  } else {
    console.log(`  ❌ MIGRACIÓN CON DISCREPANCIAS: ${totalFailed} municipios no coinciden`);
    console.log(`     Revisar los datos de ingesta y la lógica de scoring-inputs.ts`);
  }

  console.log(`${"═".repeat(70)}\n`);

  // Exit code for CI
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\n💥 Error fatal:", err);
  process.exit(1);
});
