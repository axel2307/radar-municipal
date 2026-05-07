"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error en Radar Municipal:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center">
      <p className="text-6xl font-bold text-score-low">Error</p>
      <h1 className="mt-4 text-2xl font-bold">Algo salió mal</h1>
      <p className="mt-4 text-muted-foreground max-w-md mx-auto">
        Ocurrió un error inesperado. Si el problema persiste, escribinos a
        contacto@radarmunicipal.ar.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <button
          onClick={reset}
          className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-light transition-colors"
        >
          Reintentar
        </button>
        <a
          href="/"
          className="rounded-md border border-border px-6 py-3 text-sm font-semibold hover:bg-muted transition-colors"
        >
          Ir al inicio
        </a>
      </div>
    </div>
  );
}
