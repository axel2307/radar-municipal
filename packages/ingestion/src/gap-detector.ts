/**
 * Detector de brechas de datos (data gaps).
 *
 * Después de la ingesta, detecta qué campos faltan para cada municipio
 * y clasifica el tipo de brecha.
 */

import { eq, and, inArray } from "drizzle-orm";
import { DataField, DataGapType, SourceLayer } from "@radar-municipal/core";
import { dataPoints, dataGaps, type DrizzleDb } from "@radar-municipal/core/db";

export interface DataGapInsert {
  municipioId: string;
  campo: string;
  anio: number;
  trimestre?: number | null;
  existeEnMunicipal: boolean;
  existeEnProvincial: boolean;
  tipo: string;
}

/**
 * Detecta y almacena data gaps para un municipio.
 */
export async function detectAndStoreDataGaps(
  db: DrizzleDb,
  municipioId: string,
  anio: number,
  requiredFields: DataField[]
): Promise<DataGapInsert[]> {
  // Get all existing dataPoints for this municipio
  const existing = await db
    .select({
      campo: dataPoints.campo,
      fuenteCapa: dataPoints.fuenteCapa,
    })
    .from(dataPoints)
    .where(
      and(
        eq(dataPoints.municipioId, municipioId),
        eq(dataPoints.anio, anio),
        inArray(dataPoints.campo, requiredFields)
      )
    );

  // Build a set of existing fields by layer
  const municipalFields = new Set<string>();
  const provincialFields = new Set<string>();
  const allFields = new Set<string>();

  for (const row of existing) {
    allFields.add(row.campo);
    if (row.fuenteCapa === SourceLayer.MUNICIPAL) {
      municipalFields.add(row.campo);
    }
    if (row.fuenteCapa === SourceLayer.PROVINCIAL) {
      provincialFields.add(row.campo);
    }
  }

  const gaps: DataGapInsert[] = [];

  for (const field of requiredFields) {
    if (allFields.has(field)) continue; // Field exists, no gap

    const existeEnMunicipal = municipalFields.has(field);
    const existeEnProvincial = provincialFields.has(field);

    // Classify gap type
    let tipo: string;
    if (existeEnProvincial && !existeEnMunicipal) {
      // Province has it, municipality doesn't publish it → they could
      tipo = DataGapType.PROACTIVIDAD;
    } else if (municipalFields.size > 0 && !existeEnMunicipal) {
      // Municipality publishes some things but not this one
      tipo = DataGapType.OPACIDAD_SELECTIVA;
    } else if (municipalFields.size === 0 && provincialFields.size === 0) {
      // Nothing found anywhere
      tipo = DataGapType.SIN_DATOS;
    } else {
      tipo = DataGapType.CONSISTENTE;
    }

    gaps.push({
      municipioId,
      campo: field,
      anio,
      existeEnMunicipal,
      existeEnProvincial,
      tipo,
    });
  }

  // Write gaps to DB
  for (const gap of gaps) {
    await db
      .insert(dataGaps)
      .values({
        municipioId: gap.municipioId,
        campo: gap.campo,
        anio: gap.anio,
        trimestre: gap.trimestre ?? null,
        existeEnMunicipal: gap.existeEnMunicipal,
        existeEnProvincial: gap.existeEnProvincial,
        tipo: gap.tipo,
      })
      .onConflictDoUpdate({
        target: [
          dataGaps.municipioId,
          dataGaps.campo,
          dataGaps.anio,
          dataGaps.trimestre,
        ],
        set: {
          existeEnMunicipal: gap.existeEnMunicipal,
          existeEnProvincial: gap.existeEnProvincial,
          tipo: gap.tipo,
        },
      });
  }

  return gaps;
}
