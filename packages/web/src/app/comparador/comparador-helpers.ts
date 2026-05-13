/**
 * Sprint 44A — Helpers puros para el comparador.
 * Extraídos del page.tsx monolítico para reusar entre server + client islands.
 */
import type { MunicipioDetail } from "@/lib/scoring-data";

export function buildRadarDimensions(d: MunicipioDetail) {
  return [
    { label: "Transparencia", shortLabel: "Transp.", score: d.scoreTransparencia },
    { label: "Normativa", shortLabel: "Norm.", score: d.scoreNormativa ?? 0 },
    { label: "Participación", shortLabel: "Partic.", score: d.scoreParticipacion ?? 0 },
    { label: "Fiscal", score: d.scoreFiscal ?? 0 },
    { label: "Gasto público", shortLabel: "Gasto", score: d.scoreGastoFuncion ?? 0 },
    { label: "Economía local", shortLabel: "Econ.", score: d.scoreEconomiaLocal ?? 0 },
    { label: "Presión impositiva", shortLabel: "Pres.Imp.", score: d.scorePresionImpositiva ?? 0 },
    { label: "Servicios básicos", shortLabel: "Serv.", score: d.scoreServiciosBasicos ?? 0 },
    { label: "Educación y salud", shortLabel: "Educ.", score: d.scoreEducacionSalud ?? 0 },
    { label: "Conectividad", shortLabel: "Conect.", score: d.scoreConectividad ?? 0 },
    { label: "Espacio público", shortLabel: "Esp.Púb.", score: d.scoreEspacioPublico ?? 0 },
    { label: "Seguridad vial", shortLabel: "Seg.Vial", score: d.scoreSeguridadVial ?? 0 },
  ];
}
