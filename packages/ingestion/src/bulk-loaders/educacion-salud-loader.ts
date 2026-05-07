/**
 * Bulk loader for education and health data.
 *
 * Covers: EDUCACION_SALUD — ESCUELAS_PER_10K, CENTROS_SALUD_PER_10K, CAMAS_PER_10K, JARDINES_PER_NINOS
 *
 * Sources: Mapa Educativo Nacional, REFES (Registro Federal de Establecimientos de Salud), INDEC
 * Layer: NACIONAL
 */

import { DataField, SourceLayer, ConfidenceLevel } from "@radar-municipal/core";
import type { DataPointInsert } from "../writers/data-point-writer";
import { parseCsv, parseJson, normalizePartidoCode } from "./base-loader";

interface EducacionSaludRow {
  codigoPartido: string;
  escuelasPer10k?: number;
  centrosSaludPer10k?: number;
  camasPer10k?: number;
  jardinesPerNinos?: number;
}

export function loadEducacionSalud(
  filePath: string,
  anio: number = 2024
): DataPointInsert[] {
  const points: DataPointInsert[] = [];
  const now = new Date();

  let rows: EducacionSaludRow[];

  if (filePath.endsWith(".json")) {
    rows = parseJson<EducacionSaludRow[]>(filePath);
  } else {
    const csvRows = parseCsv(filePath, ";");
    rows = csvRows.map((r) => ({
      codigoPartido: r["codigo_partido"] ?? r["partido_id"] ?? "",
      escuelasPer10k: parseFloat(r["escuelas_per_10k"] ?? ""),
      centrosSaludPer10k: parseFloat(r["centros_salud_per_10k"] ?? ""),
      camasPer10k: parseFloat(r["camas_per_10k"] ?? ""),
      jardinesPerNinos: parseFloat(r["jardines_per_ninos"] ?? ""),
    }));
  }

  for (const row of rows) {
    const municipioId = normalizePartidoCode(row.codigoPartido);
    if (!municipioId || municipioId.length !== 6) continue;

    function add(campo: DataField, valor: number | undefined, unidad: string, organismo: string) {
      if (valor == null || isNaN(valor)) return;
      points.push({
        municipioId,
        campo,
        anio,
        valorNumerico: valor,
        unidad,
        fuenteCapa: SourceLayer.NACIONAL,
        fuenteOrganismo: organismo,
        fuenteFechaAcceso: now,
        confianzaNivel: ConfidenceLevel.MEDIA,
      });
    }

    add(DataField.ESCUELAS_PER_10K, row.escuelasPer10k, "esc/10kh", "MAPA_EDUCATIVO");
    add(DataField.CENTROS_SALUD_PER_10K, row.centrosSaludPer10k, "cs/10kh", "REFES_SALUD");
    add(DataField.CAMAS_PER_10K, row.camasPer10k, "camas/10kh", "REFES_SALUD");
    add(DataField.JARDINES_PER_NINOS, row.jardinesPerNinos, "jardines/1000niños", "MAPA_EDUCATIVO");
  }

  return points;
}
