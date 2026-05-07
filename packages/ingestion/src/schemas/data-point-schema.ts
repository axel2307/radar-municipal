/**
 * Zod schema for DataPointInsert — the shape that goes into
 * upsertDataPoint / upsertDataPointsBatch.
 */

import { z } from "zod";

export const dataPointInsertSchema = z.object({
  municipioId: z.string().min(1),
  campo: z.string().min(1),
  anio: z.number().int(),
  trimestre: z.number().int().nullable().optional(),
  fechaCorte: z.date().nullable().optional(),
  valorNumerico: z.number().nullable().optional(),
  valorTexto: z.string().nullable().optional(),
  valorBooleano: z.boolean().nullable().optional(),
  unidad: z.string().nullable().optional(),
  fuenteCapa: z.string().min(1),
  fuenteOrganismo: z.string().min(1),
  fuenteUrl: z.string().nullable().optional(),
  fuenteFormato: z.string().nullable().optional(),
  fuenteFechaAcceso: z.date(),
  fuenteFechaPublicacion: z.date().nullable().optional(),
  confianzaNivel: z.string().min(1),
  confianzaNotas: z.string().nullable().optional(),
  confianzaValidadoContra: z.string().nullable().optional(),
});

export type DataPointInsertInput = z.infer<typeof dataPointInsertSchema>;

/**
 * Schema for the crawl result shape consumed by crawl-adapter.
 */
export const crawlResultSchema = z.object({
  municipioId: z.string().min(1),
  portalUrl: z.string(),
  portalAccesible: z.boolean(),
  documentos: z.array(
    z.object({
      categoria: z.string().min(1),
      url: z.string().nullable(),
      formato: z.string().min(1),
      anio: z.number().int(),
      trimestre: z.number().int().nullable().optional(),
      esParseable: z.boolean(),
      fechaPublicacion: z.date().nullable().optional(),
      fechaCorte: z.date().nullable().optional(),
    })
  ),
});

export type CrawlResultInput = z.infer<typeof crawlResultSchema>;

/**
 * Schema for the SIBOM result shape consumed by crawl-adapter.
 */
export const sibomResultSchema = z.object({
  municipioId: z.string().min(1),
  normasEncontradas: z.number().int(),
  tieneBoletinSibom: z.boolean(),
  boletinesPublicados: z.number().int(),
  ordenanzaFiscalVigente: z.boolean(),
  ordenanzaFiscalUrl: z.string().nullable().optional(),
});

export type SibomResultInput = z.infer<typeof sibomResultSchema>;

/**
 * Schema for the RAFAM parse result shape consumed by rafam-adapter.
 */
export const rafamResultSchema = z.object({
  success: z.boolean(),
  tipoDocumento: z.string(),
  anio: z.number().int().nullable(),
  trimestre: z.number().int().nullable(),
  datos: z.object({
    municipioId: z.string().optional(),
    gastoTotal: z.number().nullable().optional(),
    gastoPersonal: z.number().nullable().optional(),
    gastoCapital: z.number().nullable().optional(),
    deudaTotal: z.number().nullable().optional(),
    ingresoTotal: z.number().nullable().optional(),
    resultadoFiscal: z.number().nullable().optional(),
    pctPersonal: z.number().nullable().optional(),
    pctCapital: z.number().nullable().optional(),
  }),
  ingresosPorRubro: z
    .object({
      tributarios: z.number().nullable(),
      noTributarios: z.number().nullable(),
      coparticipacion: z.number().nullable(),
      transferencias: z.number().nullable(),
      otros: z.number().nullable(),
      total: z.number().nullable(),
    })
    .nullable()
    .optional(),
  gastoPorFinalidad: z
    .object({
      adminGubernamental: z.number().nullable(),
      serviciosSeguridad: z.number().nullable(),
      serviciosSociales: z.number().nullable(),
      serviciosEconomicos: z.number().nullable(),
      deudaPublica: z.number().nullable(),
      total: z.number().nullable(),
    })
    .nullable()
    .optional(),
  warnings: z.array(z.string()),
});

export type RafamResultInput = z.infer<typeof rafamResultSchema>;
