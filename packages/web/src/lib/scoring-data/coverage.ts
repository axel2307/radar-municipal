import {
  MUNICIPIOS,
  ScoringDimension,
  SCORING_DIMENSION_LABELS,
} from "@radar-municipal/core";

import type { RankingEntry } from "./types";
import { getRanking } from "./ranking";
import {
  auditMap,
  allFiscalSourced,
  allNormativaData,
} from "./loaders";
import { allPresionImpositivaData } from "./presion-impositiva";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface DimensionCoverageDetail {
  /** Slug usado en URLs (ej: "transparencia", "educacion-salud") */
  slug: string;
  /** Enum ScoringDimension subyacente */
  dimension: ScoringDimension;
  /** Label en español */
  label: string;
  /** true si hay score calculado (data cargada) */
  present: boolean;
  /** Valor del score 0..100 o null si no hay dato */
  score: number | null;
  /** Fecha ISO de última actualización para esta dimensión; null si no hay dato */
  ultimaFecha: string | null;
  /** Nota sobre el origen de la fecha (ej: "fecha de publicación del documento") */
  fuenteNota: string | null;
}

export interface MunicipioCoverage {
  municipioId: string;
  nombre: string;
  partido: string;
  region: string;
  poblacion: number;
  esPiloto: boolean;
  /** Cantidad de dimensiones con data (0..12) */
  dimensionsPresent: number;
  /** Siempre 12 */
  dimensionsTotal: number;
  /** Porcentaje 0..100, redondeado a enteros */
  porcentajeCobertura: number;
  /** Fecha ISO de última actualización global del municipio (fechaAuditoria). null si no-piloto. */
  ultimaActualizacion: string | null;
  /** Días desde la última actualización (calculado con Date.now()). null si no hay fecha. */
  diasDesdeActualizacion: number | null;
  /** Detalle por dimensión (siempre 12 entries, aunque sin data) */
  dimensionDetails: DimensionCoverageDetail[];
  /** Cantidad de brechas de datos registradas en pilot-data-gaps.json */
  brechas: number;
}

export interface CoverageStats {
  totalMunicipios: number;
  /** Municipios con >= 1 dimensión cargada */
  conDatos: number;
  sinDatos: number;
  /** Cobertura promedio sobre los municipios con al menos un dato (0..100) */
  coberturaPromedioPiloto: number;
  /** Fecha ISO más reciente entre todos los municipios */
  ultimaActualizacionGlobal: string | null;
  diasDesdeActualizacion: number | null;
  brechasTotales: number;
}

// ─────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────

/** Mapping dimension → (slug, scoreField, getFecha) */
interface DimensionSpec {
  slug: string;
  dimension: ScoringDimension;
  label: string;
  scoreField: keyof RankingEntry;
  /** Obtener fecha para este (municipioId, dimension) del mejor origen disponible. */
  getFecha: (municipioId: string) => { fecha: string | null; nota: string | null };
}

/** Max ISO date entre varias (ignora null/empty) */
function maxIsoDate(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => !!d && d.length > 0);
  if (valid.length === 0) return null;
  return valid.reduce((max, cur) => (cur > max ? cur : max), valid[0]);
}

