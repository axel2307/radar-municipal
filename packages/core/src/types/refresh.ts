/**
 * Sprint 27 — Tipos para el sistema de refresh mensual automatizado.
 *
 * `RefreshManifest` es el latido que cada script de refresh emite junto
 * a sus JSONs de output. Originalmente vivía en `contratacion.ts` (Sprint
 * 18) porque solo Pilar 4 lo usaba; lo movimos acá cuando Sprint 20
 * agregó refresh de deuda y se hizo pattern compartido.
 *
 * `GlobalRefreshManifest` agrega los manifests individuales tras una
 * corrida del workflow `monthly-refresh.yml`. Tiene la información que
 * la UI necesita para mostrar "última actualización" + visibilidad de
 * fuentes que fallaron.
 */

/**
 * Manifest emitido por UN refresh script (`refresh:pilar4`, `refresh:deuda`,
 * etc.) junto a sus JSONs. La web lo lee para mostrar frescura por
 * dimensión.
 *
 * Diseñado liviano a propósito: no es un changelog, es un latido.
 */
export interface RefreshManifest {
  /** ISO 8601 UTC de cuándo terminó la corrida. */
  refreshedAt: string;
  /** Total de items ingeridos en esta corrida (contrataciones, snapshots, etc). */
  totalContrataciones: number;
  /** Cantidad de municipios distintos con datos. */
  municipiosConDatos: number;
  /** Cantidad de aggregates emitidos (cells de municipio × año). */
  aggregates: number;
  /**
   * Por fuente: una entry por adapter usado en la corrida. Útil para
   * detectar regresiones por fuente (ej: si Quilmes dejó de responder,
   * la próxima corrida no tendrá su entry).
   */
  fuentes: {
    label: string;
    municipioId: string;
    datasetsParseados: number;
    contrataciones: number;
  }[];
}

/**
 * Estado de UNA corrida del cron mensual. El workflow consolida todos los
 * runs en un `GlobalRefreshManifest` y lo escribe a
 * `packages/web/src/data/auto-refresh-manifest.json`.
 */
export interface MonthlyRefreshRun {
  /** Identificador del target en la matrix del workflow (ej. "compras", "deuda"). */
  target: string;
  /** Comando pnpm que se ejecuta (ej. "refresh:pilar4"). */
  script: string;
  /** Resultado del job de matrix: success, failed (excepción), skipped (manifest no encontrado). */
  status: "success" | "failed" | "skipped";
  /** Duración del job en milisegundos. Útil para detectar slowdowns en upstream. */
  durationMs: number;
  /** Cantidad de municipios cubiertos por esta corrida (del manifest individual). */
  municipiosConDatos: number;
  /** Mensaje de error si status=failed. */
  error?: string;
  /** Path relativo del manifest individual que originó esta entry. */
  sourceManifestPath?: string;
}

/**
 * Manifest unificado del cron mensual completo. Un único archivo en
 * `packages/web/src/data/auto-refresh-manifest.json` que la UI puede
 * leer para mostrar el estado global del sistema.
 *
 * Sprint 27: el archivo se emite pero la UI todavía no lo muestra.
 * Sprint 28+: agregar banner de frescura en home / `/datos-abiertos`.
 */
export interface GlobalRefreshManifest {
  /** ISO 8601 UTC de cuándo terminó la corrida del workflow. */
  refreshedAt: string;
  /** Una entry por target de la matrix. */
  runs: MonthlyRefreshRun[];
  /**
   * Cantidad única de municipios cubiertos en CUALQUIER dimensión durante
   * esta corrida. Se calcula como union de los `municipioId` de los
   * manifests individuales de los runs con `status: "success"`.
   *
   * Útil como métrica top-line del proyecto: "estamos refrescando
   * automáticamente datos de N municipios".
   */
  totalMunicipiosCubiertos: number;
}
