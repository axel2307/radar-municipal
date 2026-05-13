import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";
import {
  getGlobalRefreshManifest,
  getRefreshAge,
  getRefreshHealth,
} from "@/lib/scoring-data";
import { cn } from "@/lib/utils";

const HEALTH_DOT: Record<"healthy" | "degraded" | "stale", string> = {
  healthy: "bg-green-500",
  degraded: "bg-amber-500",
  stale: "bg-red-500",
};

/**
 * Sprint 41B — Footer expandido a 4 columnas para surface las páginas
 * "secundarias" (presión impositiva, compras, calidad de datos, etc.)
 * que ya no aparecen en el top nav.
 *
 * Cada link tiene un home: top nav (primary) o footer (secondary). Cero
 * "huérfanos" inalcanzables desde navegación.
 */
export function Footer() {
  // Sprint 28 — mini-indicator de frescura linkeable a /datos-abiertos#frescura.
  let freshnessLine: React.ReactNode = null;
  try {
    const manifest = getGlobalRefreshManifest();
    const { humanAR } = getRefreshAge(manifest);
    const health = getRefreshHealth(manifest);
    freshnessLine = (
      <Link
        href="/datos-abiertos#frescura"
        className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
        title="Ver detalle de la última actualización"
      >
        <span
          className={cn("inline-block h-2 w-2 rounded-full", HEALTH_DOT[health])}
          aria-hidden
        />
        <span>Datos actualizados {humanAR}</span>
      </Link>
    );
  } catch {
    // Manifest faltante o JSON inválido — no rompemos el footer.
  }

  return (
    <footer className="mt-auto border-t border-border bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Col 1 — Marca */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white text-xs font-bold">
                RM
              </div>
              <span className="text-sm font-semibold">Radar Municipal</span>
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              Datos públicos, comparables y auditables de los 135 municipios de
              la Provincia de Buenos Aires.
            </p>
          </div>

          {/* Col 2 — Explorar */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Explorar
            </h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/ranking" className="hover:text-primary transition-colors">
                  Ranking
                </Link>
              </li>
              <li>
                <Link href="/mapa" className="hover:text-primary transition-colors">
                  Mapa
                </Link>
              </li>
              <li>
                <Link href="/comparador" className="hover:text-primary transition-colors">
                  Comparador
                </Link>
              </li>
              <li>
                <Link href="/municipios" className="hover:text-primary transition-colors">
                  Municipios
                </Link>
              </li>
              <li>
                <Link href="/panorama" className="hover:text-primary transition-colors">
                  Panorama
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 — Análisis profundo */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Análisis profundo
            </h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/dimensiones" className="hover:text-primary transition-colors">
                  Dimensiones
                </Link>
              </li>
              <li>
                <Link href="/presion-impositiva" className="hover:text-primary transition-colors">
                  Presión impositiva
                </Link>
              </li>
              <li>
                <Link href="/compras" className="hover:text-primary transition-colors">
                  Compras
                </Link>
              </li>
              <li>
                <Link href="/calidad-datos" className="hover:text-primary transition-colors">
                  Calidad de datos
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 — Datos y sobre */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Datos &amp; Sobre
            </h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/datos-abiertos" className="hover:text-primary transition-colors">
                  Datos abiertos
                </Link>
              </li>
              <li>
                <a
                  href={`${API_BASE_URL}/api/docs/explorer`}
                  className="hover:text-primary transition-colors"
                >
                  API pública
                </a>
              </li>
              <li>
                <Link href="/metodologia" className="hover:text-primary transition-colors">
                  Metodología
                </Link>
              </li>
              <li>
                <Link href="/acerca-de" className="hover:text-primary transition-colors">
                  Acerca de
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom strip — copyright + freshness */}
        <div className="mt-8 flex flex-col items-center gap-2 border-t border-border pt-4 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <div>
            Proyecto de código abierto · Datos de fuentes públicas oficiales ·
            Licencia CC BY 4.0
          </div>
          {freshnessLine}
        </div>
      </div>
    </footer>
  );
}
