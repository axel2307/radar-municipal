/**
 * Sprint 45C — Layout para embeds.
 *
 * Estos routes están pensados para iframe-arse desde sitios externos
 * (medios, blogs, portales municipales). El RootLayout pone Navbar +
 * Footer + CommandPalette, que NO tiene sentido en un widget de 600px.
 *
 * Este layout reemplaza eso con un wrapper mínimo: padding consistente +
 * atribución al sitio principal en footer chico. Heredamos `<html>` y
 * `<body>` del RootLayout — Next.js permite anidar layouts y este se
 * monta dentro de body sin reemplazarlo.
 *
 * NO mostramos el banner ni nav porque le robaría altura útil al iframe.
 */
import Link from "next/link";

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        {children}
        <footer className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span>
            Datos:{" "}
            <Link
              href="/"
              target="_blank"
              rel="noopener"
              className="font-medium text-primary hover:underline"
            >
              Radar Municipal
            </Link>
          </span>
          <span>CC BY 4.0 · Datos públicos PBA</span>
        </footer>
      </div>
    </div>
  );
}
