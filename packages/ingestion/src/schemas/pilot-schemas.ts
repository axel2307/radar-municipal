/**
 * Zod schemas for the 12 pilot JSON files.
 *
 * Each schema validates the array structure loaded from data/pilot-*.json.
 * Matches the actual JSON shapes (not the DB shapes).
 */

import { z } from "zod";

// ─────────────────────────────────────────
// Shared sub-schemas
// ─────────────────────────────────────────

/** Schema for fuente (source provenance) inside a SourcedValue */
const fuenteSchema = z.object({
  capa: z.string(),
  organismo: z.string(),
  url: z.string().nullable(),
  formato: z.string().nullable(),
  fechaAcceso: z.string(),
  fechaPublicacion: z.string().nullable(),
}).nullable().optional();

/** Schema for confianza (confidence) inside a SourcedValue */
const confianzaSchema = z.object({
  nivel: z.string(),
  notas: z.string().nullable(),
  validadoContra: z.string().nullable(),
}).nullable().optional();

/** Schema for a SourcedValue wrapper (valor + fuente + confianza) */
export const sourcedValueSchema = z.object({
  valor: z.number().nullable(),
  fuente: fuenteSchema,
  confianza: confianzaSchema,
});

export type SourcedValueInput = z.infer<typeof sourcedValueSchema>;

// ─────────────────────────────────────────
// 1. Fiscal (pilot-fiscal.json)
// ─────────────────────────────────────────

export const pilotFiscalEntrySchema = z.object({
  municipioId: z.string(),
  nombre: z.string().optional(),
  anio: z.number().int(),
  trimestre: z.number().int(),
  gastoTotal: sourcedValueSchema,
  gastoPersonal: sourcedValueSchema,
  gastoCapital: sourcedValueSchema,
  deudaTotal: sourcedValueSchema,
  ingresoTotal: sourcedValueSchema,
  resultadoFiscal: sourcedValueSchema,
  gastoPcapita: sourcedValueSchema,
  deudaPcapita: sourcedValueSchema,
  pctPersonal: sourcedValueSchema,
  pctCapital: sourcedValueSchema,
  autonomiaFiscal: sourcedValueSchema.optional(),
  presionTributaria: sourcedValueSchema.optional(),
  eficienciaAdmin: sourcedValueSchema.optional(),
});

export const pilotFiscalArraySchema = z.array(pilotFiscalEntrySchema);
export type PilotFiscalEntry = z.infer<typeof pilotFiscalEntrySchema>;

// ─────────────────────────────────────────
// 2. Audit (pilot-audit.json)
// ─────────────────────────────────────────

const documentAuditSchema = z.object({
  categoria: z.string(),
  publicado: z.boolean(),
  url: z.string().nullable(),
  formato: z.string().nullable(),
  anio: z.number().int().nullable(),
  trimestre: z.number().int().nullable(),
  fechaPublicacion: z.string().nullable(),
  fechaCorte: z.string().nullable(),
  esParseable: z.boolean(),
  notas: z.string().nullable(),
});

const accessibilityAuditSchema = z.object({
  urlPortal: z.string().nullable(),
  portalAccesible: z.boolean(),
  clicksDesdeHome: z.number().int().nullable(),
  menuTransparenciaVisible: z.boolean(),
});

export const pilotAuditEntrySchema = z.object({
  municipioId: z.string(),
  fechaAuditoria: z.string(),
  auditor: z.string(),
  accesibilidad: accessibilityAuditSchema,
  documentos: z.array(documentAuditSchema),
});

export const pilotAuditArraySchema = z.array(pilotAuditEntrySchema);
export type PilotAuditEntryInput = z.infer<typeof pilotAuditEntrySchema>;

// ─────────────────────────────────────────
// 3. Normativa (pilot-normativa.json)
// ─────────────────────────────────────────

const ordenanzaFiscalSchema = z.object({
  municipioId: z.string(),
  tipo: z.string(),
  numero: z.string(),
  anio: z.number().int(),
  fecha: z.string().nullable(),
  titulo: z.string(),
  urlPdf: z.string().nullable(),
}).nullable();

