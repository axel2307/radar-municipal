import Link from "next/link";
import type { getPresionImpositivaByMunicipio } from "@/lib/scoring-data";
import { formatArs } from "./economia-helpers";

type PresionData = NonNullable<ReturnType<typeof getPresionImpositivaByMunicipio>>;

/**
 * Sprint 47D — Sección "Tasas al contribuyente" de /economia.
 * 4 casos testigo (ABL/TSG, TISH, Vial Rural, Construcción) con monto
 * anual. Link al comparador completo.
 */
export function TasasSection({ presion }: { presion: PresionData }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Tasas al contribuyente</h2>
        <Link
          href="/presion-impositiva"
          className="text-xs text-primary hover:underline"
        >
          Ver comparador completo →
        </Link>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Monto anual estimado ({presion.anioFiscal}) que pagaría cada caso
        testigo en este municipio.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Vivienda (ABL/TSG)</p>
          <p className="text-xl font-semibold">
            {formatArs(presion.montoVivienda.valor)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Valuación fiscal $40M
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Comercio (TISH)</p>
          <p className="text-xl font-semibold">
            {formatArs(presion.montoComercio.valor)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">IIBB $50M/año</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Rural (Vial)</p>
          <p className="text-xl font-semibold">
            {formatArs(presion.montoRural.valor)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            100 ha zona media
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Construcción</p>
          <p className="text-xl font-semibold">
            {formatArs(presion.montoConstruccion.valor)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Obra nueva 100 m²
          </p>
        </div>
      </div>
      <div
        role="note"
        className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
      >
        <strong>Confianza baja:</strong>{" "}
        {presion.notaMetodologica ??
          "valores de referencia, pendiente auditoría de ordenanza."}{" "}
        Ord. fiscal vigente:{" "}
        {presion.publicaOrdenanzaFiscal ? "✓ publicada" : "no detectada"}.
      </div>
    </section>
  );
}
