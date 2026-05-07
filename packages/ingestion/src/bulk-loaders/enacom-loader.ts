/**
 * Bulk loader for ENACOM broadband data.
 *
 * Covers: CONECTIVIDAD — BANDA_ANCHA_PER_100
 *
 * Source: ENACOM datos abiertos (Accesos a Internet fijo por localidad)
 * Layer: NACIONAL
 */

import { DataField, SourceLayer, ConfidenceLevel } from "@radar-municipal/core";
import type { DataPointInsert } from "../writers/data-point-writer";
import { parseCsv, parseJson, normalizePartidoCode } from "./base-loader";

interface EnacomRow {
  codigoPartido: string;
  bandaAnchaPer100: number;
}

export function loadEnacom(
  filePath: string,
  anio: number = 2025
): DataPointInsert[] {
  const points: DataPointInsert[] = [];
  const now = new Date();

  let rows: EnacomRow[];

  if (filePath.endsWith(".json")) {
    rows = parseJson<EnacomRow[]>(filePath);
  } else {
    const csvRows = parseCsv(filePath, ";");
    rows = csvRows.map((r) => ({
      codigoPartido: r["codigo_partido"] ?? r["partido_id"] ?? "",
      bandaAnchaPer100: parseFloat(r["banda_ancha_per_100"] ?? r["accesos_per_100"] ?? ""),
    }));
  }

  for (const row of rows) {
    const municipioId = normalizePartidoCode(row.codigoPartido);
    if (!municipioId || municipioId.length !== 6) continue;
    if (isNaN(row.bandaAnchaPer100)) continue;

    points.push({
      municipioId,
      campo: DataField.BANDA_ANCHA_PER_100,
      anio,
      valorNumerico: row.bandaAnchaPer100,
      unidad: "conn/100h",
      fuenteCapa: SourceLayer.NACIONAL,
      fuenteOrganismo: "ENACOM",
      fuenteUrl: "https://datosabiertos.enacom.gob.ar/dashboards/20000/acceso-a-internet/",
      fuenteFormato: "CSV",
      fuenteFechaAcceso: now,
      confianzaNivel: ConfidenceLevel.ALTA,
      confianzaNotas: "Datos abiertos ENACOM — accesos fijos por partido",
    });
  }

  return points;
}
