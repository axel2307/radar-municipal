/**
 * Dimensión: Gasto por Función
 *
 * Evalúa cómo distribuye su gasto el municipio entre las 4 finalidades
 * del clasificador presupuestario RAFAM:
 *   - Servicios sociales (salud, educación, promoción social, cultura)
 *   - Servicios económicos (producción, transporte, energía)
 *   - Administración gubernamental
 *   - Servicio de deuda pública
 *
 * Un municipio "bien rankeado" destina porcentaje alto a sociales,
 * razonable a económicos, bajo a administración y mínimo a deuda,
 * con diversificación del gasto (HHI bajo).
 */

// ─── Input ───

export interface GastoFuncionInput {
  /** % del gasto total destinado a servicios sociales */
  pctServiciosSociales: number | null;
  /** % del gasto total destinado a servicios económicos */
  pctServiciosEconomicos: number | null;
  /** % del gasto total destinado a administración gubernamental */
  pctAdminGubernamental: number | null;
  /** % del gasto total destinado a servicio de deuda */
  pctDeudaPublica: number | null;
}

// ─── Output ───

export interface GastoFuncionCriterionResult {
  indicador: string;
  descripcion: string;
  valorRaw: number | null;
  valorNormalizado: number;
  peso: number;
  unidad: string;
  interpretacion: string;
}

export interface GastoFuncionScoreResult {
  scoreTotal: number;
  criterios: GastoFuncionCriterionResult[];
  pctServiciosSociales: number | null;
  pctServiciosEconomicos: number | null;
  pctAdminGubernamental: number | null;
  /** HHI calculado de diversificación */
  diversificacionHhi: number | null;
}

// ─── Weights ───

const WEIGHTS = {
  sociales: 0.25,
  economicos: 0.25,
  admin: 0.20,
  deuda: 0.15,
  diversificacion: 0.15,
};

// ─── Normalization ───

const NULL_DEFAULT = 0.3;

/**
 * Servicios Sociales: esperamos 40-60% en municipios PBA.
 * < 25% → muy bajo (0.1), 25-35% → bajo (0.4), 35-50% → bueno (0.7), >= 50% → óptimo (1.0)
 */
function scoreSociales(pct: number | null): { norm: number; interp: string } {
  if (pct == null) return { norm: NULL_DEFAULT, interp: "Sin datos" };
  if (pct >= 50) return { norm: 1.0, interp: `${pct.toFixed(1)}% — Muy alta inversión social` };
  if (pct >= 35) return { norm: 0.5 + (pct - 35) / 30, interp: `${pct.toFixed(1)}% — Buena inversión social` };
  if (pct >= 25) return { norm: 0.2 + (pct - 25) / 33, interp: `${pct.toFixed(1)}% — Inversión social moderada` };
  return { norm: Math.max(0, pct / 25 * 0.2), interp: `${pct.toFixed(1)}% — Baja inversión social` };
}

/**
 * Servicios Económicos: esperamos 10-25%.
 * < 5% → bajo, 5-10% → moderado, 10-25% → bueno, > 25% → puede indicar gasto excesivo.
 */
function scoreEconomicos(pct: number | null): { norm: number; interp: string } {
  if (pct == null) return { norm: NULL_DEFAULT, interp: "Sin datos" };
  if (pct >= 10 && pct <= 25) return { norm: 0.7 + (pct - 10) / 50, interp: `${pct.toFixed(1)}% — Nivel óptimo` };
  if (pct >= 25) return { norm: Math.max(0.4, 1.0 - (pct - 25) / 25), interp: `${pct.toFixed(1)}% — Alto, posible concentración` };
  if (pct >= 5) return { norm: 0.3 + (pct - 5) / 12.5, interp: `${pct.toFixed(1)}% — Moderado` };
  return { norm: Math.max(0, pct / 5 * 0.3), interp: `${pct.toFixed(1)}% — Bajo` };
}

/**
 * Administración gubernamental: menor es mejor.
 * < 15% → óptimo, 15-25% → bueno, 25-40% → alto, > 40% → excesivo.
 */
function scoreAdmin(pct: number | null): { norm: number; interp: string } {
  if (pct == null) return { norm: NULL_DEFAULT, interp: "Sin datos" };
  if (pct <= 15) return { norm: 1.0, interp: `${pct.toFixed(1)}% — Administración eficiente` };
  if (pct <= 25) return { norm: 1.0 - (pct - 15) / 33.3, interp: `${pct.toFixed(1)}% — Nivel razonable` };
  if (pct <= 40) return { norm: 0.4 - (pct - 25) / 50, interp: `${pct.toFixed(1)}% — Alto gasto administrativo` };
  return { norm: Math.max(0, 0.1 - (pct - 40) / 200), interp: `${pct.toFixed(1)}% — Excesivo gasto administrativo` };
}

