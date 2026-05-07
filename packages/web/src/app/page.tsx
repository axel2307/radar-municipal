import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-primary text-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Radar Municipal
            </h1>
            <p className="mt-4 text-xl text-white/80">
              El estándar de comparación municipal que Argentina necesita.
              Datos públicos de los 135 municipios de la Provincia de Buenos
              Aires, comparables, rankeables y auditables.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                href="/ranking"
                className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-primary shadow-sm hover:bg-white/90 transition-colors"
              >
                Ver ranking
              </Link>
              <Link
                href="/metodologia"
                className="rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Conocer la metodología
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Qué es */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
              1
            </div>
            <h3 className="text-lg font-semibold">Agrega</h3>
            <p className="mt-2 text-muted-foreground">
              Recopila información pública dispersa de portales municipales,
              SIBOM, datos abiertos y fuentes oficiales de la Provincia.
            </p>
          </div>
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
              2
            </div>
            <h3 className="text-lg font-semibold">Normaliza y compara</h3>
            <p className="mt-2 text-muted-foreground">
              Transforma datos heterogéneos en indicadores homogéneos:
              per cápita, por km², con trazabilidad completa.
            </p>
          </div>
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
              3
            </div>
            <h3 className="text-lg font-semibold">Rankea y alerta</h3>
            <p className="mt-2 text-muted-foreground">
              Genera rankings por dimensión (transparencia, fiscal, normativa)
              y detecta cambios relevantes automáticamente.
            </p>
          </div>
        </div>
      </section>

      {/* Pilares */}
      <section className="bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Dimensiones de análisis</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Transparencia",
                desc: "¿Publica presupuesto, ejecución, deuda? ¿Está actualizado? ¿Es accesible y reutilizable?",
                href: "/dimensiones/transparencia",
                active: true,
              },
              {
                title: "Fiscal",
                desc: "Gasto per cápita, deuda, composición del gasto, resultado fiscal. Indicadores comparables.",
                href: "/dimensiones/fiscal",
                active: true,
              },
              {
                title: "Normativa",
                desc: "Ordenanzas, decretos, resoluciones. Boletín oficial vía SIBOM. Timeline institucional viva.",
                href: "/dimensiones/normativa",
                active: true,
              },
              {
                title: "Compras",
                desc: "Publicación de licitaciones y adjudicaciones. Detección de portales de compras.",
                href: "/dimensiones",
                active: true,
              },
              {
                title: "Calidad de datos",
                desc: "Machine-readability, formatos abiertos, facilidad de acceso.",
                href: "/dimensiones",
                active: true,
              },
            ].map((d) => (
              <Link
                key={d.title}
                href={d.href}
                className="rounded-lg border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{d.title}</h3>
                  {d.active ? (
                    <span className="rounded-full bg-score-high/10 px-2 py-0.5 text-xs font-medium text-score-high">
                      Activa
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{d.desc}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/dimensiones"
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver todas las dimensiones &rarr;
            </Link>
          </div>
        </div>
      </section>
      {/* Datos Abiertos / API */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold">Datos abiertos</h2>
        <p className="mt-2 text-muted-foreground">
          Toda la información de Radar Municipal es libre y reutilizable bajo
          licencia CC BY 4.0. Descargá los datos o usá nuestra API.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href={`${API_BASE_URL}/api/export/ranking.csv`}
            className="rounded-lg border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold">Ranking CSV</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranking completo con scores en formato CSV, compatible con Excel.
            </p>
          </a>
          <a
            href={`${API_BASE_URL}/api/export/ranking.json`}
            className="rounded-lg border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold">Ranking JSON</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranking con metadatos en formato JSON para integración.
            </p>
          </a>
          <a
            href={`${API_BASE_URL}/api/export/municipios.csv`}
            className="rounded-lg border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold">Municipios CSV</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Los 135 municipios con datos base en CSV.
            </p>
          </a>
          <a
            href={`${API_BASE_URL}/api/docs/explorer`}
            className="rounded-lg border border-primary/20 bg-primary/5 p-5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold text-primary">API Pública</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Documentación interactiva de la API REST con spec OpenAPI.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
