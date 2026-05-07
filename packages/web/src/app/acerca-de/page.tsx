import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acerca de",
};

export default function AcercaDePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-8">Acerca de Radar Municipal</h1>

      <div className="space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Misión</h2>
          <p>
            Crear el estándar de comparación municipal que hoy no existe en
            Argentina. Radar Municipal convierte información pública dispersa de
            los 135 municipios de la Provincia de Buenos Aires en datos
            comparables, rankeables y auditables.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            ¿Para quién es?
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Ciudadanos</strong> que
              quieren entender su municipio en 2 minutos
            </li>
            <li>
              <strong className="text-foreground">Periodistas</strong> buscando
              historias con datos
            </li>
            <li>
              <strong className="text-foreground">Concejales y equipos
              políticos</strong> que necesitan información comparable
            </li>
            <li>
              <strong className="text-foreground">ONGs y civic tech</strong>{" "}
              que trabajan en transparencia y gobierno abierto
            </li>
            <li>
              <strong className="text-foreground">Los propios municipios</strong>{" "}
              que quieran mostrar su gestión
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Principios
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Datos públicos</strong>: solo
              usamos información de fuentes oficiales y públicas
            </li>
            <li>
              <strong className="text-foreground">Código abierto</strong>: el
              código fuente, la metodología y los datos son accesibles
            </li>
            <li>
              <strong className="text-foreground">Trazabilidad</strong>: cada
              score puede verificarse hasta su fuente original
            </li>
            <li>
              <strong className="text-foreground">Sin sesgos</strong>: la
              metodología es pública y las fórmulas explícitas
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Estado actual</h2>
          <p className="mb-3">
            El proyecto cubre actualmente 13 municipios piloto con datos reales
            en 3 dimensiones de análisis:
          </p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li>
              <strong className="text-foreground">Transparencia</strong>: auditoría manual de 8 criterios sobre publicación fiscal y accesibilidad
            </li>
            <li>
              <strong className="text-foreground">Fiscal</strong>: indicadores extraídos de reportes RAFAM (gasto per cápita, deuda, composición)
            </li>
            <li>
              <strong className="text-foreground">Normativa y compras</strong>: datos de SIBOM sobre boletines oficiales, ordenanzas y licitaciones
            </li>
          </ul>
          <p>
            La cobertura se ampliará progresivamente a los 135 partidos con
            scraping automatizado. Todos los datos están disponibles como{" "}
            <a href="/datos-abiertos" className="text-primary hover:underline">
              datos abiertos
            </a>{" "}
            bajo licencia CC BY 4.0.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-muted/50 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Contacto
          </h2>
          <p className="text-sm">
            ¿Querés colaborar, reportar un error o sugerir una mejora? El
            proyecto es de código abierto y las contribuciones son bienvenidas.
          </p>
        </section>
      </div>
    </div>
  );
}
