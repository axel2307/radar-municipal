import {
  pgTable,
  varchar,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────
// Tablas existentes
// ─────────────────────────────────────────

export const municipios = pgTable("municipios", {
  id: varchar("id", { length: 6 }).primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  partido: varchar("partido", { length: 100 }).notNull(),
  urlOficial: varchar("url_oficial", { length: 500 }),
  poblacion: integer("poblacion"),
  superficieKm2: real("superficie_km2"),
  densidad: real("densidad"),
  region: varchar("region", { length: 50 }).notNull(),
  esPiloto: boolean("es_piloto").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sources = pgTable("sources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  municipioId: varchar("municipio_id", { length: 6 })
    .references(() => municipios.id)
    .notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(),
  /** Capa de procedencia (MUNICIPAL, PROVINCIAL, NACIONAL, DERIVADA) */
  capa: varchar("capa", { length: 20 }),
  url: varchar("url", { length: 1000 }).notNull(),
  ultimoAcceso: timestamp("ultimo_acceso"),
  estado: varchar("estado", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  municipioId: varchar("municipio_id", { length: 6 })
    .references(() => municipios.id)
    .notNull(),
  sourceId: integer("source_id").references(() => sources.id),
  categoria: varchar("categoria", { length: 50 }).notNull(),
  anio: integer("anio").notNull(),
  trimestre: integer("trimestre"),
  formato: varchar("formato", { length: 10 }).notNull(),
  url: varchar("url", { length: 1000 }),
  fechaPublicacion: timestamp("fecha_publicacion"),
  fechaCorte: timestamp("fecha_corte"),
  esParseable: boolean("es_parseable").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transparencyScores = pgTable(
  "transparency_scores",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    municipioId: varchar("municipio_id", { length: 6 })
      .references(() => municipios.id)
      .notNull(),
    anio: integer("anio").notNull(),
    trimestre: integer("trimestre"),
    dimensionScores: jsonb("dimension_scores").notNull(),
    scoreTotal: real("score_total").notNull(),
    evidencia: jsonb("evidencia"),
    fechaCalculo: timestamp("fecha_calculo").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uq_transparency_municipio_anio_trimestre").on(
      table.municipioId,
      table.anio,
      table.trimestre
    ),
  ]
);

// ─────────────────────────────────────────
// fiscal_indicators (actualizado con procedencia)
// ─────────────────────────────────────────

export const fiscalIndicators = pgTable(
  "fiscal_indicators",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    municipioId: varchar("municipio_id", { length: 6 })
      .references(() => municipios.id)
      .notNull(),
    anio: integer("anio").notNull(),
    trimestre: integer("trimestre"),

    // Valores
    gastoTotal: real("gasto_total"),
    gastoPersonal: real("gasto_personal"),
    gastoCapital: real("gasto_capital"),
    deudaTotal: real("deuda_total"),
    ingresoTotal: real("ingreso_total"),
    resultadoFiscal: real("resultado_fiscal"),
    gastoPcapita: real("gasto_pcapita"),
    deudaPcapita: real("deuda_pcapita"),
    pctPersonal: real("pct_personal"),
    pctCapital: real("pct_capital"),

    // Procedencia por campo (campos hermanos _fuente_*)
    gastoTotalFuenteCapa: varchar("gasto_total_fuente_capa", { length: 20 }),
    gastoTotalFuenteOrganismo: varchar("gasto_total_fuente_organismo", { length: 50 }),
    gastoTotalFuenteUrl: varchar("gasto_total_fuente_url", { length: 1000 }),

    gastoPersonalFuenteCapa: varchar("gasto_personal_fuente_capa", { length: 20 }),
    gastoPersonalFuenteOrganismo: varchar("gasto_personal_fuente_organismo", { length: 50 }),
    gastoPersonalFuenteUrl: varchar("gasto_personal_fuente_url", { length: 1000 }),

    gastoCapitalFuenteCapa: varchar("gasto_capital_fuente_capa", { length: 20 }),
    gastoCapitalFuenteOrganismo: varchar("gasto_capital_fuente_organismo", { length: 50 }),
    gastoCapitalFuenteUrl: varchar("gasto_capital_fuente_url", { length: 1000 }),

    deudaTotalFuenteCapa: varchar("deuda_total_fuente_capa", { length: 20 }),
    deudaTotalFuenteOrganismo: varchar("deuda_total_fuente_organismo", { length: 50 }),
    deudaTotalFuenteUrl: varchar("deuda_total_fuente_url", { length: 1000 }),

    ingresoTotalFuenteCapa: varchar("ingreso_total_fuente_capa", { length: 20 }),
    ingresoTotalFuenteOrganismo: varchar("ingreso_total_fuente_organismo", { length: 50 }),
    ingresoTotalFuenteUrl: varchar("ingreso_total_fuente_url", { length: 1000 }),

    resultadoFiscalFuenteCapa: varchar("resultado_fiscal_fuente_capa", { length: 20 }),
    resultadoFiscalFuenteOrganismo: varchar("resultado_fiscal_fuente_organismo", { length: 50 }),
    resultadoFiscalFuenteUrl: varchar("resultado_fiscal_fuente_url", { length: 1000 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uq_fiscal_municipio_anio_trimestre").on(
      table.municipioId,
      table.anio,
      table.trimestre
    ),
  ]
);

// ─────────────────────────────────────────
// data_points (nuevo — registro atómico con procedencia)
// ─────────────────────────────────────────

export const dataPoints = pgTable(
  "data_points",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    municipioId: varchar("municipio_id", { length: 6 })
      .references(() => municipios.id)
      .notNull(),
    /** Nombre canónico del campo (DataField enum) */
    campo: varchar("campo", { length: 60 }).notNull(),
    anio: integer("anio").notNull(),
    trimestre: integer("trimestre"),
    fechaCorte: timestamp("fecha_corte"),

    // Valor (uno de los tres según el tipo de dato)
    valorNumerico: real("valor_numerico"),
    valorTexto: varchar("valor_texto", { length: 500 }),
    valorBooleano: boolean("valor_booleano"),
    unidad: varchar("unidad", { length: 20 }),

    // Fuente (columnas planas para queryability)
    fuenteCapa: varchar("fuente_capa", { length: 20 }).notNull(),
    fuenteOrganismo: varchar("fuente_organismo", { length: 50 }).notNull(),
    fuenteUrl: varchar("fuente_url", { length: 1000 }),
    fuenteFormato: varchar("fuente_formato", { length: 10 }),
    fuenteFechaAcceso: timestamp("fuente_fecha_acceso").notNull(),
    fuenteFechaPublicacion: timestamp("fuente_fecha_publicacion"),

    // Confianza
    confianzaNivel: varchar("confianza_nivel", { length: 20 }).notNull(),
    confianzaNotas: varchar("confianza_notas", { length: 500 }),
    confianzaValidadoContra: varchar("confianza_validado_contra", { length: 100 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Buscar todos los datos de un municipio para un campo y año
    index("idx_data_points_municipio_campo_anio").on(
      table.municipioId,
      table.campo,
      table.anio
    ),
    // Filtrar por capa de fuente
    index("idx_data_points_fuente_capa").on(table.fuenteCapa),
    // Deduplicación: un solo valor por municipio+campo+año+trimestre+capa
    unique("uq_data_point").on(
      table.municipioId,
      table.campo,
      table.anio,
      table.trimestre,
      table.fuenteCapa
    ),
  ]
);

// ─────────────────────────────────────────
// data_gaps (nuevo — brechas de datos detectadas)
// ─────────────────────────────────────────

export const dataGaps = pgTable(
  "data_gaps",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    municipioId: varchar("municipio_id", { length: 6 })
      .references(() => municipios.id)
      .notNull(),
    campo: varchar("campo", { length: 60 }).notNull(),
    anio: integer("anio").notNull(),
    trimestre: integer("trimestre"),

    /** ¿El municipio publica este dato? */
    existeEnMunicipal: boolean("existe_en_municipal").default(false).notNull(),
    /** ¿Existe en alguna fuente provincial? */
    existeEnProvincial: boolean("existe_en_provincial").default(false).notNull(),

    /** Tipo de brecha diagnosticada */
    tipo: varchar("tipo", { length: 30 }).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_data_gaps_municipio").on(table.municipioId),
    unique("uq_data_gap").on(
      table.municipioId,
      table.campo,
      table.anio,
      table.trimestre
    ),
  ]
);
