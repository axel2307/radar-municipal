/**
 * Pesos iniciales para el scoring de transparencia.
 * Basados en la metodología ASAP adaptada.
 * La suma debe ser 1.0 (100%).
 */
export interface TransparencyWeight {
  criterio: string;
  descripcion: string;
  peso: number;
}

export const TRANSPARENCY_WEIGHTS: TransparencyWeight[] = [
  {
    criterio: "presupuesto_publicado",
    descripcion: "Presupuesto aprobado publicado en el portal",
    peso: 0.2,
  },
  {
    criterio: "ejecucion_publicada",
    descripcion: "Ejecución presupuestaria publicada y actualizada",
    peso: 0.2,
  },
  {
    criterio: "rezago_dias",
    descripcion: "Rezago en días desde cierre trimestral hasta publicación",
    peso: 0.15,
  },
  {
    criterio: "finalidad_funcion",
    descripcion: "Publicación de gasto por finalidad y función",
    peso: 0.1,
  },
  {
    criterio: "deuda_publicada",
    descripcion: "Publicación del estado de deuda pública",
    peso: 0.1,
  },
  {
    criterio: "accesibilidad_clicks",
    descripcion: "Cantidad de clicks desde la home hasta los datos fiscales",
    peso: 0.1,
  },
  {
    criterio: "menu_transparencia",
    descripcion: "Existencia de menú/sección de transparencia visible",
    peso: 0.05,
  },
  {
    criterio: "machine_readability",
    descripcion: "Porcentaje de documentos en formatos reutilizables (CSV/JSON vs PDF)",
    peso: 0.1,
  },
];

/** Verificación: los pesos deben sumar 1.0 */
export const TOTAL_WEIGHT = TRANSPARENCY_WEIGHTS.reduce((sum, w) => sum + w.peso, 0);

/**
 * Pesos para el scoring fiscal expandido.
 * Incluye los 4 originales + 3 nuevos (autonomía, presión, eficiencia).
 * Evolución interanual es informativo, no scored.
 */
export const FISCAL_EXPANDED_WEIGHTS: Record<string, number> = {
  resultadoPcapita: 0.20,
  pctPersonal: 0.15,
  pctCapital: 0.15,
  deudaPcapita: 0.15,
  autonomiaFiscal: 0.15,
  presionTributaria: 0.10,
  eficienciaAdmin: 0.10,
};

/**
 * Pesos para la dimensión "gasto por función".
 */
export const GASTO_FUNCION_WEIGHTS: Record<string, number> = {
  pctServiciosSociales: 0.25,
  pctServiciosEconomicos: 0.25,
  pctAdminGubernamental: 0.20,
  pctDeudaPublica: 0.15,
  diversificacionHhi: 0.15,
};

/**
 * Pesos para la dimensión "economía local".
 */
export const ECONOMIA_LOCAL_WEIGHTS: Record<string, number> = {
  empleoPcapita: 0.30,
  variacionEmpleo: 0.20,
  empresasPcapita: 0.20,
  construccion: 0.15,
  recaudacionPcapita: 0.15,
};
