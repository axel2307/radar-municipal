import type { Metadata } from "next";
import {
  getPresionImpositivaRanking,
  getPresionImpositivaStats,
} from "@/lib/scoring-data";
import { CASOS_TESTIGO_DEFAULT } from "@radar-municipal/core";
import { PresionImpositivaStats } from "@/components/PresionImpositivaStats";
import { PresionImpositivaPanel } from "@/components/PresionImpositivaPanel";
import { JsonLd } from "@/components/JsonLd";
import { RadicacionFinder } from "./RadicacionFinder";

export const metadata: Metadata = {
  title: "Presión impositiva",
  description:
    "Compará cuánto pagan los municipios de la Provincia de Buenos Aires en ABL, TSG, TISH, Tasa Vial Rural y Derechos de Construcción usando casos testigo estandarizados.",
  openGraph: {
    title: "Presión impositiva — Radar Municipal",
    description:
      "Comparador de tasas y contribuciones municipales de la Provincia de Buenos Aires.",
  },
};

function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Page() {
  const stats = getPresionImpositivaStats();
  const rows = getPresionImpositivaRanking();
  const casos = CASOS_TESTIGO_DEFAULT;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Presión impositiva municipal — Radar Municipal",
          description:
            "Comparación de tasas y contribuciones municipales de la Provincia de Buenos Aires mediante casos testigo estandarizados (TSG/ABL, TISH, Tasa Vial Rural, Derechos de Construcción).",
          url: "https://radarmunicipal.ar/presion-impositiva",
          creator: {
            "@type": "Organization",
            name: "Radar Municipal",
            url: "https://radarmunicipal.ar",
          },
          license: "https://creativecommons.org/licenses/by/4.0/",
          spatialCoverage: {
            "@type": "Place",
            name: "Provincia de Buenos Aires, Argentina",
          },
          temporalCoverage: String(stats.anioFiscalReferencia),
        }}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-bold">Presión impositiva</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          ¿Cuánto se paga en cada municipio? Comparamos 4 casos testigo
          estandarizados contra los {stats.totalMunicipios} municipios de la
          Provincia. Los {stats.conDatosCompletos} municipios piloto muestran
          valores estimados para el ejercicio {stats.anioFiscalReferencia}; los
          restantes aparecen sin datos hasta que se parseen las ordenanzas
          impositivas.
        </p>
      </header>

      {/* Banner metodológico */}
      <div
        role="note"
        className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <p className="font-medium">Valores de referencia — pendiente auditoría</p>
        <p className="mt-1 text-amber-800">
          Los montos son estimaciones plausibles basadas en patrones conocidos
          para el ejercicio {stats.anioFiscalReferencia}, marcados con
          confianza <strong>baja</strong>. Se reemplazarán por valores
          verificados cuando el pipeline automático parsee las Ordenanzas
          Fiscales e Impositivas vigentes. No uses estos valores para decisiones
          legales o contables.
        </p>
      </div>

      <PresionImpositivaStats stats={stats} />

      {/* Sprint 49 — Calculadora "¿Dónde me conviene radicarme?" */}
      <RadicacionFinder rows={rows} />

      {/* Sprint 49 — Card educativa: municipal vs provincial vs nacional */}
      <section
        aria-label="Qué tasas son municipales"
        className="mb-8 rounded-lg border border-blue-200 bg-blue-50/50 p-5 text-sm"
      >
        <h2 className="mb-3 text-base font-semibold text-blue-900">
          ¿Qué tasas son realmente municipales?
        </h2>
        <p className="mb-3 text-blue-900/80">
          Solo las tasas <strong>municipales</strong> dependen del municipio
          donde vivís o tenés tu negocio. La patente del auto y otros
          impuestos importantes los cobra la <strong>provincia</strong> o
          la <strong>nación</strong>, no varían por municipio.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              ✓ Municipales (cubrimos)
            </p>
            <ul className="space-y-1 text-xs text-foreground">
              <li>· ABL / Tasa Servicios Generales</li>
              <li>· TISH (Inspección Seguridad e Higiene)</li>
              <li>· Tasa Vial Rural</li>
              <li>· Derechos de Construcción</li>
              <li className="text-muted-foreground">
                · Habilitación comercial *
              </li>
              <li className="text-muted-foreground">
                · Cementerio, publicidad *
              </li>
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">
              * Pendiente de cobertura — Sprint 50+
            </p>
          </div>
          <div className="rounded-md bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              × Provinciales (no varían x municipio)
            </p>
            <ul className="space-y-1 text-xs text-foreground">
              <li>
                <strong>Patente automotor</strong> (ARBA)
              </li>
              <li>
                <strong>Inmobiliario provincial</strong> (ARBA)
              </li>
              <li>
                <strong>Ingresos Brutos</strong> (ARBA)
              </li>
              <li>· Sellos · Embarcaciones</li>
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Los cobra la Provincia. Mudarte de un municipio a otro NO los
              cambia.
            </p>
          </div>
          <div className="rounded-md bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
              × Nacionales
            </p>
            <ul className="space-y-1 text-xs text-foreground">
              <li>
                <strong>IVA</strong> (AFIP)
              </li>
              <li>
                <strong>Ganancias</strong> (AFIP)
              </li>
              <li>· Bienes Personales</li>
              <li>· Monotributo · Autónomos</li>
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Los cobra la Nación. Iguales en todo el país.
            </p>
          </div>
        </div>
      </section>

      {/* Casos testigo: parámetros explícitos */}
      <section
        aria-label="Casos testigo"
        className="mb-8 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <CasoCard
          titulo="Vivienda urbana"
          subtitulo="Tasa Servicios Generales / ABL"
          detalle={`Valuación fiscal ${formatArs(casos.vivienda.valuacionFiscal)} · ${casos.vivienda.zona}`}
        />
        <CasoCard
          titulo="Comercio minorista"
          subtitulo="Tasa Seguridad e Higiene (TISH)"
          detalle={`IIBB declarados ${formatArs(casos.comercio.iibbAnual)}/año · ${casos.comercio.rubro}`}
        />
        <CasoCard
          titulo="Explotación rural"
          subtitulo="Tasa Vial Rural"
          detalle={`${casos.rural.hectareas} ha · ${casos.rural.tipoTierra}`}
        />
        <CasoCard
          titulo="Obra nueva"
          subtitulo="Derechos de Construcción"
          detalle={`${casos.construccion.metrosCuadrados} m² · ${casos.construccion.categoria}`}
        />
      </section>

      <PresionImpositivaPanel rows={rows} />

      <section className="mt-10 rounded-lg border border-border bg-muted/30 p-5 text-sm">
        <h2 className="mb-2 text-base font-semibold">Metodología</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            El <strong>índice relativo</strong> (0-100) es el promedio de los
            percentiles del municipio en los 4 casos testigo disponibles. 100 =
            más caro relativo al conjunto; 0 = más barato.
          </li>
          <li>
            Los municipios urbanos sin superficie rural (Vicente López, San
            Isidro) no reportan Tasa Vial Rural; el índice se calcula sobre los
            3 casos aplicables.
          </li>
          <li>
            La detección de <strong>Ordenanza Fiscal vigente</strong> se cruza
            con la vista Normativa y SIBOM; publicarla es una condición
            necesaria de transparencia tributaria.
          </li>
          <li>
            Fuentes primarias (cuando estén parseadas): Ordenanza Fiscal y
            Ordenanza Impositiva anuales de cada municipio, publicadas vía
            boletín oficial municipal o SIBOM.
          </li>
        </ul>
      </section>
    </div>
  );
}

function CasoCard({
  titulo,
  subtitulo,
  detalle,
}: {
  titulo: string;
  subtitulo: string;
  detalle: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {subtitulo}
      </div>
      <div className="mt-1 text-base font-semibold text-foreground">{titulo}</div>
      <div className="mt-2 text-xs text-muted-foreground">{detalle}</div>
    </div>
  );
}
