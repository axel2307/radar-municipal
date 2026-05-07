/**
 * Migración: convierte los 12 JSON estáticos de datos piloto
 * en registros de dataPoints + documents + dataGaps en la DB.
 *
 * Este script es el puente que garantiza backward compatibility:
 * los scores calculados desde la DB deben coincidir con los de JSON.
 *
 * Usage: tsx packages/ingestion/src/seed-from-json.ts
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DataField, SourceLayer, ConfidenceLevel } from "@radar-municipal/core";
import { createDb } from "@radar-municipal/core/db";
import type { DataPointInsert } from "./writers/data-point-writer";
import { upsertDataPointsBatch } from "./writers/data-point-writer";
import {
  pilotFiscalArraySchema,
  pilotServiciosBasicosArraySchema,
  pilotConectividadArraySchema,
  pilotEducacionSaludArraySchema,
  pilotEconomiaLocalArraySchema,
  pilotGastoFuncionArraySchema,
  pilotSeguridadVialArraySchema,
  pilotEspacioPublicoArraySchema,
  pilotParticipacionArraySchema,
  pilotNormativaArraySchema,
} from "./schemas";
import type { ZodType } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../../data");

function loadJson(filename: string): unknown {
  const content = readFileSync(resolve(DATA_DIR, filename), "utf-8");
  return JSON.parse(content);
}

/**
 * Validate a loaded JSON payload against a Zod schema.
 * On failure, logs detailed errors and throws.
 */
function validateJson<T>(filename: string, data: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`\nValidation failed for ${filename}:`);
    const formatted = result.error.format();
    console.error(JSON.stringify(formatted, null, 2));
    throw new Error(`Invalid data in ${filename}: ${result.error.issues.length} issue(s)`);
  }
  return result.data;
}

// ─────────────────────────────────────────
// Type shapes for the JSON files
// ─────────────────────────────────────────

interface SourcedVal {
  valor: number | null;
  fuente?: {
    capa: string;
    organismo: string;
    url: string | null;
    formato: string | null;
    fechaAcceso: string;
    fechaPublicacion: string | null;
  } | null;
  confianza?: {
    nivel: string;
    notas: string | null;
    validadoContra: string | null;
  } | null;
}

interface FiscalEntry {
  municipioId: string;
  anio: number;
  trimestre: number;
  gastoTotal: SourcedVal;
  gastoPersonal: SourcedVal;
  gastoCapital: SourcedVal;
  deudaTotal: SourcedVal;
  ingresoTotal: SourcedVal;
  resultadoFiscal: SourcedVal;
  gastoPcapita: SourcedVal;
  deudaPcapita: SourcedVal;
  pctPersonal: SourcedVal;
  pctCapital: SourcedVal;
  autonomiaFiscal?: SourcedVal;
  presionTributaria?: SourcedVal;
  eficienciaAdmin?: SourcedVal;
}

interface SimpleDimensionEntry {
  municipioId: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function sourcedToInsert(
  municipioId: string,
  campo: DataField,
  anio: number,
  sv: SourcedVal | undefined,
  unidad?: string
): DataPointInsert | null {
  if (!sv || sv.valor == null) return null;

  return {
    municipioId,
    campo,
    anio,
    valorNumerico: sv.valor,
    unidad: unidad ?? null,
    fuenteCapa: sv.fuente?.capa ?? SourceLayer.DERIVADA,
    fuenteOrganismo: sv.fuente?.organismo ?? "RADAR_MUNICIPAL",
    fuenteUrl: sv.fuente?.url ?? null,
    fuenteFormato: sv.fuente?.formato ?? null,
    fuenteFechaAcceso: sv.fuente?.fechaAcceso ? new Date(sv.fuente.fechaAcceso) : new Date(),
    fuenteFechaPublicacion: sv.fuente?.fechaPublicacion ? new Date(sv.fuente.fechaPublicacion) : null,
    confianzaNivel: sv.confianza?.nivel ?? ConfidenceLevel.MEDIA,
    confianzaNotas: sv.confianza?.notas ?? null,
    confianzaValidadoContra: sv.confianza?.validadoContra ?? null,
  };
}

function simpleNumericInsert(
  municipioId: string,
  campo: DataField,
  anio: number,
  valor: number | null | undefined,
  unidad: string | null,
  organismo: string,
  capa: string = SourceLayer.NACIONAL
): DataPointInsert | null {
  if (valor == null) return null;
  return {
    municipioId,
    campo,
    anio,
    valorNumerico: valor,
    unidad,
    fuenteCapa: capa,
    fuenteOrganismo: organismo,
    fuenteFechaAcceso: new Date(),
    confianzaNivel: ConfidenceLevel.MEDIA,
  };
}

function simpleBooleanInsert(
  municipioId: string,
  campo: DataField,
  anio: number,
  valor: number | boolean | null | undefined,
  organismo: string,
  capa: string = SourceLayer.MUNICIPAL
): DataPointInsert | null {
  if (valor == null) return null;
  const numVal = typeof valor === "boolean" ? (valor ? 1 : 0) : valor;
  return {
    municipioId,
    campo,
    anio,
    valorNumerico: numVal,
    valorBooleano: numVal > 0,
    fuenteCapa: capa,
    fuenteOrganismo: organismo,
    fuenteFechaAcceso: new Date(),
    confianzaNivel: ConfidenceLevel.MEDIA,
  };
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL no configurada.");
    process.exit(1);
  }

