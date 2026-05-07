/**
 * Dimensión de scoring normativo y de compras.
 *
 * Evalúa la accesibilidad institucional del municipio:
 *   1. Boletín oficial consultable en SIBOM (30%)
 *   2. Ordenanza fiscal vigente publicada (25%)
 *   3. Publicación de licitaciones (25%)
 *   4. Publicación de adjudicaciones (20%)
 */

import type { NormativaData, ComprasData } from "@radar-municipal/core";

export interface NormativaInput {
  normativa: NormativaData;
  compras: ComprasData;
}

export interface NormativaCriterionResult {
  indicador: string;
  descripcion: string;
  valor: number;
  peso: number;
  evidencia: string;
}

export interface NormativaScoreResult {
  scoreTotal: number;
  criterios: NormativaCriterionResult[];
}

const WEIGHTS = {
  boletinSibom: 0.30,
  ordenanzaFiscal: 0.25,
  licitaciones: 0.25,
  adjudicaciones: 0.20,
};

export function scoreNormativa(input: NormativaInput): NormativaScoreResult {
  const { normativa, compras } = input;
  const criterios: NormativaCriterionResult[] = [];

  // 1. Boletín oficial en SIBOM
  let boletinScore = 0;
  let boletinEvidencia = "Sin boletín en SIBOM";
  if (normativa.tieneBoletinSibom) {
    boletinScore = 0.5; // Base: tiene boletín
    if (normativa.ultimoBoletinAnio && normativa.ultimoBoletinAnio >= 2025) {
      boletinScore = 0.8; // Actualizado recientemente
    }
    if (normativa.boletinesPublicados >= 100) {
      boletinScore = 1.0; // Historial amplio
    }
    boletinEvidencia = `${normativa.boletinesPublicados} boletines publicados, último en ${normativa.ultimoBoletinAnio ?? "—"}`;
  }
  criterios.push({
    indicador: "boletin_sibom",
    descripcion: "Boletín oficial en SIBOM",
    valor: boletinScore,
    peso: WEIGHTS.boletinSibom,
    evidencia: boletinEvidencia,
  });

  // 2. Ordenanza fiscal vigente
  const tieneOrdenanza = normativa.ordenanzaFiscalVigente != null;
  const ordenanzaScore = tieneOrdenanza ? 1.0 : 0.0;
  criterios.push({
    indicador: "ordenanza_fiscal",
    descripcion: "Ordenanza fiscal vigente",
    valor: ordenanzaScore,
    peso: WEIGHTS.ordenanzaFiscal,
    evidencia: tieneOrdenanza
      ? `Ord. ${normativa.ordenanzaFiscalVigente!.numero} (${normativa.ordenanzaFiscalVigente!.anio})`
      : "No se encontró ordenanza fiscal vigente",
  });

  // 3. Publicación de licitaciones
  let licitacionScore = 0;
  let licitacionEvidencia = "No publica licitaciones";
  if (compras.publicaLicitaciones) {
    licitacionScore = 0.6;
    if (compras.urlPortalCompras) {
      licitacionScore = 0.8; // Tiene portal dedicado
    }
    if (compras.licitacionesDetectadas >= 10) {
      licitacionScore = 1.0; // Volumen significativo
    }
    licitacionEvidencia = `${compras.licitacionesDetectadas} licitaciones detectadas`;
    if (compras.plataforma) {
      licitacionEvidencia += ` (${compras.plataforma})`;
    }
  }
  criterios.push({
    indicador: "licitaciones",
    descripcion: "Publicación de licitaciones",
    valor: licitacionScore,
    peso: WEIGHTS.licitaciones,
    evidencia: licitacionEvidencia,
  });

  // 4. Publicación de adjudicaciones
  const adjudicacionScore = compras.publicaAdjudicaciones ? 1.0 : 0.0;
  criterios.push({
    indicador: "adjudicaciones",
    descripcion: "Publicación de adjudicaciones",
    valor: adjudicacionScore,
    peso: WEIGHTS.adjudicaciones,
    evidencia: compras.publicaAdjudicaciones
      ? "Publica adjudicaciones"
      : "No publica adjudicaciones",
  });

  const scoreTotal =
    Math.round(
      criterios.reduce((sum, c) => sum + c.valor * c.peso, 0) * 100 * 10
    ) / 10;

  return { scoreTotal, criterios };
}
