"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";

const NAV_ITEMS = [
  { href: "/ranking", label: "Ranking" },
  { href: "/dimensiones", label: "Dimensiones" },
  { href: "/mapa", label: "Mapa" },
  { href: "/panorama", label: "Panorama" },
  { href: "/calidad-datos", label: "Calidad de datos" },
  { href: "/presion-impositiva", label: "Presión impositiva" },
  { href: "/compras", label: "Compras" },
  { href: "/municipios", label: "Municipios" },
  { href: "/comparador", label: "Comparador" },
  { href: "/metodologia", label: "Metodología" },
  { href: "/datos-abiertos", label: "Datos abiertos" },
  { href: "/acerca-de", label: "Acerca de" },
];

export function Navbar() {
  const pathname = usePathname();

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

        {/* Desktop nav — hidden on mobile */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
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

        {/* Mobile hamburger menu */}
        <MobileNav items={NAV_ITEMS} />
      </nav>
    </header>
  );
}