  const db = createDb(databaseUrl);
  const allPoints: DataPointInsert[] = [];
  const ANIO = 2025;

  console.log("Leyendo JSONs de datos piloto...");

  // 1. Fiscal (SourcedValue format)
  const fiscal = validateJson("pilot-fiscal.json", loadJson("pilot-fiscal.json"), pilotFiscalArraySchema);
  for (const f of fiscal) {
    const add = (campo: DataField, sv: SourcedVal | undefined, u?: string) => {
      const p = sourcedToInsert(f.municipioId, campo, f.anio, sv, u);
      if (p) allPoints.push(p);
    };
    add(DataField.GASTO_TOTAL, f.gastoTotal, "$");
    add(DataField.GASTO_PERSONAL, f.gastoPersonal, "$");
    add(DataField.GASTO_CAPITAL, f.gastoCapital, "$");
    add(DataField.DEUDA_STOCK, f.deudaTotal, "$");
    add(DataField.INGRESO_TOTAL, f.ingresoTotal, "$");
    add(DataField.RESULTADO_FISCAL, f.resultadoFiscal, "$");
    add(DataField.GASTO_PCAPITA, f.gastoPcapita, "$/hab");
    add(DataField.DEUDA_PCAPITA, f.deudaPcapita, "$/hab");
    add(DataField.PCT_PERSONAL, f.pctPersonal, "%");
    add(DataField.PCT_CAPITAL, f.pctCapital, "%");
    add(DataField.AUTONOMIA_FISCAL, f.autonomiaFiscal, "%");
    add(DataField.PRESION_TRIBUTARIA, f.presionTributaria, "$/hab");
    add(DataField.EFICIENCIA_ADMIN, f.eficienciaAdmin, "%");
  }
  console.log(`  fiscal: ${allPoints.length} dataPoints`);

  // 2. Servicios Básicos
  const servicios = validateJson("pilot-servicios-basicos.json", loadJson("pilot-servicios-basicos.json"), pilotServiciosBasicosArraySchema);
  let prevLen = allPoints.length;
  for (const s of servicios) {
    const id = s.municipioId;
    const p = (c: DataField, v: unknown, u: string) =>
      simpleNumericInsert(id, c, ANIO, v as number | null, u, "INDEC");
    [
      p(DataField.PCT_AGUA_RED, s["pctAguaRed"], "%"),
      p(DataField.PCT_CLOACA, s["pctCloaca"], "%"),
      p(DataField.PCT_GAS_RED, s["pctGasRed"], "%"),
      simpleBooleanInsert(id, DataField.RECOLECCION_RESIDUOS, ANIO, s["recoleccionResiduos"] as number, "PORTAL_MUNICIPAL"),
      simpleBooleanInsert(id, DataField.ALUMBRADO_PUBLICO, ANIO, s["alumbradoPublico"] as number, "PORTAL_MUNICIPAL"),
    ].forEach((pt) => pt && allPoints.push(pt));
  }
  console.log(`  servicios básicos: ${allPoints.length - prevLen} dataPoints`);

  // 3. Conectividad
  const conectividad = validateJson("pilot-conectividad.json", loadJson("pilot-conectividad.json"), pilotConectividadArraySchema);
  prevLen = allPoints.length;
  for (const c of conectividad) {
    const id = c.municipioId;
    [
      simpleNumericInsert(id, DataField.PCT_INTERNET, ANIO, c["pctInternet"] as number, "%", "INDEC"),
      simpleNumericInsert(id, DataField.BANDA_ANCHA_PER_100, ANIO, c["bandaAnchaPer100"] as number, "conn/100h", "ENACOM"),
      simpleNumericInsert(id, DataField.PCT_COMPUTADORA, ANIO, c["pctComputadora"] as number, "%", "INDEC"),
      simpleBooleanInsert(id, DataField.SERVICIOS_DIGITALES, ANIO, c["serviciosDigitales"] as number, "PORTAL_MUNICIPAL"),
    ].forEach((pt) => pt && allPoints.push(pt));
  }
  console.log(`  conectividad: ${allPoints.length - prevLen} dataPoints`);

