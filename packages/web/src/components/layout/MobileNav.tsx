"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  items: { href: string; label: string }[];
}

export function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar al navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors md:hidden"
        aria-label="Abrir menú"
      >
        <svg className="h-6 w-6 text-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-xl transition-transform duration-300 ease-in-out md:hidden",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <span className="text-lg font-semibold text-primary">Menú</span>
          <button
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors"
            aria-label="Cerrar menú"
          >
            <svg className="h-6 w-6 text-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="px-2 py-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg px-4 py-3 text-base font-medium transition-colors",
                pathname?.startsWith(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
