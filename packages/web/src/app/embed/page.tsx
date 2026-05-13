import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Embeds",
  description:
    "Widgets embebibles de Radar Municipal: ranking, mapa, etc. Copy-paste el snippet en tu blog o portal.",
};

/**
 * Sprint 45C — Index de embeds.
 *
 * Página pública con snippets copy-paste de los iframes que medios,
 * blogs y portales pueden poner en sus sitios. Cada embed tiene un
 * preview iframe en vivo + el código HTML correspondiente.
 *
 * NOTA: este page sí queda dentro de /embed/ pero su consumo es por
 * humanos (no por iframe). El layout `embed/layout.tsx` igual lo
 * envuelve — sale sin Navbar/Footer del sitio principal. OK, simplifica.
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://radarmunicipal.ar";

const EMBEDS = [
  {
    title: "Top 5 ranking",
    description:
      "Tabla compacta con los 5 mejores municipios del ranking, linkable a la ficha completa.",
    url: "/embed/ranking",
    width: 600,
    height: 400,
    snippet: `<iframe
  src="${SITE_URL}/embed/ranking"
  width="600"
  height="400"
  frameborder="0"
  style="border:1px solid #e2e8f0;border-radius:8px"
  loading="lazy"
  title="Top 5 ranking — Radar Municipal"
></iframe>`,
  },
  {
    title: "Top 10 ranking",
    description: "Mismo widget pero mostrando 10 municipios. Más alto.",
    url: "/embed/ranking?top=10",
    width: 600,
    height: 620,
    snippet: `<iframe
  src="${SITE_URL}/embed/ranking?top=10"
  width="600"
  height="620"
  frameborder="0"
  style="border:1px solid #e2e8f0;border-radius:8px"
  loading="lazy"
  title="Top 10 ranking — Radar Municipal"
></iframe>`,
  },
  {
    title: "Mapa interactivo",
    description:
      "Mini-mapa con los 135 partidos coloreados por score total. Click en partido lleva a su ficha.",
    url: "/embed/mapa",
    width: 800,
    height: 500,
    snippet: `<iframe
  src="${SITE_URL}/embed/mapa"
  width="800"
  height="500"
  frameborder="0"
  style="border:1px solid #e2e8f0;border-radius:8px"
  loading="lazy"
  title="Mapa interactivo — Radar Municipal"
></iframe>`,
  },
];

export default function EmbedIndexPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold">Embeds para medios y blogs</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Widgets listos para iframe-arse desde cualquier sitio. Datos
          actualizados mensualmente vía nuestro cron de GitHub Actions.
          Licencia <strong>CC BY 4.0</strong>: pedimos solo que cites la fuente.
        </p>
      </header>

      {EMBEDS.map((embed) => (
        <section
          key={embed.url}
          className="rounded-lg border border-border bg-card p-5"
        >
          <h2 className="text-lg font-semibold">{embed.title}</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            {embed.description}
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Preview iframe en vivo */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview en vivo
              </p>
              <iframe
                src={embed.url}
                width={embed.width}
                height={embed.height}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  width: "100%",
                  maxWidth: `${embed.width}px`,
                }}
                title={embed.title}
                loading="lazy"
              />
            </div>

            {/* Snippet copy-paste */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pegar este HTML
              </p>
              <pre className="overflow-x-auto rounded-lg border border-border bg-slate-950 p-3 text-xs text-slate-200 font-mono">
                <code>{embed.snippet}</code>
              </pre>
              <a
                href={embed.url}
                target="_blank"
                rel="noopener"
                className="mt-2 inline-block text-xs text-primary hover:underline"
              >
                Abrir directamente →
              </a>
            </div>
          </div>
        </section>
      ))}

      <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-5 text-sm text-amber-900">
        <h3 className="font-semibold mb-2">Notas técnicas</h3>
        <ul className="space-y-1.5 list-disc list-inside">
          <li>
            Los embeds setean <code className="text-xs">CSP frame-ancestors *</code>{" "}
            para permitir iframe-eado desde cualquier dominio.
          </li>
          <li>
            Click en cualquier elemento del widget abre el sitio principal en
            nueva pestaña (atributo <code className="text-xs">target=&quot;_top&quot;</code>).
          </li>
          <li>
            Los widgets son responsive: el ancho se adapta al contenedor. La
            altura fija debe elegirse según el contenido.
          </li>
          <li>
            <Link
              href="/datos-abiertos"
              className="font-medium text-amber-900 underline"
            >
              ¿Necesitás los datos crudos?
            </Link>{" "}
            Tenemos exports CSV/JSON y API REST gratis.
          </li>
        </ul>
      </section>
    </div>
  );
}