/** Días (enteros) entre hoy y una fecha ISO. null si la fecha es null o inválida. */
function diasDesde(fechaIso: string | null): number | null {
  if (!fechaIso) return null;
  const then = new Date(fechaIso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/** Categorías de documento de transparencia (audit) mapeadas sueltamente a la dimensión TRANSPARENCIA */
const TRANSPARENCIA_DOC_CATEGORIES = new Set([
  "PRESUPUESTO",
  "EJECUCION",
  "SEF",
  "DEUDA",
  "FINALIDAD_FUNCION",
  "ORDENANZA_FISCAL",
]);

/** Build the spec array (declarado como función para capturar el closure de loaders) */
function buildDimensionSpecs(): DimensionSpec[] {
  return [
    {
      slug: "transparencia",
      dimension: ScoringDimension.TRANSPARENCIA,
      label: SCORING_DIMENSION_LABELS[ScoringDimension.TRANSPARENCIA],
      scoreField: "scoreTransparencia",
      getFecha: (id) => {
        const audit = auditMap.get(id);
        if (!audit) return { fecha: null, nota: null };
        const docDates = (audit.documentos ?? [])
          .filter((d) => TRANSPARENCIA_DOC_CATEGORIES.has(d.categoria))
          .map((d) => d.fechaPublicacion ?? null);
        const latest = maxIsoDate([audit.fechaAuditoria, ...docDates]);
        return {
          fecha: latest,
          nota: latest ? "última publicación de documento relevado" : null,
        };
      },
    },
    {
      slug: "fiscal",
      dimension: ScoringDimension.FISCAL,
      label: SCORING_DIMENSION_LABELS[ScoringDimension.FISCAL],
      scoreField: "scoreFiscal",
      getFecha: (id) => {
        const fiscal = allFiscalSourced.get(id);
        if (!fiscal) return { fecha: null, nota: null };
        const fechas = [
          fiscal.gastoTotal?.fuente?.fechaPublicacion,
          fiscal.gastoPersonal?.fuente?.fechaPublicacion,
          fiscal.gastoCapital?.fuente?.fechaPublicacion,
          fiscal.deudaTotal?.fuente?.fechaPublicacion,
          fiscal.ingresoTotal?.fuente?.fechaPublicacion,
          fiscal.resultadoFiscal?.fuente?.fechaPublicacion,
        ];
        const latest = maxIsoDate(fechas);
        return {
          fecha: latest ?? auditMap.get(id)?.fechaAuditoria ?? null,
          nota: latest
            ? "fecha de publicación de la fuente fiscal"
            : "fecha de auditoría del piloto",
        };
      },
    },
    {
      slug: "normativa",
      dimension: ScoringDimension.NORMATIVA,
      label: SCORING_DIMENSION_LABELS[ScoringDimension.NORMATIVA],
      scoreField: "scoreNormativa",
      getFecha: (id) => {
        const norm = allNormativaData.get(id);
        if (!norm) return { fecha: null, nota: null };
        return {
          fecha: norm.fechaScrape ?? null,
          nota: norm.fechaScrape ? "fecha de scrape del boletín" : null,
        };
      },
    },
    {
      slug: "participacion-ciudadana",
      dimension: ScoringDimension.PARTICIPACION_CIUDADANA,
      label: SCORING_DIMENSION_LABELS[ScoringDimension.PARTICIPACION_CIUDADANA],
      scoreField: "scoreParticipacion",
      getFecha: (id) => ({
        fecha: auditMap.get(id)?.fechaAuditoria ?? null,
        nota: auditMap.get(id) ? "fecha de auditoría del piloto" : null,
      }),
    },
    {
      slug: "gasto-por-funcion",
      dimension: ScoringDimension.GASTO_POR_FUNCION,
      label: SCORING_DIMENSION_LABELS[ScoringDimension.GASTO_POR_FUNCION],
      scoreField: "scoreGastoFuncion",
      getFecha: (id) => ({
        fecha: auditMap.get(id)?.fechaAuditoria ?? null,
        nota: auditMap.get(id) ? "fecha de auditoría del piloto" : null,
      }),
    },
    {
      slug: "economia-local",
      dimension: ScoringDimension.ECONOMIA_LOCAL,
      label: SCORING_DIMENSION_LABELS[ScoringDimension.ECONOMIA_LOCAL],
      scoreField: "scoreEconomiaLocal",
      getFecha: (id) => ({
        fecha: auditMap.get(id)?.fechaAuditoria ?? null,
        nota: auditMap.get(id) ? "fecha de auditoría del piloto" : null,
      }),
    },
    {
      slug: "presion-impositiva",
      dimension: ScoringDimension.PRESION_IMPOSITIVA,
      label: SCORING_DIMENSION_LABELS[ScoringDimension.PRESION_IMPOSITIVA],
      scoreField: "scorePresionImpositiva",
      getFecha: (id) => {
        const data = allPresionImpositivaData.get(id);
        if (!data) return { fecha: null, nota: null };
        const fechas = [
          data.montoVivienda.fuente?.fechaPublicacion,
          data.montoComercio.fuente?.fechaPublicacion,
          data.montoRural.fuente?.fechaPublicacion,
          data.montoConstruccion.fuente?.fechaPublicacion,
        ];
        const latest = maxIsoDate(fechas);
        if (latest) {
          return {
            fecha: latest,
            nota: "fecha de publicación de la ordenanza impositiva",
          };
        }
        // Fallback: usar 31 de diciembre del año fiscal para ubicar en timeline
        return {
          fecha: `${data.anioFiscal}-12-31`,
          nota: `año fiscal ${data.anioFiscal}`,
        };
      },
    },
    {
      slug: "servicios-basicos",
      dimension: ScoringDimension.SERVICIOS_BASICOS,
      label: SCORING_DIMENSION_LABELS[ScoringDimension.SERVICIOS_BASICOS],
      scoreField: "scoreServiciosBasicos",
      getFecha: (id) => ({
        fecha: auditMap.get(id)?.fechaAuditoria ?? null,
        nota: auditMap.get(id) ? "fecha de auditoría del piloto" : null,
      }),
    },
    {
      slug: "educacion-salud",
      dimension: ScoringDimension.EDUCACION_SALUD,
      label: SCORING_DIMENSION_LABELS[ScoringDimension.EDUCACION_SALUD],
      scoreField: "scoreEducacionSalud",
      getFecha: (id) => ({
        fecha: auditMap.get(id)?.fechaAuditoria ?? null,
        nota: auditMap.get(id) ? "fecha de auditoría del piloto" : null,
      }),
    },
    {
      slug: "conectividad-digital",
      dimension: ScoringDimension.CONECTIVIDAD_DIGITAL,
      label: SCORING_DIMENSION_LABELS[ScoringDimension.CONECTIVIDAD_DIGITAL],
      scoreField: "scoreConectividad",
      getFecha: (id) => ({
        fecha: auditMap.get(id)?.fechaAuditoria ?? null,
        nota: auditMap.get(id) ? "fecha de auditoría del piloto" : null,
      }),
    },
    {
      slug: "espacio-publico",
      dimension: ScoringDimension.ESPACIO_PUBLICO,
      label: SCORING_DIMENSION_LABELS[ScoringDimension.ESPACIO_PUBLICO],
      scoreField: "scoreEspacioPublico",
      getFecha: (id) => ({
        fecha: auditMap.get(id)?.fechaAuditoria ?? null,
        nota: auditMap.get(id) ? "fecha de auditoría del piloto" : null,
      }),
    },
    {
      slug: "seguridad-vial",
      dimension: ScoringDimension.SEGURIDAD_VIAL,
      label: SCORING_DIMENSION_LABELS[ScoringDimension.SEGURIDAD_VIAL],
      scoreField: "scoreSeguridadVial",
      getFecha: (id) => ({
        fecha: auditMap.get(id)?.fechaAuditoria ?? null,
        nota: auditMap.get(id) ? "fecha de auditoría del piloto" : null,
      }),
    },
  ];
}

// ─────────────────────────────────────────
// API
// ─────────────────────────────────────────

/**
 * Reporte completo de cobertura: una entrada por cada uno de los 135 municipios.
 * Los no-piloto tienen dimensionsPresent=0, porcentajeCobertura=0 y ultimaActualizacion=null.
 */
export function getCoverageReport(): MunicipioCoverage[] {
  const ranking = getRanking();
  const rankingById = new Map(ranking.map((r) => [r.municipio.id, r]));
  const specs = buildDimensionSpecs();

  return MUNICIPIOS.map((m) => {
    const entry = rankingById.get(m.id);
    const dimensionDetails: DimensionCoverageDetail[] = specs.map((spec) => {
      const score = entry ? ((entry[spec.scoreField] as number | null) ?? null) : null;
      const present = score !== null;
      const { fecha, nota } = present
        ? spec.getFecha(m.id)
        : { fecha: null, nota: null };
      return {
        slug: spec.slug,
        dimension: spec.dimension,
        label: spec.label,
        present,
        score,
        ultimaFecha: fecha,
        fuenteNota: nota,
      };
    });

    const dimensionsPresent = dimensionDetails.filter((d) => d.present).length;
    const dimensionsTotal = specs.length;
    const porcentajeCobertura =
      dimensionsTotal === 0 ? 0 : Math.round((dimensionsPresent / dimensionsTotal) * 100);

    const ultimaActualizacion = entry ? auditMap.get(m.id)?.fechaAuditoria ?? null : null;

    return {
      municipioId: m.id,
      nombre: m.nombre,
      partido: m.partido,
      region: m.region,
      poblacion: m.poblacion ?? 0,
      esPiloto: m.esPiloto,
      dimensionsPresent,
      dimensionsTotal,
      porcentajeCobertura,
      ultimaActualizacion,
      diasDesdeActualizacion: diasDesde(ultimaActualizacion),
      dimensionDetails,
      brechas: entry?.cantidadBrechas ?? 0,
    };
  });
}

/** Stats agregados para las 4 tarjetas KPI del panel */
export function getCoverageStats(): CoverageStats {
  const report = getCoverageReport();
  const conDatos = report.filter((r) => r.dimensionsPresent > 0);
  const conDatosCount = conDatos.length;
  const sumCobertura = conDatos.reduce((s, r) => s + r.porcentajeCobertura, 0);
  const coberturaPromedioPiloto =
    conDatosCount === 0 ? 0 : Math.round(sumCobertura / conDatosCount);

  const ultimaActualizacionGlobal = maxIsoDate(
    report.map((r) => r.ultimaActualizacion),
  );

  const brechasTotales = report.reduce((s, r) => s + r.brechas, 0);

  return {
    totalMunicipios: report.length,
    conDatos: conDatosCount,
    sinDatos: report.length - conDatosCount,
    coberturaPromedioPiloto,
    ultimaActualizacionGlobal,
    diasDesdeActualizacion: diasDesde(ultimaActualizacionGlobal),
    brechasTotales,
  };
}
