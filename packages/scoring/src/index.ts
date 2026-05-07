export {
  calculateTransparencyScore,
  calculateAllPilotScores,
  getScoreBreakdown,
  type CriterionBreakdown,
} from "./engine/calculator";
export { scorePublication, type CriterionResult } from "./dimensions/publication";
export { scoreTimeliness } from "./dimensions/timeliness";
export { scoreAccessibility } from "./dimensions/accessibility";
export {
  scoreFiscal,
  scoreFiscalSourced,
  type FiscalInput,
  type FiscalInputSourced,
  type FiscalCriterionResult,
  type FiscalScoreResult,
} from "./dimensions/fiscal";
export {
  scoreNormativa,
  type NormativaInput,
  type NormativaCriterionResult,
  type NormativaScoreResult,
} from "./dimensions/normativa";
export {
  scoreServiciosBasicos,
  type ServiciosBasicosInput,
  type ServiciosBasicosCriterionResult,
  type ServiciosBasicosScoreResult,
} from "./dimensions/servicios-basicos";
export {
  scoreParticipacion,
  type ParticipacionInput,
  type ParticipacionCriterionResult,
  type ParticipacionScoreResult,
} from "./dimensions/participacion-ciudadana";
export {
  scoreEducacionSalud,
  type EducacionSaludInput,
  type EducacionSaludCriterionResult,
  type EducacionSaludScoreResult,
} from "./dimensions/educacion-salud";
export {
  scoreConectividad,
  type ConectividadInput,
  type ConectividadCriterionResult,
  type ConectividadScoreResult,
} from "./dimensions/conectividad-digital";
export {
  scoreEconomiaLocal,
  type EconomiaLocalInput,
  type EconomiaLocalCriterionResult,
  type EconomiaLocalScoreResult,
} from "./dimensions/economia-local";
export {
  scoreGastoFuncion,
  type GastoFuncionInput,
  type GastoFuncionCriterionResult,
  type GastoFuncionScoreResult,
} from "./dimensions/gasto-por-funcion";
export {
  scoreSeguridadVial,
  type SeguridadVialInput,
  type SeguridadVialCriterionResult,
  type SeguridadVialScoreResult,
} from "./dimensions/seguridad-vial";
export {
  scoreEspacioPublico,
  type EspacioPublicoInput,
  type EspacioPublicoCriterionResult,
  type EspacioPublicoScoreResult,
} from "./dimensions/espacio-publico";