  // 4. Educación y Salud
  const eduSalud = validateJson("pilot-educacion-salud.json", loadJson("pilot-educacion-salud.json"), pilotEducacionSaludArraySchema);
  prevLen = allPoints.length;
  for (const e of eduSalud) {
    const id = e.municipioId;
    [
      simpleNumericInsert(id, DataField.ESCUELAS_PER_10K, ANIO, e["escuelasPer10k"] as number, "esc/10kh", "MAPA_EDUCATIVO"),
      simpleNumericInsert(id, DataField.CENTROS_SALUD_PER_10K, ANIO, e["centrosSaludPer10k"] as number, "cs/10kh", "REFES_SALUD"),
      simpleNumericInsert(id, DataField.CAMAS_PER_10K, ANIO, e["camasPer10k"] as number, "camas/10kh", "REFES_SALUD"),
      simpleNumericInsert(id, DataField.JARDINES_PER_NINOS, ANIO, e["jardinesPerNinos"] as number, "jardines/1000niños", "MAPA_EDUCATIVO"),
    ].forEach((pt) => pt && allPoints.push(pt));
  }
  console.log(`  educación/salud: ${allPoints.length - prevLen} dataPoints`);

  // 5. Economía Local
  const economia = validateJson("pilot-economia-local.json", loadJson("pilot-economia-local.json"), pilotEconomiaLocalArraySchema);
  prevLen = allPoints.length;
  for (const e of economia) {
    const id = e.municipioId;
    [
      simpleNumericInsert(id, DataField.EMPLEO_REGISTRADO_PER_CAPITA, ANIO, e["empleoPcapita"] as number, "emp/hab", "OEDE"),
      simpleNumericInsert(id, DataField.VARIACION_EMPLEO_INTERANUAL, ANIO, e["variacionEmpleo"] as number, "%", "OEDE"),
      simpleNumericInsert(id, DataField.EMPRESAS_PER_CAPITA, ANIO, e["empresasPer1000"] as number, "emp/1000hab", "AFIP"),
      simpleBooleanInsert(id, DataField.PERMISOS_CONSTRUCCION, ANIO, e["construccion"] as number, "IERIC"),
      simpleNumericInsert(id, DataField.RECAUDACION_PROPIA_PER_CAPITA, ANIO, e["recaudacionPcapita"] as number, "$/hab", "PORTAL_MUNICIPAL", SourceLayer.MUNICIPAL),
    ].forEach((pt) => pt && allPoints.push(pt));
  }
  console.log(`  economía local: ${allPoints.length - prevLen} dataPoints`);

  // 6. Gasto por Función
  const gastoFn = validateJson("pilot-gasto-funcion.json", loadJson("pilot-gasto-funcion.json"), pilotGastoFuncionArraySchema);
  prevLen = allPoints.length;
  for (const g of gastoFn) {
    const id = g.municipioId;
    [
      simpleNumericInsert(id, DataField.PCT_SERVICIOS_SOCIALES, ANIO, g["pctServiciosSociales"] as number, "%", "PORTAL_MUNICIPAL", SourceLayer.MUNICIPAL),
      simpleNumericInsert(id, DataField.PCT_SERVICIOS_ECONOMICOS, ANIO, g["pctServiciosEconomicos"] as number, "%", "PORTAL_MUNICIPAL", SourceLayer.MUNICIPAL),
      simpleNumericInsert(id, DataField.PCT_ADMIN_GUBERNAMENTAL, ANIO, g["pctAdminGubernamental"] as number, "%", "PORTAL_MUNICIPAL", SourceLayer.MUNICIPAL),
      simpleNumericInsert(id, DataField.PCT_DEUDA_PUBLICA, ANIO, g["pctDeudaPublica"] as number, "%", "PORTAL_MUNICIPAL", SourceLayer.MUNICIPAL),
    ].forEach((pt) => pt && allPoints.push(pt));
  }
  console.log(`  gasto por función: ${allPoints.length - prevLen} dataPoints`);

