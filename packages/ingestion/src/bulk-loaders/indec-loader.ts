/**
 * Bulk loader for INDEC Censo 2022 data.
 *
 * Covers:
 * - SERVICIOS_BASICOS: PCT_AGUA_RED, PCT_CLOACA, PCT_GAS_RED
 * - CONECTIVIDAD (partial): PCT_INTERNET, PCT_COMPUTADORA
 *
 * Source: INDEC Censo Nacional de Población, Hogares y Viviendas 2022
 * Layer: NACIONAL
 */

import { DataField, SourceLayer, ConfidenceLevel } from "@radar-municipal/core";
import type { DataPointInsert } from "../writers/data-point-writer";
import { parseCsv, parseJson, normalizePartidoCode } from "./base-loader";

/** Expected row from INDEC census CSV */
interface IndecCensoRow {
  codigoPartido: string;
  pctAguaRed?: number;
  pctCloaca?: number;
  pctGasRed?: number;
  pctInternet?: number;
  pctComputadora?: number;
}

/**
 * Load INDEC census data from a JSON or CSV file.
 */
export function loadIndecCenso(
  filePath: string,
  anio: number = 2022
): DataPointInsert[] {
  const points: DataPointInsert[] = [];
  const now = new Date();

  let rows: IndecCensoRow[];

  if (filePath.endsWith(".json")) {
    rows = parseJson<IndecCensoRow[]>(filePath);
  } else {
    const csvRows = parseCsv(filePath, ";");
    rows = csvRows.map((r) => ({
      codigoPartido: r["codigo_partido"] ?? r["cod_partido"] ?? r["partido_id"] ?? "",
      pctAguaRed: parseFloat(r["pct_agua_red"] ?? r["agua_red"] ?? ""),
      pctCloaca: parseFloat(r["pct_cloaca"] ?? r["cloaca"] ?? ""),
      pctGasRed: parseFloat(r["pct_gas_red"] ?? r["gas_red"] ?? ""),
      pctInternet: parseFloat(r["pct_internet"] ?? r["internet"] ?? ""),
      pctComputadora: parseFloat(r["pct_computadora"] ?? r["computadora"] ?? ""),
    }));
  }

  const FUENTE_URL = "https://www.indec.gob.ar/indec/web/Nivel4-Tema-2-41-165";

  for (const row of rows) {
    const municipioId = normalizePartidoCode(row.codigoPartido);
    if (!municipioId || municipioId.length !== 6) continue;

    const base = {
      fuenteCapa: SourceLayer.NACIONAL,
      fuenteOrganismo: "INDEC",
      fuenteUrl: FUENTE_URL,
      fuenteFormato: "XLSX",
      fuenteFechaAcceso: now,
      confianzaNivel: ConfidenceLevel.ALTA,
      confianzaNotas: "Censo Nacional 2022 — datos definitivos",
    };

    function addIfValid(campo: DataField, valor: number | undefined, unidad: string) {
      if (valor == null || isNaN(valor)) return;
      points.push({
        municipioId,
        campo,
        anio,
        valorNumerico: valor,
        unidad,
        ...base,
      });
    }

    addIfValid(DataField.PCT_AGUA_RED, row.pctAguaRed, "%");
    addIfValid(DataField.PCT_CLOACA, row.pctCloaca, "%");
    addIfValid(DataField.PCT_GAS_RED, row.pctGasRed, "%");
    addIfValid(DataField.PCT_INTERNET, row.pctInternet, "%");
    addIfValid(DataField.PCT_COMPUTADORA, row.pctComputadora, "%");
  }

  return points;
}