const comprasSchema = z.object({
  publicaLicitaciones: z.boolean(),
  urlPortalCompras: z.string().nullable().optional(),
  publicaAdjudicaciones: z.boolean(),
  licitacionesDetectadas: z.number().int().optional(),
  plataforma: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
}).nullable().optional();

export const pilotNormativaEntrySchema = z.object({
  municipioId: z.string(),
  nombre: z.string().optional(),
  fechaScrape: z.string().optional(),
  normasEncontradas: z.number().int(),
  tieneBoletinSibom: z.boolean(),
  boletinesPublicados: z.number().int(),
  ultimoBoletinAnio: z.number().int().optional(),
  ordenanzaFiscalVigente: ordenanzaFiscalSchema,
  compras: comprasSchema,
});

export const pilotNormativaArraySchema = z.array(pilotNormativaEntrySchema);
export type PilotNormativaEntry = z.infer<typeof pilotNormativaEntrySchema>;

// ─────────────────────────────────────────
// 4. Data Gaps (pilot-data-gaps.json)
// ─────────────────────────────────────────

const gapEntrySchema = z.object({
  campo: z.string(),
  anio: z.number().int(),
  trimestre: z.number().int().nullable().optional(),
  existeEnMunicipal: z.boolean(),
  existeEnProvincial: z.boolean(),
  tipo: z.string(),
});

export const pilotDataGapsEntrySchema = z.object({
  municipioId: z.string(),
  nombre: z.string().optional(),
  gaps: z.array(gapEntrySchema),
});

export const pilotDataGapsArraySchema = z.array(pilotDataGapsEntrySchema);
export type PilotDataGapsEntry = z.infer<typeof pilotDataGapsEntrySchema>;

// ─────────────────────────────────────────
// 5. Servicios Basicos (pilot-servicios-basicos.json)
// ─────────────────────────────────────────

export const pilotServiciosBasicosEntrySchema = z.object({
  municipioId: z.string(),
  nombre: z.string().optional(),
  anio: z.number().int(),
  fuente: z.string().optional(),
  pctAguaRed: z.number().nullable(),
  pctCloaca: z.number().nullable(),
  pctGasRed: z.number().nullable(),
  recoleccionResiduos: z.number().nullable(),
  alumbradoPublico: z.number().nullable(),
  notas: z.string().nullable().optional(),
});

export const pilotServiciosBasicosArraySchema = z.array(pilotServiciosBasicosEntrySchema);
export type PilotServiciosBasicosEntry = z.infer<typeof pilotServiciosBasicosEntrySchema>;

// ─────────────────────────────────────────
// 6. Participacion (pilot-participacion.json)
// ─────────────────────────────────────────

export const pilotParticipacionEntrySchema = z.object({
  municipioId: z.string(),
  nombre: z.string().optional(),
  anio: z.number().int(),
  fuente: z.string().optional(),
  presupuestoParticipativo: z.number().nullable(),
  audienciasPublicas: z.number().nullable(),
  sistemaReclamos: z.number().nullable(),
  transparenciaHcd: z.number().nullable(),
  evidenciaPresupuesto: z.string().nullable().optional(),
  evidenciaAudiencias: z.string().nullable().optional(),
  urlReclamos: z.string().nullable().optional(),
  urlHcd: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
});

export const pilotParticipacionArraySchema = z.array(pilotParticipacionEntrySchema);
export type PilotParticipacionEntry = z.infer<typeof pilotParticipacionEntrySchema>;

// ─────────────────────────────────────────
// 7. Educacion y Salud (pilot-educacion-salud.json)
// ─────────────────────────────────────────

export const pilotEducacionSaludEntrySchema = z.object({
  municipioId: z.string(),
  nombre: z.string().optional(),
  anio: z.number().int(),
  fuente: z.string().optional(),
  escuelasPer10k: z.number().nullable(),
  centrosSaludPer10k: z.number().nullable(),
  camasPer10k: z.number().nullable(),
  jardinesPerNinos: z.number().nullable(),
  notas: z.string().nullable().optional(),
});

