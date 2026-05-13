import type { Metadata } from "next";
import Link from "next/link";
import { ScoringCategory, ScoringDimension, SCORING_CATEGORIES } from "@radar-municipal/core";
import { SCORING_DIMENSION_LABELS } from "@radar-municipal/core";

export const metadata: Metadata = {
  title: "Dimensiones de análisis",
  description:
    "Las 12 dimensiones con las que Radar Municipal evalúa a los 135 municipios de la Provincia de Buenos Aires.",
};

/** Slug mapping for each dimension */
const DIMENSION_SLUGS: Record<ScoringDimension, string> = {
  [ScoringDimension.TRANSPARENCIA]: "transparencia",
  [ScoringDimension.FISCAL]: "fiscal",
  [ScoringDimension.NORMATIVA]: "normativa",
  [ScoringDimension.PARTICIPACION_CIUDADANA]: "participacion-ciudadana",
  [ScoringDimension.GASTO_POR_FUNCION]: "gasto-por-funcion",
  [ScoringDimension.ECONOMIA_LOCAL]: "economia-local",
  [ScoringDimension.PRESION_IMPOSITIVA]: "presion-impositiva",
  [ScoringDimension.SERVICIOS_BASICOS]: "servicios-basicos",
  [ScoringDimension.EDUCACION_SALUD]: "educacion-salud",
  [ScoringDimension.CONECTIVIDAD_DIGITAL]: "conectividad-digital",
  [ScoringDimension.ESPACIO_PUBLICO]: "espacio-publico",
  [ScoringDimension.SEGURIDAD_VIAL]: "seguridad-vial",
  // Legacy dimensions without pages
  [ScoringDimension.COMPRAS]: "compras",
  [ScoringDimension.CALIDAD_DATOS]: "calidad-datos",
};

/** One-line descriptions for each active dimension */
const DIMENSION_DESCRIPTIONS: Partial<Record<ScoringDimension, string>> = {
  [ScoringDimension.TRANSPARENCIA]:
    "Publicación de presupuesto, ejecución, deuda y accesibilidad del portal",
  [ScoringDimension.FISCAL]:
    "Indicadores fiscales: gasto per cápita, deuda, composición del gasto",
  [ScoringDimension.NORMATIVA]:
    "Ordenanzas, boletín oficial vía SIBOM, compras y contrataciones",
  [ScoringDimension.PARTICIPACION_CIUDADANA]:
    "Presupuesto participativo, audiencias públicas, reclamos",
  [ScoringDimension.GASTO_POR_FUNCION]:
    "Distribución del gasto por servicios sociales, económicos y administración",
  [ScoringDimension.ECONOMIA_LOCAL]:
    "Empleo, empresas, construcción y recaudación per cápita",
  [ScoringDimension.PRESION_IMPOSITIVA]:
    "Carga tributaria municipal medida con 4 casos testigo comparables",
  [ScoringDimension.SERVICIOS_BASICOS]:
    "Agua de red, cloacas, gas, recolección de residuos",
  [ScoringDimension.EDUCACION_SALUD]:
    "Escuelas, centros de salud, camas hospitalarias per cápita",
  [ScoringDimension.CONECTIVIDAD_DIGITAL]:
    "Internet, banda ancha, computadoras, servicios digitales",
  [ScoringDimension.ESPACIO_PUBLICO]:
    "Espacio verde per cápita, arbolado, separación de residuos",
  [ScoringDimension.SEGURIDAD_VIAL]:
    "Siniestros viales, pavimento, ciclovías, transporte público",
};

/** Category display order */
const CATEGORY_ORDER: ScoringCategory[] = [
  ScoringCategory.GOBIERNO_ABIERTO,
  ScoringCategory.ECONOMIA_FINANZAS,
  ScoringCategory.CALIDAD_DE_VIDA,
  ScoringCategory.INFRAESTRUCTURA_MOVILIDAD,
];

/** Tailwind badge colors per category */
const CATEGORY_BADGE_COLORS: Record<ScoringCategory, { bg: string; text: string }> = {
  [ScoringCategory.GOBIERNO_ABIERTO]: { bg: "bg-blue-100", text: "text-blue-700" },
  [ScoringCategory.ECONOMIA_FINANZAS]: { bg: "bg-amber-100", text: "text-amber-700" },
  [ScoringCategory.CALIDAD_DE_VIDA]: { bg: "bg-green-100", text: "text-green-700" },
  [ScoringCategory.INFRAESTRUCTURA_MOVILIDAD]: { bg: "bg-violet-100", text: "text-violet-700" },
};

export default function DimensionesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">
        Dimensiones de análisis
      </h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Radar Municipal evalúa a cada municipio en 12 dimensiones agrupadas en 4
        categorías. Cada dimensión tiene su propio ranking y metodología
        trazable.
      </p>

      {/* Sprint 41C — Cross-dimensional, vive fuera del sistema de 4 categorías
          porque combina datos fiscales + GIS y no produce score 0-100 sino
          un indicador monetario en pesos/km. */}
      <section className="mt-10 rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700 uppercase tracking-wide">
                Pilar 5 · Cross-dimensional
              </span>
            </div>
            <h2 className="text-xl font-bold">Red vial — Pesos por km</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cruce de gasto fiscal RAFAM (servicios económicos) × red vial
              OSM. Indicador en pesos/km que captura cuánto invierte cada
              municipio por kilómetro de infraestructura mantenida. No es un
              score 0-100; es un valor monetario comparable.
            </p>
          </div>
          <Link
            href="/dimensiones/red-vial"
            className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shrink-0"
          >
            Ver ranking →
          </Link>
        </div>
      </section>

      <div className="mt-12 space-y-12">
        {CATEGORY_ORDER.map((cat) => {
          const config = SCORING_CATEGORIES[cat];
          const badge = CATEGORY_BADGE_COLORS[cat];

          return (
            <section key={cat}>
              <div className="flex items-center gap-3 mb-6">
                <span
                  className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-semibold ${badge.bg} ${badge.text}`}
                >
                  {config.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  Peso: {Math.round(config.peso * 100)}%
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {config.dimensions.map(({ dimension }) => {
                  const slug = DIMENSION_SLUGS[dimension];
                  const label = SCORING_DIMENSION_LABELS[dimension];
                  const description = DIMENSION_DESCRIPTIONS[dimension];

                  return (
                    <Link
                      key={dimension}
                      href={`/dimensiones/${slug}`}
                      className="group rounded-lg border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all"
                    >
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {label}
                      </h3>
                      {description && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {description}
                        </p>
                      )}
                      <span className="mt-3 inline-block text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver ranking &rarr;
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
