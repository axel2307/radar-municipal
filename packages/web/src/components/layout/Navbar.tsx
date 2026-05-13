"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";
import { CommandPaletteTrigger } from "@/components/CommandPalette";

/**
 * Sprint 41B — nav cleanup.
 *
 * Desktop top nav: solo 5 items principales (Ranking · Mapa · Comparador ·
 * Datos · Metodología). Los 7 restantes (análisis profundo + acerca de) van
 * al footer y al mobile drawer.
 *
 * Decisión clave: NO redirigir `/compras`, `/presion-impositiva`,
 * `/calidad-datos` a `/dimensiones/<slug>` porque cada una tiene contenido
 * único (panels custom, casos testigo, coverage expandible) que el slug page
 * NO replica.
 */
const PRIMARY_NAV_ITEMS = [
  { href: "/ranking", label: "Ranking" },
  { href: "/mapa", label: "Mapa" },
  { href: "/comparador", label: "Comparador" },
  { href: "/datos-abiertos", label: "Datos" },
  { href: "/metodologia", label: "Metodología" },
];

const SECONDARY_NAV_ITEMS = [
  { href: "/municipios", label: "Municipios" },
  { href: "/panorama", label: "Panorama" },
  { href: "/dimensiones", label: "Dimensiones" },
  { href: "/presion-impositiva", label: "Presión impositiva" },
  { href: "/compras", label: "Compras" },
  { href: "/calidad-datos", label: "Calidad de datos" },
  { href: "/acerca-de", label: "Acerca de" },
];

export function Navbar() {
  const pathname = usePathname();

  // Sprint 45C — En /embed/* el iframe quiere su altura entera para el
  // widget. Sin navbar, sin footer. RootLayout sigue montando este componente
  // pero retorna null cuando estamos en una ruta embed.
  if (pathname?.startsWith("/embed")) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white text-sm font-bold">
            RM
          </div>
          <span className="text-lg font-semibold text-primary hidden sm:inline">
            Radar Municipal
          </span>
        </Link>

        {/* Desktop nav — solo PRIMARY, hidden on mobile */}
        <ul className="hidden md:flex items-center gap-1">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname?.startsWith(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {/* Sprint 45A — Command palette trigger (desktop only, mobile usa hamburger) */}
          <CommandPaletteTrigger />
          {/* Mobile hamburger — recibe primary + secondary con separador */}
          <MobileNav
            primaryItems={PRIMARY_NAV_ITEMS}
            secondaryItems={SECONDARY_NAV_ITEMS}
          />
        </div>
      </nav>
    </header>
  );
}
