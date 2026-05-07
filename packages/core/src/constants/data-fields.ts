/**
 * Nombres canónicos de campos de datos.
 *
 * Cada campo representa un dato atómico que puede provenir
 * de cualquier capa de fuente. Se usa como clave en DataPoint
 * y DataGap para identificar qué dato falta o de dónde viene.
 */

export enum DataField {
  // ─── Fiscales (montos absolutos) ───
  GASTO_TOTAL = "GASTO_TOTAL",
  GASTO_PERSONAL = "GASTO_PERSONAL",
  GASTO_CAPITAL = "GASTO_CAPITAL",
  INGRESO_TOTAL = "INGRESO_TOTAL",
  RESULTADO_FISCAL = "RESULTADO_FISCAL",
  DEUDA_STOCK = "DEUDA_STOCK",

  // ─── Fiscales (ratios derivados) ───
  GASTO_PCAPITA = "GASTO_PCAPITA",
  DEUDA_PCAPITA = "DEUDA_PCAPITA",
  PCT_PERSONAL = "PCT_PERSONAL",
  PCT_CAPITAL = "PCT_CAPITAL",

  // ─── Transparencia (publicación) ───
  PRESUPUESTO_PUBLICADO = "PRESUPUESTO_PUBLICADO",
  EJECUCION_PUBLICADA = "EJECUCION_PUBLICADA",
  DEUDA_PUBLICADA = "DEUDA_PUBLICADA",
  SEF_PUBLICADO = "SEF_PUBLICADO",
  FINALIDAD_FUNCION_PUBLICADA = "FINALIDAD_FUNCION_PUBLICADA",

  // ─── Normativa ───
  ORDENANZA_FISCAL_VIGENTE = "ORDENANZA_FISCAL_VIGENTE",
  ORDENANZA_IMPOSITIVA_VIGENTE = "ORDENANZA_IMPOSITIVA_VIGENTE",
  BOLETIN_SIBOM = "BOLETIN_SIBOM",

  // ─── Presión impositiva (casos testigo) ───
  /** Monto anual TSG / ABL para vivienda testigo */
  PRESION_IMPOSITIVA_VIVIENDA = "PRESION_IMPOSITIVA_VIVIENDA",
  /** Monto anual TISH para comercio testigo */
  PRESION_IMPOSITIVA_COMERCIO = "PRESION_IMPOSITIVA_COMERCIO",
  /** Monto anual Tasa Vial Rural para 100 ha */
  PRESION_IMPOSITIVA_RURAL = "PRESION_IMPOSITIVA_RURAL",
  /** Monto de Derechos de Construcción por 100 m² */
  PRESION_IMPOSITIVA_CONSTRUCCION = "PRESION_IMPOSITIVA_CONSTRUCCION",

  // ─── Compras ───
  LICITACIONES_PUBLICADAS = "LICITACIONES_PUBLICADAS",
  ADJUDICACIONES_PUBLICADAS = "ADJUDICACIONES_PUBLICADAS",

  // ─── Fiscales (nuevos: autonomía e ingresos) ───
  INGRESO_PROPIO = "INGRESO_PROPIO",
  TRANSFERENCIAS = "TRANSFERENCIAS",
  AUTONOMIA_FISCAL = "AUTONOMIA_FISCAL",
  PRESION_TRIBUTARIA = "PRESION_TRIBUTARIA",
  EFICIENCIA_ADMIN = "EFICIENCIA_ADMIN",

  // ─── Gasto por función ───
  GASTO_SERVICIOS_SOCIALES = "GASTO_SERVICIOS_SOCIALES",
  GASTO_SERVICIOS_ECONOMICOS = "GASTO_SERVICIOS_ECONOMICOS",
  GASTO_ADMIN_GUBERNAMENTAL = "GASTO_ADMIN_GUBERNAMENTAL",
  GASTO_SEGURIDAD = "GASTO_SEGURIDAD",
  GASTO_DEUDA_PUBLICA = "GASTO_DEUDA_PUBLICA",
  PCT_SERVICIOS_SOCIALES = "PCT_SERVICIOS_SOCIALES",
  PCT_SERVICIOS_ECONOMICOS = "PCT_SERVICIOS_ECONOMICOS",
  PCT_ADMIN_GUBERNAMENTAL = "PCT_ADMIN_GUBERNAMENTAL",
  PCT_DEUDA_PUBLICA = "PCT_DEUDA_PUBLICA",
  DIVERSIFICACION_GASTO_HHI = "DIVERSIFICACION_GASTO_HHI",

