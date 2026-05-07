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

export function Footer() {
  // Sprint 28 — mini-indicator de frescura linkeable a /datos-abiertos#frescura.
  // Sprint 27 generó `auto-refresh-manifest.json`. Si por alguna razón
  // el archivo no estuviera (build sin cron previo), el catch silencioso
  // evita romper el footer global.
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold">Radar Municipal</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Datos públicos, comparables y auditables de los 135 municipios de
              la Provincia de Buenos Aires.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Navegación</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>
                <Link href="/ranking" className="hover:text-foreground transition-colors">
                  Ranking
                </Link>
              </li>
              <li>
                <Link href="/municipios" className="hover:text-foreground transition-colors">
                  Municipios
                </Link>
              </li>
              <li>
                <Link href="/comparador" className="hover:text-foreground transition-colors">
                  Comparador
                </Link>
              </li>
              <li>
                <Link href="/metodologia" className="hover:text-foreground transition-colors">
                  Metodología
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Datos abiertos</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>
                <a href={`${API_BASE_URL}/api/export/ranking.csv`} className="hover:text-foreground transition-colors">
                  Descargar ranking (CSV)
                </a>
              </li>
              <li>
                <a href={`${API_BASE_URL}/api/export/ranking.json`} className="hover:text-foreground transition-colors">
                  Descargar ranking (JSON)
                </a>
              </li>
              <li>
                <a href={`${API_BASE_URL}/api/docs/explorer`} className="hover:text-foreground transition-colors">
                  API pública
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center gap-2 border-t border-border pt-4 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <div>
            Proyecto de código abierto &middot; Datos de fuentes públicas
            oficiales &middot; Licencia CC BY 4.0
          </div>
          {freshnessLine}
        </div>
      </div>
    </footer>
  );
}
