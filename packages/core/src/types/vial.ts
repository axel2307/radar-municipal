/**
 * Sprint 30 — Pilar 5 Inteligencia territorial: red vial estimada.
 *
 * El plan original (CLAUDE.md, Pilar 5) quería cruzar gasto vial municipal
 * con km de red rural estimada vía OpenStreetMap. Sprint 30 entrega la
 * primera mitad del cruce: el conteo de km por tipo de carretera.
 *
 * Disclaimer importante: estos km son ESTIMADOS. OSM tiene cobertura
 * heterogénea entre partidos (más voluntarios mapeando AMBA, menos en
 * el interior). Los valores deben leerse como "orden de magnitud" más
 * que precisión catastral. Cuando ARBA / DNV publiquen shapes
 * autoritativos, podemos cruzar y calibrar.
 */

/**
 * Snapshot de red vial de un partido construido con datos de OSM.
 * Una entry por (municipio, fecha de extracción).
 */
export interface RedVialMunicipal {
  municipioId: string;
  /** Nombre del partido — para auditoría visual. */
  nombre: string;
  /**
   * Km estimados por tipo de carretera (OSM `highway=` tag).
   *
   * Definiciones (simplificadas):
   *  - `track`: caminos de tierra / huellas rurales (típico vial rural).
   *  - `unclassified`: caminos sin clasificación oficial pero conectivos
   *    (mayormente rurales, también mezclan urbano periférico).
   *  - `tertiary`: rutas terciarias (mix urbano/rural según partido).
   *  - `secondary`: rutas secundarias provinciales.
   *  - `primary`: rutas primarias provinciales / nacionales.
   *
   * Para "vial rural" hoy usamos `track + unclassified` como proxy
   * conservador. Sprint 31+ puede afinar con boundary urbano.
   */
  km: {
    track: number;
    unclassified: number;
    tertiary: number;
    secondary: number;
    primary: number;
  };
  /** Suma `track + unclassified`. Métrica principal MVP. */
  kmRuralEstimado: number;
  /** Suma de todos los `highway=` tags considerados. */
  kmTotalEstimado: number;
  /** Cantidad de ways (segments) recibidos. Útil para detectar quería overpass que devuelve 0. */
  waysProcesados: number;
  /** ISO 8601 UTC de cuándo se ejecutó la query. */
  extractedAt: string;
  /** URL de la API Overpass usada. Trazabilidad. */
  fuenteUrl: string;
}