export const pilotEducacionSaludArraySchema = z.array(pilotEducacionSaludEntrySchema);
export type PilotEducacionSaludEntry = z.infer<typeof pilotEducacionSaludEntrySchema>;

// ─────────────────────────────────────────
// 8. Conectividad (pilot-conectividad.json)
// ─────────────────────────────────────────

export const pilotConectividadEntrySchema = z.object({
  municipioId: z.string(),
  nombre: z.string().optional(),
  anio: z.number().int(),
  fuente: z.string().optional(),
  pctInternet: z.number().nullable(),
  bandaAnchaPer100: z.number().nullable(),
  pctComputadora: z.number().nullable(),
  serviciosDigitales: z.number().nullable(),
  notas: z.string().nullable().optional(),
});

export const pilotConectividadArraySchema = z.array(pilotConectividadEntrySchema);
export type PilotConectividadEntry = z.infer<typeof pilotConectividadEntrySchema>;

// ─────────────────────────────────────────
// 9. Economia Local (pilot-economia-local.json)
// ─────────────────────────────────────────

export const pilotEconomiaLocalEntrySchema = z.object({
  municipioId: z.string(),
  nombre: z.string().optional(),
  anio: z.number().int(),
  fuente: z.string().optional(),
  empleoPcapita: z.number().nullable(),
  variacionEmpleo: z.number().nullable(),
  empresasPer1000: z.number().nullable(),
  construccion: z.number().nullable(),
  recaudacionPcapita: z.number().nullable(),
  notas: z.string().nullable().optional(),
});

export const pilotEconomiaLocalArraySchema = z.array(pilotEconomiaLocalEntrySchema);
export type PilotEconomiaLocalEntry = z.infer<typeof pilotEconomiaLocalEntrySchema>;

// ─────────────────────────────────────────
// 10. Gasto por Funcion (pilot-gasto-funcion.json)
// ─────────────────────────────────────────

export const pilotGastoFuncionEntrySchema = z.object({
  municipioId: z.string(),
  nombre: z.string().optional(),
  anio: z.number().int(),
  fuente: z.string().optional(),
  pctServiciosSociales: z.number().nullable(),
  pctServiciosEconomicos: z.number().nullable(),
  pctAdminGubernamental: z.number().nullable(),
  pctDeudaPublica: z.number().nullable(),
  notas: z.string().nullable().optional(),
});

export const pilotGastoFuncionArraySchema = z.array(pilotGastoFuncionEntrySchema);
export type PilotGastoFuncionEntry = z.infer<typeof pilotGastoFuncionEntrySchema>;

// ─────────────────────────────────────────
// 11. Seguridad Vial (pilot-seguridad-vial.json)
// ─────────────────────────────────────────

export const pilotSeguridadVialEntrySchema = z.object({
  municipioId: z.string(),
  nombre: z.string().optional(),
  anio: z.number().int(),
  fuente: z.string().optional(),
  siniestrosPer100k: z.number().nullable(),
  kmPavimentadoPerKm2: z.number().nullable(),
  transitoPublico: z.number().nullable(),
  kmCiclovias: z.number().nullable(),
  notas: z.string().nullable().optional(),
});

export const pilotSeguridadVialArraySchema = z.array(pilotSeguridadVialEntrySchema);
export type PilotSeguridadVialEntry = z.infer<typeof pilotSeguridadVialEntrySchema>;

// ─────────────────────────────────────────
// 12. Espacio Publico (pilot-espacio-publico.json)
// ─────────────────────────────────────────

export const pilotEspacioPublicoEntrySchema = z.object({
  municipioId: z.string(),
  nombre: z.string().optional(),
  anio: z.number().int(),
  fuente: z.string().optional(),
  espacioVerdePcapita: z.number().nullable(),
  coberturaArbolado: z.number().nullable(),
  separacionResiduos: z.number().nullable(),
  incidentesAmbientales: z.number().nullable(),
  notas: z.string().nullable().optional(),
});

export const pilotEspacioPublicoArraySchema = z.array(pilotEspacioPublicoEntrySchema);
export type PilotEspacioPublicoEntry = z.infer<typeof pilotEspacioPublicoEntrySchema>;
