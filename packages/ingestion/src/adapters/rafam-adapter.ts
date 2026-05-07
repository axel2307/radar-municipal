/**
 * Convierte RafamParseResult (del RAFAM parser) en DataPointInsert[].
 *
 * Mapea cada campo fiscal extraído a su DataField canónico.
 */

import { DataField, SourceLayer, ConfidenceLevel } from "@radar-municipal/core";
import type { DataPointInsert } from "../writers/data-point-writer";
import { rafamResultSchema } from "../schemas";

/** Shape del RafamParseResult (importado aquí como tipo simple para evitar dep circular) */
interface RafamResult {
  success: boolean;
  tipoDocumento: string;
  anio: number | null;
  trimestre: number | null;
  datos: {
    municipioId?: string;
    gastoTotal?: number | null;
    gastoPersonal?: number | null;
    gastoCapital?: number | null;
    deudaTotal?: number | null;
    ingresoTotal?: number | null;
    resultadoFiscal?: number | null;
    pctPersonal?: number | null;
    pctCapital?: number | null;
  };
  ingresosPorRubro?: {
    tributarios: number | null;
    noTributarios: number | null;
    coparticipacion: number | null;
    transferencias: number | null;
    otros: number | null;
    total: number | null;
  } | null;
  gastoPorFinalidad?: {
    adminGubernamental: number | null;
    serviciosSeguridad: number | null;
    serviciosSociales: number | null;
    serviciosEconomicos: number | null;
    deudaPublica: number | null;
    total: number | null;
  } | null;
  warnings: string[];
}

/**
 * Convierte un RafamParseResult en DataPointInsert[].
 */
export function rafamToDataPoints(
  result: RafamResult,
  municipioId: string,
  sourceUrl: string
): DataPointInsert[] {
  const parseResult = rafamResultSchema.safeParse(result);
  if (!parseResult.success) {
    console.error("Validation failed for RafamResult input:", parseResult.error.format());
    throw new Error(`Invalid RafamResult: ${parseResult.error.issues.length} issue(s)`);
  }

  const points: DataPointInsert[] = [];
  const anio = result.anio ?? new Date().getFullYear();
  const trimestre = result.trimestre ?? null;
  const now = new Date();

  const confianzaNivel = result.success
    ? ConfidenceLevel.MEDIA
    : ConfidenceLevel.BAJA;

  const confianzaNotas = result.warnings.length > 0
    ? result.warnings.join("; ").slice(0, 500)
    : null;

  function addNumeric(campo: DataField, valor: number | null | undefined, unidad?: string) {
    if (valor == null) return;
    points.push({
      municipioId,
      campo,
      anio,
      trimestre,
      valorNumerico: valor,
      unidad: unidad ?? null,
      fuenteCapa: SourceLayer.MUNICIPAL,
      fuenteOrganismo: "PORTAL_MUNICIPAL",
      fuenteUrl: sourceUrl,
      fuenteFormato: "PDF",
      fuenteFechaAcceso: now,
      confianzaNivel,
      confianzaNotas,
    });
  }

  // Fiscal primarios
  const d = result.datos;
  addNumeric(DataField.GASTO_TOTAL, d.gastoTotal, "$");
  addNumeric(DataField.GASTO_PERSONAL, d.gastoPersonal, "$");
  addNumeric(DataField.GASTO_CAPITAL, d.gastoCapital, "$");
  addNumeric(DataField.DEUDA_STOCK, d.deudaTotal, "$");
  addNumeric(DataField.INGRESO_TOTAL, d.ingresoTotal, "$");
  addNumeric(DataField.RESULTADO_FISCAL, d.resultadoFiscal, "$");

  // Fiscal derivados (ratios)
  addNumeric(DataField.PCT_PERSONAL, d.pctPersonal, "%");
  addNumeric(DataField.PCT_CAPITAL, d.pctCapital, "%");

  // Gasto por finalidad → porcentajes
  if (result.gastoPorFinalidad && result.gastoPorFinalidad.total) {
    const total = result.gastoPorFinalidad.total;
    const gf = result.gastoPorFinalidad;

    // Montos absolutos
    addNumeric(DataField.GASTO_SERVICIOS_SOCIALES, gf.serviciosSociales, "$");
    addNumeric(DataField.GASTO_SERVICIOS_ECONOMICOS, gf.serviciosEconomicos, "$");
    addNumeric(DataField.GASTO_ADMIN_GUBERNAMENTAL, gf.adminGubernamental, "$");
    addNumeric(DataField.GASTO_DEUDA_PUBLICA, gf.deudaPublica, "$");
    addNumeric(DataField.GASTO_SEGURIDAD, gf.serviciosSeguridad, "$");

    // Porcentajes
    if (gf.serviciosSociales != null) {
      addNumeric(DataField.PCT_SERVICIOS_SOCIALES, (gf.serviciosSociales / total) * 100, "%");
    }
    if (gf.serviciosEconomicos != null) {
      addNumeric(DataField.PCT_SERVICIOS_ECONOMICOS, (gf.serviciosEconomicos / total) * 100, "%");
    }
    if (gf.adminGubernamental != null) {
      addNumeric(DataField.PCT_ADMIN_GUBERNAMENTAL, (gf.adminGubernamental / total) * 100, "%");
    }
    if (gf.deudaPublica != null) {
      addNumeric(DataField.PCT_DEUDA_PUBLICA, (gf.deudaPublica / total) * 100, "%");
    }
  }

  // Ingresos por rubro
  if (result.ingresosPorRubro) {
    const ir = result.ingresosPorRubro;
    if (ir.tributarios != null) {
      addNumeric(DataField.INGRESO_PROPIO, ir.tributarios + (ir.noTributarios ?? 0), "$");
    }
    if (ir.transferencias != null || ir.coparticipacion != null) {
      addNumeric(
        DataField.TRANSFERENCIAS,
        (ir.transferencias ?? 0) + (ir.coparticipacion ?? 0),
        "$"
      );
    }
    // Autonomía fiscal = ingresos propios / ingresos totales
    if (ir.tributarios != null && ir.total != null && ir.total > 0) {
      const propios = ir.tributarios + (ir.noTributarios ?? 0);
      addNumeric(DataField.AUTONOMIA_FISCAL, (propios / ir.total) * 100, "%");
    }
  }

  return points;
}