/**
 * Servicio de deuda: menor es mejor.
 * < 3% → excelente, 3-8% → aceptable, 8-15% → preocupante, > 15% → riesgo.
 */
function scoreDeuda(pct: number | null): { norm: number; interp: string } {
  if (pct == null) return { norm: NULL_DEFAULT, interp: "Sin datos" };
  if (pct <= 3) return { norm: 1.0, interp: `${pct.toFixed(1)}% — Endeudamiento mínimo` };
  if (pct <= 8) return { norm: 1.0 - (pct - 3) / 16.7, interp: `${pct.toFixed(1)}% — Nivel aceptable` };
  if (pct <= 15) return { norm: 0.3 - (pct - 8) / 23.3, interp: `${pct.toFixed(1)}% — Nivel preocupante` };
  return { norm: 0, interp: `${pct.toFixed(1)}% — Alto riesgo de deuda` };
}

/**
 * HHI de diversificación: calculado como 1 - HHI normalizado.
 * Cuantas más funciones tengan peso similar, mejor score.
 * HHI perfecto (4 funciones iguales = 0.25 cada una) → HHI = 0.25 → score 1.0
 * HHI máximo (1 función = 100%) → HHI = 1.0 → score 0.0
 */
function calcHhi(pcts: (number | null)[]): number | null {
  const valid = pcts.filter((p): p is number => p != null);
  if (valid.length < 2) return null;
  const total = valid.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const shares = valid.map(v => v / total);
  return shares.reduce((sum, s) => sum + s * s, 0);
}

function scoreDiversificacion(hhi: number | null): { norm: number; interp: string } {
  if (hhi == null) return { norm: NULL_DEFAULT, interp: "Sin datos suficientes" };
  // HHI para 4 categorías: mínimo teórico 0.25 (perfecto), máximo 1.0 (concentrado)
  const norm = Math.max(0, Math.min(1, (1.0 - hhi) / 0.75));
  if (norm >= 0.7) return { norm, interp: `HHI ${hhi.toFixed(3)} — Gasto bien diversificado` };
  if (norm >= 0.4) return { norm, interp: `HHI ${hhi.toFixed(3)} — Diversificación moderada` };
  return { norm, interp: `HHI ${hhi.toFixed(3)} — Gasto concentrado` };
}

// ─── Main ───

export function scoreGastoFuncion(input: GastoFuncionInput): GastoFuncionScoreResult {
  const hhi = calcHhi([
    input.pctServiciosSociales,
    input.pctServiciosEconomicos,
    input.pctAdminGubernamental,
    input.pctDeudaPublica,
  ]);

  const s = scoreSociales(input.pctServiciosSociales);
  const e = scoreEconomicos(input.pctServiciosEconomicos);
  const a = scoreAdmin(input.pctAdminGubernamental);
  const d = scoreDeuda(input.pctDeudaPublica);
  const div = scoreDiversificacion(hhi);

  const criterios: GastoFuncionCriterionResult[] = [
    {
      indicador: "pctServiciosSociales",
      descripcion: "% Servicios sociales",
      valorRaw: input.pctServiciosSociales,
      valorNormalizado: s.norm,
      peso: WEIGHTS.sociales,
      unidad: "%",
      interpretacion: s.interp,
    },
    {
      indicador: "pctServiciosEconomicos",
      descripcion: "% Servicios económicos",
      valorRaw: input.pctServiciosEconomicos,
      valorNormalizado: e.norm,
      peso: WEIGHTS.economicos,
      unidad: "%",
      interpretacion: e.interp,
    },
    {
      indicador: "pctAdminGubernamental",
      descripcion: "% Administración gubernamental",
      valorRaw: input.pctAdminGubernamental,
      valorNormalizado: a.norm,
      peso: WEIGHTS.admin,
      unidad: "%",
      interpretacion: a.interp,
    },
    {
      indicador: "pctDeudaPublica",
      descripcion: "% Servicio de deuda",
      valorRaw: input.pctDeudaPublica,
      valorNormalizado: d.norm,
      peso: WEIGHTS.deuda,
      unidad: "%",
      interpretacion: d.interp,
    },
    {
      indicador: "diversificacionHhi",
      descripcion: "Diversificación del gasto",
      valorRaw: hhi,
      valorNormalizado: div.norm,
      peso: WEIGHTS.diversificacion,
      unidad: "HHI",
      interpretacion: div.interp,
    },
  ];

  const scoreTotal =
    Math.round(
      criterios.reduce((sum, c) => sum + c.valorNormalizado * c.peso, 0) * 1000
    ) / 10;

  return {
    scoreTotal,
    criterios,
    pctServiciosSociales: input.pctServiciosSociales,
    pctServiciosEconomicos: input.pctServiciosEconomicos,
    pctAdminGubernamental: input.pctAdminGubernamental,
    diversificacionHhi: hhi,
  };
}