  // ─── Economía local ───
  EMPLEO_REGISTRADO_PER_CAPITA = "EMPLEO_REGISTRADO_PER_CAPITA",
  VARIACION_EMPLEO_INTERANUAL = "VARIACION_EMPLEO_INTERANUAL",
  EMPRESAS_PER_CAPITA = "EMPRESAS_PER_CAPITA",
  PERMISOS_CONSTRUCCION = "PERMISOS_CONSTRUCCION",
  RECAUDACION_PROPIA_PER_CAPITA = "RECAUDACION_PROPIA_PER_CAPITA",

  // ─── Servicios básicos ───
  PCT_AGUA_RED = "PCT_AGUA_RED",
  PCT_CLOACA = "PCT_CLOACA",
  PCT_GAS_RED = "PCT_GAS_RED",
  RECOLECCION_RESIDUOS = "RECOLECCION_RESIDUOS",
  ALUMBRADO_PUBLICO = "ALUMBRADO_PUBLICO",

  // ─── Educación y salud ───
  ESCUELAS_PER_10K = "ESCUELAS_PER_10K",
  CENTROS_SALUD_PER_10K = "CENTROS_SALUD_PER_10K",
  CAMAS_PER_10K = "CAMAS_PER_10K",
  JARDINES_PER_NINOS = "JARDINES_PER_NINOS",

  // ─── Conectividad digital ───
  PCT_INTERNET = "PCT_INTERNET",
  BANDA_ANCHA_PER_100 = "BANDA_ANCHA_PER_100",
  PCT_COMPUTADORA = "PCT_COMPUTADORA",
  SERVICIOS_DIGITALES = "SERVICIOS_DIGITALES",

  // ─── Espacio público ───
  ESPACIO_VERDE_PCAPITA = "ESPACIO_VERDE_PCAPITA",
  COBERTURA_ARBOLADO = "COBERTURA_ARBOLADO",
  SEPARACION_RESIDUOS = "SEPARACION_RESIDUOS",
  INCIDENTES_AMBIENTALES = "INCIDENTES_AMBIENTALES",

  // ─── Seguridad vial ───
  SINIESTROS_PER_100K = "SINIESTROS_PER_100K",
  KM_PAVIMENTADO_PER_KM2 = "KM_PAVIMENTADO_PER_KM2",
  TRANSITO_PUBLICO = "TRANSITO_PUBLICO",
  KM_CICLOVIAS = "KM_CICLOVIAS",

  // ─── Participación ciudadana ───
  PRESUPUESTO_PARTICIPATIVO = "PRESUPUESTO_PARTICIPATIVO",
  AUDIENCIAS_PUBLICAS = "AUDIENCIAS_PUBLICAS",
  SISTEMA_RECLAMOS = "SISTEMA_RECLAMOS",
  TRANSPARENCIA_HCD = "TRANSPARENCIA_HCD",

  // ─── Demográficos ───
  POBLACION = "POBLACION",
  SUPERFICIE = "SUPERFICIE",
}

export interface DataFieldMeta {
  label: string;
  unidad: string | null;
  /** ¿Es un campo que se puede calcular a partir de otros? */
  esDerivado: boolean;
  /** Campos de los que depende si es derivado */
  dependeDe: DataField[];
}

