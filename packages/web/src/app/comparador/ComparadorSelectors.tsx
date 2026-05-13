"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MUNICIPIOS_PILOTO } from "@radar-municipal/core";
import { VALID_PILOTO_IDS } from "./constants";

/**
 * Sprint 44A — 3 dropdowns A/B/C con URL sync patrón Sprint 38.
 *
 * Lectura inicial: useSearchParams (lazy initializer).
 * Update: state local + useEffect que syncha → router.replace (no más
 * window.history.replaceState como hacía el código antiguo).
 *
 * Server page lee searchParams independientemente para renderizar las
 * tablas. State client y URL ambos referencian la misma fuente.
 */
export function ComparadorSelectors() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function readSlot(key: "a" | "b" | "c"): string {
    const v = searchParams.get(key);
    return v && VALID_PILOTO_IDS.has(v) ? v : "";
  }

  const [idA, setIdA] = useState<string>(() => readSlot("a"));
  const [idB, setIdB] = useState<string>(() => readSlot("b"));
  const [idC, setIdC] = useState<string>(() => readSlot("c"));

  // Sync state → URL via router.replace (no scroll jump, no history pollution).
  useEffect(() => {
    const params = new URLSearchParams();
    if (idA) params.set("a", idA);
    if (idB) params.set("b", idB);
    if (idC) params.set("c", idC);
    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [idA, idB, idC, pathname, router]);

  return (
    <div className="grid gap-4 sm:grid-cols-3 mb-8">
      <div>
        <label htmlFor="comparador-a" className="block text-sm font-medium mb-1">
          Municipio A
        </label>
        <select
          id="comparador-a"
          value={idA}
          onChange={(e) => setIdA(e.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">Seleccionar...</option>
          {MUNICIPIOS_PILOTO.map((m) => (
            <option
              key={m.id}
              value={m.id}
              disabled={m.id === idB || m.id === idC}
            >
              {m.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="comparador-b" className="block text-sm font-medium mb-1">
          Municipio B
        </label>
        <select
          id="comparador-b"
          value={idB}
          onChange={(e) => setIdB(e.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">Seleccionar...</option>
          {MUNICIPIOS_PILOTO.map((m) => (
            <option
              key={m.id}
              value={m.id}
              disabled={m.id === idA || m.id === idC}
            >
              {m.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="comparador-c" className="block text-sm font-medium mb-1">
          Municipio C{" "}
          <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <select
          id="comparador-c"
          value={idC}
          onChange={(e) => setIdC(e.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">Ninguno</option>
          {MUNICIPIOS_PILOTO.map((m) => (
            <option
              key={m.id}
              value={m.id}
              disabled={m.id === idA || m.id === idB}
            >
              {m.nombre}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