  // 7. Seguridad Vial
  const segVial = validateJson("pilot-seguridad-vial.json", loadJson("pilot-seguridad-vial.json"), pilotSeguridadVialArraySchema);
  prevLen = allPoints.length;
  for (const s of segVial) {
    const id = s.municipioId;
    [
      simpleNumericInsert(id, DataField.SINIESTROS_PER_100K, ANIO, s["siniestrosPer100k"] as number, "siniest/100kh", "ANSV"),
      simpleNumericInsert(id, DataField.KM_PAVIMENTADO_PER_KM2, ANIO, s["kmPavimentadoPerKm2"] as number, "km/km²", "PORTAL_MUNICIPAL", SourceLayer.MUNICIPAL),
      simpleBooleanInsert(id, DataField.TRANSITO_PUBLICO, ANIO, s["transitoPublico"] as number, "PORTAL_MUNICIPAL"),
      simpleNumericInsert(id, DataField.KM_CICLOVIAS, ANIO, s["kmCiclovias"] as number, "km", "PORTAL_MUNICIPAL", SourceLayer.MUNICIPAL),
    ].forEach((pt) => pt && allPoints.push(pt));
  }
  console.log(`  seguridad vial: ${allPoints.length - prevLen} dataPoints`);

  // 8. Espacio Público
  const espPublico = validateJson("pilot-espacio-publico.json", loadJson("pilot-espacio-publico.json"), pilotEspacioPublicoArraySchema);
  prevLen = allPoints.length;
  for (const e of espPublico) {
    const id = e.municipioId;
    [
      simpleNumericInsert(id, DataField.ESPACIO_VERDE_PCAPITA, ANIO, e["espacioVerdePcapita"] as number, "m²/hab", "OPDS"),
      simpleNumericInsert(id, DataField.COBERTURA_ARBOLADO, ANIO, e["coberturaArbolado"] as number, "%", "GFW"),
      simpleBooleanInsert(id, DataField.SEPARACION_RESIDUOS, ANIO, e["separacionResiduos"] as number, "PORTAL_MUNICIPAL"),
      simpleNumericInsert(id, DataField.INCIDENTES_AMBIENTALES, ANIO, e["incidentesAmbientales"] as number, "incidentes", "OPDS"),
    ].forEach((pt) => pt && allPoints.push(pt));
  }
  console.log(`  espacio público: ${allPoints.length - prevLen} dataPoints`);

  // 9. Participación Ciudadana
  const participacion = validateJson("pilot-participacion.json", loadJson("pilot-participacion.json"), pilotParticipacionArraySchema);
  prevLen = allPoints.length;
  for (const p of participacion) {
    const id = p.municipioId;
    [
      simpleBooleanInsert(id, DataField.PRESUPUESTO_PARTICIPATIVO, ANIO, p["presupuestoParticipativo"] as number, "PORTAL_MUNICIPAL"),
      simpleBooleanInsert(id, DataField.AUDIENCIAS_PUBLICAS, ANIO, p["audienciasPublicas"] as number, "SIBOM_SLYT", SourceLayer.PROVINCIAL),
      simpleBooleanInsert(id, DataField.SISTEMA_RECLAMOS, ANIO, p["sistemaReclamos"] as number, "PORTAL_MUNICIPAL"),
      simpleBooleanInsert(id, DataField.TRANSPARENCIA_HCD, ANIO, p["transparenciaHcd"] as number, "PORTAL_MUNICIPAL"),
    ].forEach((pt) => pt && allPoints.push(pt));
  }
  console.log(`  participación: ${allPoints.length - prevLen} dataPoints`);

  // 10. Normativa (boolean fields)
  const normativa = validateJson("pilot-normativa.json", loadJson("pilot-normativa.json"), pilotNormativaArraySchema);
  prevLen = allPoints.length;
  for (const n of normativa) {
    const id = n.municipioId;
    const compras = n.compras;
    [
      simpleBooleanInsert(id, DataField.BOLETIN_SIBOM, ANIO, n.tieneBoletinSibom, "SIBOM_SLYT", SourceLayer.PROVINCIAL),
      simpleBooleanInsert(id, DataField.ORDENANZA_FISCAL_VIGENTE, ANIO, n.ordenanzaFiscalVigente != null, "SIBOM_SLYT", SourceLayer.PROVINCIAL),
      simpleBooleanInsert(id, DataField.LICITACIONES_PUBLICADAS, ANIO, compras?.publicaLicitaciones as boolean, "PORTAL_MUNICIPAL"),
      simpleBooleanInsert(id, DataField.ADJUDICACIONES_PUBLICADAS, ANIO, compras?.publicaAdjudicaciones as boolean, "PORTAL_MUNICIPAL"),
    ].forEach((pt) => pt && allPoints.push(pt));
  }
  console.log(`  normativa: ${allPoints.length - prevLen} dataPoints`);

  console.log(`\nTotal: ${allPoints.length} dataPoints a insertar`);

  // Write to DB
  console.log("Escribiendo en la base de datos...");
  const result = await upsertDataPointsBatch(db, allPoints);
  console.log(`Completado: ${result.total} dataPoints procesados`);
  if (result.errors.length > 0) {
    console.error("Errores:", result.errors);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