export const DATA_FIELD_META: Record<DataField, DataFieldMeta> = {
  [DataField.GASTO_TOTAL]: {
    label: "Gasto total",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.GASTO_PERSONAL]: {
    label: "Gasto en personal",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.GASTO_CAPITAL]: {
    label: "Gasto de capital",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.INGRESO_TOTAL]: {
    label: "Ingreso total",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.RESULTADO_FISCAL]: {
    label: "Resultado fiscal",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.DEUDA_STOCK]: {
    label: "Stock de deuda",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.GASTO_PCAPITA]: {
    label: "Gasto per cápita",
    unidad: "$/hab",
    esDerivado: true,
    dependeDe: [DataField.GASTO_TOTAL, DataField.POBLACION],
  },
  [DataField.DEUDA_PCAPITA]: {
    label: "Deuda per cápita",
    unidad: "$/hab",
    esDerivado: true,
    dependeDe: [DataField.DEUDA_STOCK, DataField.POBLACION],
  },
  [DataField.PCT_PERSONAL]: {
    label: "% gasto en personal",
    unidad: "%",
    esDerivado: true,
    dependeDe: [DataField.GASTO_PERSONAL, DataField.GASTO_TOTAL],
  },
  [DataField.PCT_CAPITAL]: {
    label: "% gasto de capital",
    unidad: "%",
    esDerivado: true,
    dependeDe: [DataField.GASTO_CAPITAL, DataField.GASTO_TOTAL],
  },
  [DataField.PRESUPUESTO_PUBLICADO]: {
    label: "Presupuesto publicado",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.EJECUCION_PUBLICADA]: {
    label: "Ejecución publicada",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.DEUDA_PUBLICADA]: {
    label: "Deuda publicada",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.SEF_PUBLICADO]: {
    label: "SEF publicado",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.FINALIDAD_FUNCION_PUBLICADA]: {
    label: "Finalidad/función publicada",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.ORDENANZA_FISCAL_VIGENTE]: {
    label: "Ordenanza fiscal vigente",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.ORDENANZA_IMPOSITIVA_VIGENTE]: {
    label: "Ordenanza impositiva vigente",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.PRESION_IMPOSITIVA_VIVIENDA]: {
    label: "Tasa Servicios Generales (vivienda testigo)",
    unidad: "$/año",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.PRESION_IMPOSITIVA_COMERCIO]: {
    label: "Tasa Seguridad e Higiene (comercio testigo)",
    unidad: "$/año",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.PRESION_IMPOSITIVA_RURAL]: {
    label: "Tasa Vial Rural (100 ha)",
    unidad: "$/año",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.PRESION_IMPOSITIVA_CONSTRUCCION]: {
    label: "Derechos de Construcción (100 m²)",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.BOLETIN_SIBOM]: {
    label: "Boletín oficial en SIBOM",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.LICITACIONES_PUBLICADAS]: {
    label: "Licitaciones publicadas",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.ADJUDICACIONES_PUBLICADAS]: {
    label: "Adjudicaciones publicadas",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  // ─── Fiscales nuevos ───
  [DataField.INGRESO_PROPIO]: {
    label: "Ingresos propios",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.TRANSFERENCIAS]: {
    label: "Transferencias recibidas",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.AUTONOMIA_FISCAL]: {
    label: "Autonomía fiscal",
    unidad: "%",
    esDerivado: true,
    dependeDe: [DataField.INGRESO_PROPIO, DataField.INGRESO_TOTAL],
  },
  [DataField.PRESION_TRIBUTARIA]: {
    label: "Presión tributaria per cápita",
    unidad: "$/hab",
    esDerivado: true,
    dependeDe: [DataField.INGRESO_PROPIO, DataField.POBLACION],
  },
  [DataField.EFICIENCIA_ADMIN]: {
    label: "Eficiencia administrativa",
    unidad: "%",
    esDerivado: true,
    dependeDe: [DataField.GASTO_ADMIN_GUBERNAMENTAL, DataField.GASTO_TOTAL],
  },

  // ─── Gasto por función ───
  [DataField.GASTO_SERVICIOS_SOCIALES]: {
    label: "Gasto en servicios sociales",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.GASTO_SERVICIOS_ECONOMICOS]: {
    label: "Gasto en servicios económicos",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.GASTO_ADMIN_GUBERNAMENTAL]: {
    label: "Gasto en administración gubernamental",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.GASTO_SEGURIDAD]: {
    label: "Gasto en seguridad",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.GASTO_DEUDA_PUBLICA]: {
    label: "Gasto en servicio de deuda",
    unidad: "$",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.PCT_SERVICIOS_SOCIALES]: {
    label: "% gasto en servicios sociales",
    unidad: "%",
    esDerivado: true,
    dependeDe: [DataField.GASTO_SERVICIOS_SOCIALES, DataField.GASTO_TOTAL],
  },
  [DataField.PCT_SERVICIOS_ECONOMICOS]: {
    label: "% gasto en servicios económicos",
    unidad: "%",
    esDerivado: true,
    dependeDe: [DataField.GASTO_SERVICIOS_ECONOMICOS, DataField.GASTO_TOTAL],
  },
  [DataField.PCT_ADMIN_GUBERNAMENTAL]: {
    label: "% gasto en administración",
    unidad: "%",
    esDerivado: true,
    dependeDe: [DataField.GASTO_ADMIN_GUBERNAMENTAL, DataField.GASTO_TOTAL],
  },
  [DataField.PCT_DEUDA_PUBLICA]: {
    label: "% gasto en servicio de deuda",
    unidad: "%",
    esDerivado: true,
    dependeDe: [DataField.GASTO_DEUDA_PUBLICA, DataField.GASTO_TOTAL],
  },
  [DataField.DIVERSIFICACION_GASTO_HHI]: {
    label: "Diversificación del gasto (HHI inverso)",
    unidad: "índice",
    esDerivado: true,
    dependeDe: [],
  },

  // ─── Economía local ───
  [DataField.EMPLEO_REGISTRADO_PER_CAPITA]: {
    label: "Empleo registrado per cápita",
    unidad: "emp/hab",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.VARIACION_EMPLEO_INTERANUAL]: {
    label: "Variación interanual del empleo",
    unidad: "%",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.EMPRESAS_PER_CAPITA]: {
    label: "Empresas registradas per cápita",
    unidad: "emp/1000hab",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.PERMISOS_CONSTRUCCION]: {
    label: "Permisos de construcción",
    unidad: "permisos",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.RECAUDACION_PROPIA_PER_CAPITA]: {
    label: "Recaudación propia per cápita",
    unidad: "$/hab",
    esDerivado: true,
    dependeDe: [DataField.INGRESO_PROPIO, DataField.POBLACION],
  },

  // ─── Servicios básicos ───
  [DataField.PCT_AGUA_RED]: {
    label: "% hogares con agua de red",
    unidad: "%",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.PCT_CLOACA]: {
    label: "% hogares con red cloacal",
    unidad: "%",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.PCT_GAS_RED]: {
    label: "% hogares con gas de red",
    unidad: "%",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.RECOLECCION_RESIDUOS]: {
    label: "Recolección de residuos formal",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.ALUMBRADO_PUBLICO]: {
    label: "Alumbrado público",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },

  // ─── Educación y salud ───
  [DataField.ESCUELAS_PER_10K]: {
    label: "Escuelas públicas cada 10.000 hab",
    unidad: "esc/10kh",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.CENTROS_SALUD_PER_10K]: {
    label: "Centros de salud cada 10.000 hab",
    unidad: "cs/10kh",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.CAMAS_PER_10K]: {
    label: "Camas hospitalarias cada 10.000 hab",
    unidad: "camas/10kh",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.JARDINES_PER_NINOS]: {
    label: "Jardines maternales por niños 0-5",
    unidad: "jardines/1000niños",
    esDerivado: false,
    dependeDe: [],
  },

  // ─── Conectividad digital ───
  [DataField.PCT_INTERNET]: {
    label: "% hogares con internet",
    unidad: "%",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.BANDA_ANCHA_PER_100]: {
    label: "Conexiones banda ancha cada 100 hab",
    unidad: "conn/100h",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.PCT_COMPUTADORA]: {
    label: "% hogares con computadora",
    unidad: "%",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.SERVICIOS_DIGITALES]: {
    label: "Índice de servicios digitales municipales",
    unidad: "índice",
    esDerivado: false,
    dependeDe: [],
  },

  // ─── Espacio público ───
  [DataField.ESPACIO_VERDE_PCAPITA]: {
    label: "Espacio verde per cápita",
    unidad: "m²/hab",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.COBERTURA_ARBOLADO]: {
    label: "Cobertura de arbolado urbano",
    unidad: "%",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.SEPARACION_RESIDUOS]: {
    label: "Programa de separación en origen",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.INCIDENTES_AMBIENTALES]: {
    label: "Incidentes ambientales reportados",
    unidad: "incidentes",
    esDerivado: false,
    dependeDe: [],
  },

  // ─── Seguridad vial ───
  [DataField.SINIESTROS_PER_100K]: {
    label: "Siniestros fatales cada 100.000 hab",
    unidad: "siniest/100kh",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.KM_PAVIMENTADO_PER_KM2]: {
    label: "km pavimentados por km²",
    unidad: "km/km²",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.TRANSITO_PUBLICO]: {
    label: "Cobertura de transporte público",
    unidad: "líneas",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.KM_CICLOVIAS]: {
    label: "km de ciclovías",
    unidad: "km",
    esDerivado: false,
    dependeDe: [],
  },

  // ─── Participación ciudadana ───
  [DataField.PRESUPUESTO_PARTICIPATIVO]: {
    label: "Presupuesto participativo",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.AUDIENCIAS_PUBLICAS]: {
    label: "Mecanismo de audiencias públicas",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.SISTEMA_RECLAMOS]: {
    label: "Sistema de reclamos online",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.TRANSPARENCIA_HCD]: {
    label: "Transparencia del HCD",
    unidad: null,
    esDerivado: false,
    dependeDe: [],
  },

  // ─── Demográficos ───
  [DataField.POBLACION]: {
    label: "Población",
    unidad: "hab",
    esDerivado: false,
    dependeDe: [],
  },
  [DataField.SUPERFICIE]: {
    label: "Superficie",
    unidad: "km²",
    esDerivado: false,
    dependeDe: [],
  },
};
