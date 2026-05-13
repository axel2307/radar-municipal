import type { Metadata } from "next";
import Link from "next/link";
import { getAllMunicipiosForMap } from "@/lib/scoring-data";
import { EmbedMap } from "./EmbedMap";

export const metadata: Metadata = {
  title: "Mapa (embed)",
  robots: { index: false, follow: false },
};

/**
 * Sprint 45C — Embed del mapa interactivo.
 *
 * Reusa el `ProvinceMap` existente vía un client island idéntico al
 * HomeMapPreview pero SIN `compact` (queremos altura full 520px). El
 * mapa tiene zoom/pan/click → ficha (target="_top" implícito porque
 * Next router en iframe navega la propia ventana).
 *
 * Atribución la pone el embed layout.
 */
export default function EmbedMapaPage() {
  const entries = getAllMunicipiosForMap("scoreTotal");

  return (
    <div>
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h1 className="text-lg font-bold">
          Mapa · Radar Municipal
        </h1>
        <Link
          href="/mapa"
          target="_top"
          className="text-xs font-medium text-primary hover:underline"
        >
          Ver interactivo →
        </Link>
      </header>
      <EmbedMap entries={entries} />
    </div>
  );
}
