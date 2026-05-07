/**
 * Capas de procedencia de datos.
 *
 * Cada dato en Radar Municipal tiene una procedencia que indica
 * de qué nivel institucional proviene. Esto es clave para:
 *   - Separar "no publica" de "no tiene"
 *   - Detectar brechas (gaps) de datos
 *   - Dar contexto al usuario sobre la confiabilidad
 */

export enum SourceLayer {
  /** Publicado directamente por el municipio (portal, datos abiertos) */
  MUNICIPAL = "MUNICIPAL",
  /** Publicado por un organismo provincial (Contaduría, Tribunal de Cuentas, ARBA) */
  PROVINCIAL = "PROVINCIAL",
  /** Publicado por un organismo nacional (INDEC, Min. Interior) */
  NACIONAL = "NACIONAL",
  /** Calculado o derivado por Radar Municipal a partir de otras fuentes */
  DERIVADA = "DERIVADA",
}

export interface SourceLayerMeta {
  label: string;
  description: string;
  /** Nombre de ícono conceptual (para UI) */
  icon: string;
  /** Color Tailwind para badges */
  color: string;
  /** Color Tailwind para texto */
  textColor: string;
}

export const SOURCE_LAYER_META: Record<SourceLayer, SourceLayerMeta> = {
  [SourceLayer.MUNICIPAL]: {
    label: "Municipal",
    description: "Publicado directamente por el municipio en su portal o plataforma de datos abiertos.",
    icon: "building",
    color: "bg-blue-100",
    textColor: "text-blue-700",
  },
  [SourceLayer.PROVINCIAL]: {
    label: "Provincial",
    description: "Publicado por un organismo de la Provincia de Buenos Aires (Contaduría General, Tribunal de Cuentas, ARBA).",
    icon: "landmark",
    color: "bg-violet-100",
    textColor: "text-violet-700",
  },
  [SourceLayer.NACIONAL]: {
    label: "Nacional",
    description: "Publicado por un organismo nacional (INDEC, Ministerio del Interior).",
    icon: "flag",
    color: "bg-emerald-100",
    textColor: "text-emerald-700",
  },
  [SourceLayer.DERIVADA]: {
    label: "Derivada",
    description: "Calculado por Radar Municipal a partir de otras fuentes. No es un dato primario.",
    icon: "calculator",
    color: "bg-amber-100",
    textColor: "text-amber-700",
  },
};

/**
 * Organismos conocidos por capa.
 * Se usan para etiquetar la procedencia específica de cada dato.
 */
export interface KnownOrganism {
  id: string;
  nombre: string;
  capa: SourceLayer;
  url: string | null;
}

export const KNOWN_ORGANISMS: KnownOrganism[] = [
  // Municipal (genérico — el municipio específico se infiere del municipioId)
  {
    id: "PORTAL_MUNICIPAL",
    nombre: "Portal municipal de transparencia",
    capa: SourceLayer.MUNICIPAL,
    url: null,
  },
  {
    id: "DATOS_ABIERTOS_MUNICIPAL",
    nombre: "Portal de datos abiertos municipal",
    capa: SourceLayer.MUNICIPAL,
    url: null,
  },

  // Provincial
  {
    id: "CONTADURIA_GENERAL_PBA",
    nombre: "Contaduría General de la Provincia de Buenos Aires",
    capa: SourceLayer.PROVINCIAL,
    url: "https://www.cgp.gba.gov.ar",
  },
  {
    id: "TRIBUNAL_CUENTAS_PBA",
    nombre: "Tribunal de Cuentas de la Provincia de Buenos Aires",
    capa: SourceLayer.PROVINCIAL,
    url: "https://www.tcpba.gob.ar",
  },
  {
    id: "ARBA",
    nombre: "Agencia de Recaudación de Buenos Aires",
    capa: SourceLayer.PROVINCIAL,
    url: "https://www.arba.gov.ar",
  },
  {
    id: "MIN_ECONOMIA_PBA",
    nombre: "Ministerio de Economía de la Provincia de Buenos Aires",
    capa: SourceLayer.PROVINCIAL,
    url: "https://www.ec.gba.gov.ar",
  },
  {
    id: "SIBOM",
    nombre: "Sistema de Boletines Oficiales Municipales",
    capa: SourceLayer.PROVINCIAL,
    url: "https://sibom.slyt.gba.gob.ar",
  },

  // Nacional
  {
    id: "INDEC",
    nombre: "Instituto Nacional de Estadística y Censos",
    capa: SourceLayer.NACIONAL,
    url: "https://www.indec.gob.ar",
  },
  {
    id: "MIN_INTERIOR",
    nombre: "Ministerio del Interior",
    capa: SourceLayer.NACIONAL,
    url: "https://www.argentina.gob.ar/interior",
  },
  {
    id: "OSM",
    nombre: "OpenStreetMap (comunidad)",
    capa: SourceLayer.NACIONAL,
    url: "https://www.openstreetmap.org",
  },

  // Nacional — nuevos organismos
  {
    id: "ENACOM",
    nombre: "Ente Nacional de Comunicaciones",
    capa: SourceLayer.NACIONAL,
    url: "https://datos.enacom.gob.ar",
  },
  {
    id: "ANSV",
    nombre: "Agencia Nacional de Seguridad Vial",
    capa: SourceLayer.NACIONAL,
    url: "https://www.argentina.gob.ar/seguridadvial",
  },
  {
    id: "REFES_SALUD",
    nombre: "Registro Federal de Establecimientos de Salud",
    capa: SourceLayer.NACIONAL,
    url: "https://sisa.msal.gov.ar",
  },
  {
    id: "MAPA_EDUCATIVO",
    nombre: "Mapa Educativo Nacional",
    capa: SourceLayer.NACIONAL,
    url: "https://mapa.educacion.gob.ar",
  },
  {
    id: "OEDE",
    nombre: "Observatorio de Empleo y Dinámica Empresarial (Min. Trabajo)",
    capa: SourceLayer.NACIONAL,
    url: "https://www.trabajo.gob.ar/estadisticas/oede/",
  },
  {
    id: "AFIP",
    nombre: "Administración Federal de Ingresos Públicos",
    capa: SourceLayer.NACIONAL,
    url: "https://www.afip.gob.ar",
  },
  {
    id: "IERIC",
    nombre: "Instituto de Estadística y Registro de la Industria de la Construcción",
    capa: SourceLayer.NACIONAL,
    url: "https://www.ieric.org.ar",
  },

  // Provincial — nuevos
  {
    id: "OPDS",
    nombre: "Organismo Provincial para el Desarrollo Sostenible",
    capa: SourceLayer.PROVINCIAL,
    url: "https://www.opds.gba.gov.ar",
  },

  // Derivada
  {
    id: "GLOBAL_FOREST_WATCH",
    nombre: "Global Forest Watch (datos satelitales)",
    capa: SourceLayer.DERIVADA,
    url: "https://www.globalforestwatch.org",
  },
  {
    id: "RADAR_MUNICIPAL",
    nombre: "Radar Municipal (cálculo propio)",
    capa: SourceLayer.DERIVADA,
    url: "https://radarmunicipal.ar/metodologia",
  },
];

/** Busca un organismo por ID */
export function getOrganismById(id: string): KnownOrganism | undefined {
  return KNOWN_ORGANISMS.find((o) => o.id === id);
}
