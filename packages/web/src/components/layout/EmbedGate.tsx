"use client";

import { usePathname } from "next/navigation";

/**
 * Sprint 45C — Gate client-side para wrap-ear server components que
 * solo deben renderizarse fuera de `/embed/*`.
 *
 * Útil para Footer (server component) que no puede llamar `usePathname`.
 * El client wrapper decide null o passthrough del children renderizado en
 * server. Es el patrón canónico de Next.js para mixing.
 */
export function HideOnEmbed({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/embed")) return null;
  return <>{children}</>;
}
