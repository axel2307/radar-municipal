/**
 * Bulk loader for local economy data.
 *
 * Covers: ECONOMIA_LOCAL — EMPLEO_REGISTRADO_PER_CAPITA, VARIACION_EMPLEO_INTERANUAL, EMPRESAS_PER_CAPITA
 *
 * Sources: OEDE (Observatorio de Empleo y Dinámica Empresarial), AFIP
 * Layer: NACIONAL
 */

import { DataField, SourceLayer, ConfidenceLevel } from "@radar-municipal/core";
import type { DataPointInsert } from "../writers/data-point-writer";
import { parseCsv, parseJson, normalizePartidoCode } from "./base-loader";

interface EconomiaRow {
  codigoPartido: string;
  empleoPcapita?: number;
  variacionEmpleo?: number;
  empresasPer1000?: number;
}

export function loadEconomia(
  filePath: string,
  anio: number = 2024
): DataPointInsert[] {
  const points: DataPointInsert[] = [];
  const now = new Date();

  let rows: EconomiaRow[];

  if (filePath.endsWith(".json")) {
    rows = parseJson<EconomiaRow[]>(filePath);
  } else {
    const csvRows = parseCsv(filePath, ";");
    rows = csvRows.map((r) => ({
      codigoPartido: r["codigo_partido"] ?? r["partido_id"] ?? "",
      empleoPcapita: parseFloat(r["empleo_pcapita"] ?? r["empleo_per_capita"] ?? ""),
      variacionEmpleo: parseFloat(r["variacion_empleo"] ?? r["var_empleo_ia"] ?? ""),
      empresasPer1000: parseFloat(r["empresas_per_1000"] ?? r["empresas_per_capita"] ?? ""),
    }));
  }

  for (const row of rows) {
    const municipioId = normalizePartidoCode(row.codigoPartido);
    if (!municipioId || municipioId.length !== 6) continue;

    function add(campo: DataField, valor: number | undefined, unidad: string) {
      if (valor == null || isNaN(valor)) return;
      points.push({
        municipioId,
        campo,
        anio,
        valorNumerico: valor,
        unidad,
        fuenteCapa: SourceLayer.NACIONAL,
        fuenteOrganismo: "OEDE",
        fuenteUrl: "https://www.trabajo.gob.ar/estadisticas/oede/",
        fuenteFormato: "CSV",
        fuenteFechaAcceso: now,
        confianzaNivel: ConfidenceLevel.MEDIA,
      });
    }

    add(DataField.EMPLEO_REGISTRADO_PER_CAPITA, row.empleoPcapita, "emp/hab");
    add(DataField.VARIACION_EMPLEO_INTERANUAL, row.variacionEmpleo, "%");
    add(DataField.EMPRESAS_PER_CAPITA, row.empresasPer1000, "emp/1000hab");
  }

  return points;
}
