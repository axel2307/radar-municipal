import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metodología",
};

export default function MetodologiaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-8">Metodología</h1>

      <div className="space-y-10">
        {/* Principios */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Principios fundamentales</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              Radar Municipal se basa en principios metodológicos claros y
              transparentes. Cada decisión de scoring es trazable hasta su
              fuente original.
            </p>

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-semibold text-foreground">
                1. Separar &quot;no publica&quot; de &quot;gestiona mal&quot;
              </h3>
              <p className="mt-1 text-sm">
                La cobertura de datos es una dimensión propia, no un castigo
                moral. Un municipio que no publica puede tener excelente gestión
                fiscal pero baja transparencia. Medimos ambas cosas por
                separado.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-semibold text-foreground">
                2. Trazabilidad completa
              </h3>
              <p className="mt-1 text-sm">
                Cada score tiene: fuente original (URL), fórmula aplicada, fecha
                de extracción, nivel de confianza y advertencias. Cualquiera
                puede verificar cómo se llegó a cada número.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-semibold text-foreground">
                3. Rankings por dimensión
              </h3>
              <p className="mt-1 text-sm">
                No existe un &quot;número mágico&quot; único. Los rankings se
                presentan por dimensión: transparencia, fiscal, normativa,
                compras, calidad de datos. El usuario decide qué le importa.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-semibold text-foreground">
                4. Normalización siempre
              </h3>
              <p className="mt-1 text-sm">
                Todos los indicadores fiscales se normalizan per cápita, por
                km² o por km de red vial estimada según corresponda. Nunca se
                rankea por monto bruto.
              </p>
            </div>
          </div>
        </section>

        {/* Cálculo del score */}
        <section>
          <h2 className="text-xl font-semibold mb-3">
            Cálculo del score de transparencia
          </h2>
          <p className="text-muted-foreground mb-4">
            El score de transparencia se calcula como la suma ponderada de 8
            criterios evaluados en una auditoría manual del portal web de cada
            municipio. El resultado es un valor entre 0 y 100.
          </p>

          <div className="rounded-lg border border-border bg-card p-4 mb-4">
            <p className="text-sm font-mono text-center">
              Score = Σ (valor<sub>i</sub> × peso<sub>i</sub>) × 100
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              donde valor<sub>i</sub> ∈ [0, 1] y Σ peso<sub>i</sub> = 1.0
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                    Criterio
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-16">
                    Peso
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                    Cómo se calcula
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">Presupuesto publicado</td>
                  <td className="px-4 py-2 text-center">20%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    1 si el presupuesto aprobado está publicado en el portal, 0 si no.
                    Se busca el documento de categoría PRESUPUESTO en la auditoría.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">Ejecución publicada</td>
                  <td className="px-4 py-2 text-center">20%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    1 si la ejecución presupuestaria está publicada, 0 si no.
                    Se busca el documento de categoría EJECUCION.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">Rezago en días</td>
                  <td className="px-4 py-2 text-center">15%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    Decaimiento lineal: <span className="font-mono">max(0, 1 − días/180)</span>.
                    Se toma el menor rezago entre ejecución y presupuesto.
                    0 días = 1.0 (perfecto), 90 días = 0.5, 180+ días = 0.
                    Sin fecha de publicación = 0.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">Finalidad y función</td>
                  <td className="px-4 py-2 text-center">10%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    1 si publica gasto por finalidad y función, 0 si no.
                    Se busca el documento de categoría FINALIDAD_FUNCION.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">Deuda publicada</td>
                  <td className="px-4 py-2 text-center">10%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    1 si publica estado de deuda pública, 0 si no.
                    Se busca el documento de categoría DEUDA.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">Accesibilidad (clicks)</td>
                  <td className="px-4 py-2 text-center">10%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    Función escalonada según clicks desde la home hasta los datos fiscales:
                    1–2 clicks = 1.0, 3 clicks = 0.7, 4 clicks = 0.4, 5+ clicks = 0.2.
                    Sin portal = 0.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">Menú transparencia</td>
                  <td className="px-4 py-2 text-center">5%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    1 si el sitio tiene una sección o menú de &quot;Transparencia&quot;
                    visible en la navegación principal, 0 si no.
                  </td>
                </tr>
                <tr className="last:border-0">
                  <td className="px-4 py-2 font-medium">Machine-readability</td>
                  <td className="px-4 py-2 text-center">10%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    Proporción de documentos publicados en formatos reutilizables.
                    Formatos que puntúan: CSV, XLS, XLSX, JSON, HTML, o PDF parseable.
                    Fórmula: <span className="font-mono">docs_legibles / docs_publicados</span>.
                    Si no hay documentos publicados = 0.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Ejemplo */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Ejemplo de cálculo</h2>
          <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-2">
            <p className="text-muted-foreground">
              Un municipio que publica presupuesto y ejecución (ambos en PDF
              parseable), con 45 días de rezago, sin finalidad/función ni deuda,
              accesible en 2 clicks, con menú de transparencia visible:
            </p>
            <div className="font-mono text-xs space-y-1 mt-3">
              <p>Presupuesto: 1.0 × 0.20 = <strong>20.0</strong></p>
              <p>Ejecución: 1.0 × 0.20 = <strong>20.0</strong></p>
              <p>Rezago: max(0, 1 − 45/180) = 0.75 × 0.15 = <strong>11.3</strong></p>
              <p>Finalidad: 0.0 × 0.10 = <strong>0.0</strong></p>
              <p>Deuda: 0.0 × 0.10 = <strong>0.0</strong></p>
              <p>Clicks (2): 1.0 × 0.10 = <strong>10.0</strong></p>
              <p>Menú: 1.0 × 0.05 = <strong>5.0</strong></p>
              <p>Machine-read: 2/2 = 1.0 × 0.10 = <strong>10.0</strong></p>
              <p className="border-t border-border pt-2 font-bold">
                Score total = 76.3 / 100
              </p>
            </div>
          </div>
        </section>

        {/* Interpretación */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Interpretación de scores</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-score-high/10 text-score-high font-bold text-lg mb-2">
                70+
              </div>
              <p className="text-sm font-medium">Alto</p>
              <p className="text-xs text-muted-foreground mt-1">
                Publica la mayoría de los documentos clave, con rezago aceptable
                y buena accesibilidad.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-score-mid/10 text-score-mid font-bold text-lg mb-2">
                40–69
              </div>
              <p className="text-sm font-medium">Medio</p>
              <p className="text-xs text-muted-foreground mt-1">
                Publica algunos documentos pero con carencias en cobertura,
                actualización o accesibilidad.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-score-low/10 text-score-low font-bold text-lg mb-2">
                0–39
              </div>
              <p className="text-sm font-medium">Bajo</p>
              <p className="text-xs text-muted-foreground mt-1">
                Publica pocos o ningún documento fiscal clave, o los datos son
                inaccesibles.
              </p>
            </div>
          </div>
        </section>

        {/* Score fiscal */}
        <section>
          <h2 className="text-xl font-semibold mb-3">
            Cálculo del score fiscal
          </h2>
          <p className="text-muted-foreground mb-4">
            El score fiscal evalúa la salud financiera del municipio usando 4
            indicadores normalizados per cápita o como porcentaje. El resultado
            es un valor entre 0 y 100.
          </p>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                    Indicador
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-16">
                    Peso
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                    Cómo se normaliza
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">Resultado fiscal per cápita</td>
                  <td className="px-4 py-2 text-center">30%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    Superávit per cápita → 0.5 a 1.0 (proporcional).
                    Equilibrio → 0.5. Déficit → 0.0 a 0.5. Mide si el municipio
                    gasta menos de lo que recauda.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">% Gasto en personal</td>
                  <td className="px-4 py-2 text-center">25%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    Escala: &lt;40% → 1.0, 40-50% → 0.8, 50-60% → 0.6,
                    60-70% → 0.4, 70-80% → 0.2, &gt;80% → 0.0.
                    Mide rigidez del gasto. Media municipal AR: 55-65%.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">% Gasto de capital</td>
                  <td className="px-4 py-2 text-center">20%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    Escala: ≥20% → 1.0, 15-20% → 0.8, 10-15% → 0.6,
                    5-10% → 0.4, &lt;5% → 0.2.
                    Mide inversión real. Media municipal AR: 8-12%.
                  </td>
                </tr>
                <tr className="last:border-0">
                  <td className="px-4 py-2 font-medium">Deuda per cápita</td>
                  <td className="px-4 py-2 text-center">25%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    Se mide como ratio deuda/gasto per cápita.
                    &lt;5% → 1.0, 5-10% → 0.8, 10-20% → 0.6, 20-30% → 0.4,
                    &gt;30% → 0.2. Mide sostenibilidad de la deuda.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 mt-4">
            <h3 className="font-semibold text-foreground mb-2">
              Score total combinado
            </h3>
            <p className="text-sm text-muted-foreground">
              El score total de cada municipio es el promedio simple de las
              dimensiones disponibles:{" "}
              <span className="font-mono">
                Total = (Transparencia + Fiscal + Normativa) / 3
              </span>
              . En fases futuras se incorporarán más dimensiones (obras,
              vialidad) con ponderaciones ajustadas.
            </p>
          </div>
        </section>

        {/* Score normativo */}
        <section>
          <h2 className="text-xl font-semibold mb-3">
            Cálculo del score normativo y de compras
          </h2>
          <p className="text-muted-foreground mb-4">
            El score normativo evalúa la accesibilidad institucional: si el
            municipio tiene boletín oficial consultable, ordenanza fiscal
            vigente publicada, y si publica licitaciones y adjudicaciones.
          </p>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                    Criterio
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-muted-foreground w-16">
                    Peso
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">
                    Cómo se evalúa
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">Boletín oficial en SIBOM</td>
                  <td className="px-4 py-2 text-center">30%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    0 si no tiene boletín en SIBOM. 0.5 si tiene. 0.8 si el
                    último boletín es de 2025+. 1.0 si tiene 100+ boletines
                    publicados (historial amplio).
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">Ordenanza fiscal vigente</td>
                  <td className="px-4 py-2 text-center">25%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    1 si se detectó ordenanza fiscal/tributaria/impositiva vigente
                    (en SIBOM o en el portal municipal), 0 si no.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2 font-medium">Publicación de licitaciones</td>
                  <td className="px-4 py-2 text-center">25%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    0 si no publica. 0.6 si publica licitaciones. 0.8 si tiene
                    portal dedicado. 1.0 si tiene 10+ licitaciones detectadas.
                  </td>
                </tr>
                <tr className="last:border-0">
                  <td className="px-4 py-2 font-medium">Publicación de adjudicaciones</td>
                  <td className="px-4 py-2 text-center">20%</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    1 si publica adjudicaciones trazables, 0 si no.
                    Las adjudicaciones cierran el ciclo de transparencia en
                    compras públicas.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Proceso de auditoría */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Proceso de auditoría</h2>
          <div className="text-muted-foreground space-y-3 text-sm">
            <p>
              En la fase actual del proyecto, los datos se recopilan mediante
              auditoría manual de los portales web de cada municipio. El proceso
              para cada municipio consiste en:
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>
                Acceder al sitio oficial del municipio y buscar la sección de
                transparencia fiscal o datos abiertos.
              </li>
              <li>
                Registrar la cantidad de clicks necesarios desde la home para
                llegar a los documentos fiscales.
              </li>
              <li>
                Verificar la existencia de cada documento clave: presupuesto
                aprobado, ejecución presupuestaria, estado de ejecución fiscal
                (SEF), deuda pública, gasto por finalidad/función, y ordenanza
                fiscal.
              </li>
              <li>
                Para cada documento encontrado, registrar: formato (PDF, XLS,
                CSV, HTML), si es parseable por máquina, fecha de publicación y
                período fiscal que cubre.
              </li>
              <li>
                Calcular el rezago como la diferencia en días entre la fecha de
                corte del período fiscal y la fecha de publicación.
              </li>
            </ol>
            <p>
              En fases futuras, este proceso se automatizará mediante scrapers
              que detecten cambios en los portales municipales.
            </p>
          </div>
        </section>

        {/* Fuentes */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Fuentes de datos</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Fuente</th>
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Qué aporta</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { fuente: "Portales de transparencia municipales", aporte: "Presupuesto, ejecución, SEF, deuda (PDFs RAFAM)" },
                  { fuente: "SIBOM", aporte: "Normas por municipio: ordenanzas, decretos, licitaciones" },
                  { fuente: "ASAP", aporte: "Metodología de referencia y lista de municipios relevados" },
                  { fuente: "INDEC Censo 2022", aporte: "Población y superficie por partido" },
                  { fuente: "Datos Abiertos PBA / ARBA", aporte: "Geometrías de partidos, valuaciones" },
                ].map((row) => (
                  <tr key={row.fuente} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-medium">{row.fuente}</td>
                    <td className="px-4 py-2 text-muted-foreground">{row.aporte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Dimensiones futuras */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Dimensiones futuras</h2>
          <p className="text-muted-foreground text-sm mb-3">
            El score de transparencia es solo la primera dimensión. En fases
            sucesivas se incorporarán:
          </p>
          <div className="space-y-2">
            {[
              { nombre: "Fiscal", desc: "Indicadores homogéneos extraídos de documentos: gasto per cápita, deuda per cápita, composición del gasto" },
              { nombre: "Normativa", desc: "Cobertura del boletín oficial digital, publicación de ordenanzas fiscales vía SIBOM" },
              { nombre: "Compras", desc: "Publicación de licitaciones y adjudicaciones, concentración de proveedores (HHI)" },
              { nombre: "Obras", desc: "Obras anunciadas vs contratadas vs ejecutadas" },
            ].map((dim) => (
              <div key={dim.nombre} className="rounded-lg border border-border bg-card p-3">
                <p className="text-sm font-medium">{dim.nombre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{dim.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-muted-foreground pt-4 border-t border-border">
          Esta metodología es abierta y se irá refinando con el aporte de la
          comunidad. Si tenés sugerencias o encontrás errores, escribinos a
          través de la página de{" "}
          <Link href="/acerca-de" className="text-primary hover:underline">
            contacto
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
