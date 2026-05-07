import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">Página no encontrada</h1>
      <p className="mt-4 text-muted-foreground max-w-md mx-auto">
        La página que buscás no existe o fue movida. Podés volver al inicio o
        explorar el ranking de municipios.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/"
          className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-light transition-colors"
        >
          Ir al inicio
        </Link>
        <Link
          href="/ranking"
          className="rounded-md border border-border px-6 py-3 text-sm font-semibold hover:bg-muted transition-colors"
        >
          Ver ranking
        </Link>
      </div>
    </div>
  );
}
