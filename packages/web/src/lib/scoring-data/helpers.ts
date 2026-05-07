import {
  type SourcedValue,
  FISCAL_PRIMARY_FIELDS,
  ScoringDimension,
} from "@radar-municipal/core";

import type { FiscalSourcedEntry, FiscalFieldProvenance, ProvenanceSummary } from "./types";

export function buildDimensionMap(scores: {
  transparencia: number;
  fiscal: number | null;
  normativa: number | null;
  serviciosBasicos: number | null;
  participacion: number | null;
  educacionSalud: number | null;
  conectividad: number | null;
  economiaLocal: number | null;
  gastoFuncion: number | null;
  seguridadVial: number | null;
  espacioPublico: number | null;
  presionImpositiva: number | null;
}): Map<ScoringDimension, number | null> {
  return new Map([
    [ScoringDimension.TRANSPARENCIA, scores.transparencia],
    [ScoringDimension.FISCAL, scores.fiscal],
    [ScoringDimension.NORMATIVA, scores.normativa],
    [ScoringDimension.SERVICIOS_BASICOS, scores.serviciosBasicos],
    [ScoringDimension.PARTICIPACION_CIUDADANA, scores.participacion],
    [ScoringDimension.EDUCACION_SALUD, scores.educacionSalud],
    [ScoringDimension.CONECTIVIDAD_DIGITAL, scores.conectividad],
    [ScoringDimension.ECONOMIA_LOCAL, scores.economiaLocal],
    [ScoringDimension.GASTO_POR_FUNCION, scores.gastoFuncion],
    [ScoringDimension.SEGURIDAD_VIAL, scores.seguridadVial],
    [ScoringDimension.ESPACIO_PUBLICO, scores.espacioPublico],
    [ScoringDimension.PRESION_IMPOSITIVA, scores.presionImpositiva],
  ]);
}

export function buildProvenance(entry: FiscalSourcedEntry): FiscalFieldProvenance[] {
  return FISCAL_PRIMARY_FIELDS.map((campo) => {
    const sv = entry[campo] as SourcedValue<number>;
    return {
      campo,
      capa: sv.fuente?.capa ?? null,
      organismo: sv.fuente?.organismo ?? null,
      url: sv.fuente?.url ?? null,
      confianzaNivel: sv.confianza?.nivel ?? null,
      confianzaNotas: sv.confianza?.notas ?? null,
    };
  });
}

export function buildProvenanceSummary(entry: FiscalSourcedEntry): ProvenanceSummary {
  const porCapa: Record<string, number> = {};
  let totalConDato = 0;
  let totalSinDato = 0;

  for (const campo of FISCAL_PRIMARY_FIELDS) {
    const sv = entry[campo] as SourcedValue<number>;
    if (sv.valor != null && sv.fuente) {
      totalConDato++;
      const capa = sv.fuente.capa;
      porCapa[capa] = (porCapa[capa] ?? 0) + 1;
    } else {
      totalSinDato++;
    }
  }

  return { porCapa, totalConDato, totalSinDato };
}
