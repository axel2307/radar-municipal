import type { Municipio } from "@radar-municipal/core";
import { ShareButton } from "@/components/ShareButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatNumber } from "@/lib/utils";

/**
 * Sprint 47B — Header del municipio: breadcrumbs, h1 + piloto badge +
 * share, region/partido, 4 cards de datos base (pop, superficie, densidad,
 * sitio oficial). Extraído del monolítico page.tsx.
 */
interface MunicipioIntroProps {
  municipio: Municipio;
}

export function MunicipioIntro({ municipio }: MunicipioIntroProps) {
  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/", label: "Inicio" },
          { href: "/municipios", label: "Municipios" },
          { label: municipio.nombre },
        ]}
        className="mb-6"
      />

      <div className="mb-8">
        {/* Sprint 43A — flex-wrap evita overflow con nombres largos
            (General Pueyrredón, Tres de Febrero, etc.) en mobile. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-bold">{municipio.nombre}</h1>
          {municipio.esPiloto && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Piloto
            </span>
          )}
          <ShareButton title={`${municipio.nombre} - Radar Municipal`} />
        </div>
        <p className="mt-1 text-muted-foreground">
          Partido de {municipio.partido} &middot; {municipio.region}
        </p>
      </div>

      {/* Datos base */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Población</p>
          <p className="text-xl font-semibold">
            {formatNumber(municipio.poblacion)}
          </p>
          <p className="text-xs text-muted-foreground">Censo 2022</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Superficie</p>
          <p className="text-xl font-semibold">
            {formatNumber(municipio.superficieKm2)} km²
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Densidad</p>
          <p className="text-xl font-semibold">
            {municipio.densidad?.toFixed(1) ?? "—"} hab/km²
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Sitio oficial</p>
          {municipio.urlOficial ? (
            <a
              href={municipio.urlOficial}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline break-all"
            >
              {municipio.urlOficial.replace("https://", "")}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">No registrado</p>
          )}
        </div>
      </div>
    </>
  );
}
