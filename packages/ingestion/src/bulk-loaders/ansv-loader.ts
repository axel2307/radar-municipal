/**
 * Bulk loader for ANSV road safety data.
 *
 * Covers: SEGURIDAD_VIAL — SINIESTROS_PER_100K
 *
 * Source: ANSV (Agencia Nacional de Seguridad Vial)
 * Layer: NACIONAL
 */

import { DataField, SourceLayer, ConfidenceLevel } from "@radar-municipal/core";
import type { DataPointInsert } from "../writers/data-point-writer";
import { parseCsv, parseJson, normalizePartidoCode } from "./base-loader";

interface AnsvRow {
  codigoPartido: string;
  siniestrosPer100k: number;
}

export function loadAnsv(
  filePath: string,
  anio: number = 2024
): DataPointInsert[] {
  const points: DataPointInsert[] = [];
  const now = new Date();

  let rows: AnsvRow[];

  if (filePath.endsWith(".json")) {
    rows = parseJson<AnsvRow[]>(filePath);
  } else {
    const csvRows = parseCsv(filePath, ";");
    rows = csvRows.map((r) => ({
      codigoPartido: r["codigo_partido"] ?? r["partido_id"] ?? "",
      siniestrosPer100k: parseFloat(r["siniestros_per_100k"] ?? r["tasa_siniestros"] ?? ""),
    }));
  }

  for (const row of rows) {
    const municipioId = normalizePartidoCode(row.codigoPartido);
    if (!municipioId || municipioId.length !== 6) continue;
    if (isNaN(row.siniestrosPer100k)) continue;

    points.push({
      municipioId,
      campo: DataField.SINIESTROS_PER_100K,
      anio,
      valorNumerico: row.siniestrosPer100k,
      unidad: "siniest/100kh",
      fuenteCapa: SourceLayer.NACIONAL,
      fuenteOrganismo: "ANSV",
      fuenteUrl: "https://www.argentina.gob.ar/seguridadvial/observatorio",
      fuenteFormato: "CSV",
      fuenteFechaAcceso: now,
      confianzaNivel: ConfidenceLevel.ALTA,
    });
  }

  return points;
}
