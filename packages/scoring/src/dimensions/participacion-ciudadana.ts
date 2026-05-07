/**
 * Dimensión de scoring de participación ciudadana.
 *
 * Evalúa si el municipio ofrece mecanismos para que el ciudadano incida:
 *   1. Presupuesto participativo activo (30%)
 *   2. Mecanismo de audiencias públicas (25%)
 *   3. Sistema de reclamos/trámites online (25%)
 *   4. Transparencia del HCD (actas/votaciones publicadas) (20%)
 *
 * Fuentes: SIBOM (ordenanzas), portales municipales, sitios HCD.
 */

export interface ParticipacionInput {
  /** Presupuesto participativo: 0=no tiene, 0.5=existe pero dormido, 1=activo con proyectos recientes */
  presupuestoParticipativo: number | null;
  /** Audiencias públicas: 0=no tiene, 0.5=ordenanza existe, 1=se realizan periódicamente */
  audienciasPublicas: number | null;
  /** Sistema de reclamos online: 0=no tiene, 0.5=mail/formulario básico, 1=sistema integrado con seguimiento */
  sistemaReclamos: number | null;
  /** Transparencia del HCD: 0=no publica nada, 0.5=publica actas, 1=publica actas + votaciones nominales */
  transparenciaHcd: number | null;
  /** Evidencia textual de presupuesto participativo (para UI) */
  evidenciaPresupuesto: string | null;
  /** Evidencia textual de audiencias (para UI) */
  evidenciaAudiencias: string | null;
  /** URL del sistema de reclamos si existe */
  urlReclamos: string | null;
  /** URL del HCD si existe */
  urlHcd: string | null;
}

export interface ParticipacionCriterionResult {
  indicador: string;
  descripcion: string;
  valor: number;
  peso: number;
  evidencia: string;
}

export interface ParticipacionScoreResult {
  scoreTotal: number;
  criterios: ParticipacionCriterionResult[];
}

const WEIGHTS = {
  presupuestoParticipativo: 0.30,
  audienciasPublicas: 0.25,
  sistemaReclamos: 0.25,
  transparenciaHcd: 0.20,
};

export function scoreParticipacion(
  input: ParticipacionInput
): ParticipacionScoreResult {
  const criterios: ParticipacionCriterionResult[] = [];

  // 1. Presupuesto participativo
  const ppScore = input.presupuestoParticipativo ?? 0;
  criterios.push({
    indicador: "presupuesto_participativo",
    descripcion: "Presupuesto participativo",
    valor: ppScore,
    peso: WEIGHTS.presupuestoParticipativo,
    evidencia: input.evidenciaPresupuesto
      ?? (ppScore >= 1
        ? "Programa activo con proyectos recientes"
        : ppScore >= 0.5
          ? "Programa existe pero sin actividad reciente"
          : "No tiene presupuesto participativo"),
  });

  // 2. Audiencias públicas
  const apScore = input.audienciasPublicas ?? 0;
  criterios.push({
    indicador: "audiencias_publicas",
    descripcion: "Mecanismo de audiencias públicas",
    valor: apScore,
    peso: WEIGHTS.audienciasPublicas,
    evidencia: input.evidenciaAudiencias
      ?? (apScore >= 1
        ? "Audiencias públicas periódicas"
        : apScore >= 0.5
          ? "Ordenanza de audiencias existe"
          : "Sin mecanismo de audiencias públicas"),
  });

  // 3. Sistema de reclamos
  const srScore = input.sistemaReclamos ?? 0;
  let srEvidencia = "Sin sistema de reclamos online";
  if (srScore >= 1) {
    srEvidencia = "Sistema integrado con seguimiento";
  } else if (srScore >= 0.5) {
    srEvidencia = "Formulario o mail de contacto";
  }
  if (input.urlReclamos) {
    srEvidencia += ` (${input.urlReclamos})`;
  }
  criterios.push({
    indicador: "sistema_reclamos",
    descripcion: "Sistema de reclamos online",
    valor: srScore,
    peso: WEIGHTS.sistemaReclamos,
    evidencia: srEvidencia,
  });

  // 4. Transparencia del HCD
  const hcdScore = input.transparenciaHcd ?? 0;
  let hcdEvidencia = "HCD no publica información";
  if (hcdScore >= 1) {
    hcdEvidencia = "Publica actas y votaciones nominales";
  } else if (hcdScore >= 0.5) {
    hcdEvidencia = "Publica actas de sesiones";
  }
  if (input.urlHcd) {
    hcdEvidencia += ` (${input.urlHcd})`;
  }
  criterios.push({
    indicador: "transparencia_hcd",
    descripcion: "Transparencia del Concejo Deliberante",
    valor: hcdScore,
    peso: WEIGHTS.transparenciaHcd,
    evidencia: hcdEvidencia,
  });

  const scoreTotal =
    Math.round(
      criterios.reduce((sum, c) => sum + c.valor * c.peso, 0) * 100 * 10
    ) / 10;

  return { scoreTotal, criterios };
}
