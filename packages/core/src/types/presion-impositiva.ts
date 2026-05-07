import type { SourcedValue } from "./provenance";

/**
 * Parámetros de los 4 casos testigo usados para comparar la presión
 * impositiva municipal. Son idénticos para los 135 municipios, de modo
 * que el monto anual resultante es directamente comparable.
 *
 * La elección se inspira en la metodología IARAF / OCDE "Taxing Wages":
 * fijar un perfil estándar y calcular cuánto paga en cada jurisdicción.
 *
 * Los importes de valuación e ingresos están expresados en ARS nominales
 * del año fiscal correspondiente y deberán reajustarse cada año.
 */
export interface CasoTestigoParams {
  /** Vivienda urbana tipo (TSG / ABL) */
  vivienda: {
    /** Valuación fiscal asumida en ARS */
    valuacionFiscal: number;
    /** Zona asumida (ej: "urbana media") */
    zona: string;
  };
  /** Comercio minorista tipo (Tasa Inspección Seguridad e Higiene / TISH) */
  comercio: {
    /** Ingresos brutos anuales declarados asumidos en ARS */
    iibbAnual: number;
    /** Rubro asumido */
    rubro: string;
  };
  /** Explotación rural tipo (Tasa Vial Rural / Red Vial) */
  rural: {
    /** Hectáreas asumidas */
    hectareas: number;
    /** Tipo de tierra asumido */
    tipoTierra: string;
  };
  /** Obra nueva tipo (Derechos de Construcción) */
  construccion: {
    /** Metros cuadrados cubiertos de la obra */
    metrosCuadrados: number;
    /** Categoría constructiva asumida */
    categoria: string;
    /**
     * Costo de referencia por m² (ARS nominales del año fiscal) — usado SOLO
     * como input al cómputo cuando la ordenanza expresa el derecho como
     * alícuota sobre el valor de la obra (modelo Belgrano 1%) en vez de como
     * importe fijo $/m². Si la ordenanza ya publica $/m², este campo no se
     * usa. Fuente sugerida: índice CAC vivienda categoría B nominal anual,
     * reajustar cada año fiscal. Sprint 13.
     */
    costoReferenciaPorM2?: number;
  };
}

/** Caso testigo vigente para el ejercicio 2026. */
export const CASOS_TESTIGO_DEFAULT: CasoTestigoParams = {
  vivienda: {
    valuacionFiscal: 40_000_000,
    zona: "urbana media",
  },
  comercio: {
    iibbAnual: 50_000_000,
    rubro: "comercio minorista general",
  },
  rural: {
    hectareas: 100,
    tipoTierra: "mixta, zona productiva media",
  },
  construccion: {
    metrosCuadrados: 100,
    categoria: "vivienda unifamiliar categoría media",
    // Sprint 13: estimación nominal CAC vivienda categoría B 2026.
    // Sólo se aplica al fallback alícuota-sobre-obra; los municipios que
    // publican $/m² directo no se ven afectados.
    costoReferenciaPorM2: 2_000_000,
  },
};

/**
 * Datos de presión impositiva de un municipio para el año fiscal declarado.
 *
 * Cada monto es el importe anual en ARS que pagaría el caso testigo
 * correspondiente en ese municipio. Los montos rurales pueden ser null
 * en partidos sin superficie rural efectiva (ej: Vicente López, San Isidro).
 *
 * El pattern `SourcedValue<number>` permite adjuntar fuente + confianza
 * a cada monto individualmente, así el scraper futuro puede reemplazar
 * los valores de referencia con valores verificados sin romper consumidores.
 */
export interface PresionImpositivaData {
  municipioId: string;
  nombre: string;
  /** Año fiscal al que corresponden los montos */
  anioFiscal: number;
  /** Tasa de Servicios Generales / ABL anual para la vivienda testigo */
  montoVivienda: SourcedValue<number>;
  /** Tasa de Seguridad e Higiene anual para el comercio testigo */
  montoComercio: SourcedValue<number>;
  /** Tasa Vial Rural anual para 100 ha (null si el partido no aplica) */
  montoRural: SourcedValue<number>;
  /** Derechos de Construcción por 100 m² de obra nueva */
  montoConstruccion: SourcedValue<number>;
  /** ¿El municipio publica la Ordenanza Fiscal del año vigente? */
  publicaOrdenanzaFiscal: boolean;
  /** ¿El municipio publica la Ordenanza Impositiva del año vigente? */
  publicaOrdenanzaImpositiva: boolean;
  /** URL a la Ordenanza Impositiva (si se conoce) */
  urlOrdenanzaImpositiva: string | null;
  /** Nota metodológica visible en la UI */
  notaMetodologica: string | null;
}

/**
 * Agregado con ranking y estadísticas derivadas por caso testigo.
 * Se calcula en build time para SSG.
 */
export interface PresionImpositivaRankingEntry {
  municipioId: string;
  nombre: string;
  partido: string;
  region: string;
  poblacion: number;
  esPiloto: boolean;
  /** Datos tributarios crudos; null si no hay data cargada */
  data: PresionImpositivaData | null;
  /**
   * Índice agregado 0..100 (higher = mayor presión impositiva relativa).
   * Se calcula como promedio de los percentiles del municipio en cada uno
   * de los 4 casos testigo aplicables. null si no hay data.
   */
  indiceRelativo: number | null;
}

/**
 * Estadísticas agregadas a nivel provincial para la vista global.
 */
export interface PresionImpositivaStats {
  totalMunicipios: number;
  /** Municipios con al menos los 4 casos testigo cargados */
  conDatosCompletos: number;
  conOrdenanzaFiscalVigente: number;
  /** Medianas en ARS del año fiscal vigente (null si no hay datos) */
  medianaVivienda: number | null;
  medianaComercio: number | null;
  medianaRural: number | null;
  medianaConstruccion: number | null;
  anioFiscalReferencia: number;
}
