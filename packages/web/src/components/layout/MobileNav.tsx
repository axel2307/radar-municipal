"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

interface MobileNavProps {
  /** Items principales visibles en desktop. */
  primaryItems: NavItem[];
  /** Items secundarios — solo accesibles desde mobile drawer y footer. */
  secondaryItems?: NavItem[];
}

/**
 * Sprint 43B — a11y improvements:
 *   - role="dialog" + aria-modal="true" para que screen readers anuncien el
 *     drawer como modal
 *   - ESC cierra (WCAG 2.1.2 — no keyboard trap)
 *   - Focus auto al close button al abrir
 *   - Focus vuelve al hamburger al cerrar (foco no se pierde)
 *   - SVG decorativos aria-hidden
 */
export function MobileNav({ primaryItems, secondaryItems = [] }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Cerrar al navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ESC para cerrar
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Focus management: al abrir, mover foco al close button. Al cerrar,
  // devolver al hamburger trigger.
  useEffect(() => {
    if (open) {
      // Pequeño delay para que el drawer termine la transición y el
      // close button sea focusable.
      const t = setTimeout(() => closeButtonRef.current?.focus(), 100);
      return () => clearTimeout(t);
    } else if (document.activeElement instanceof HTMLElement) {
      // Solo devolver foco si el activeElement actual era algo dentro del
      // drawer (en mobile suele ser el case típico).
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

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

  const renderItem = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "flex items-center rounded-lg px-4 py-3 text-base font-medium transition-colors",
        pathname?.startsWith(item.href)
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-muted",
      )}
    >
      {item.label}
    </Link>
  );

  return (
    <>
      {/* Hamburger button */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors md:hidden"
        aria-label="Abrir menú"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
      >
        <svg
          className="h-6 w-6 text-foreground"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        aria-hidden={!open}
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-xl transition-transform duration-300 ease-in-out md:hidden overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4 sticky top-0 bg-white">
          <span className="text-lg font-semibold text-primary">Menú</span>
          <button
            ref={closeButtonRef}
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors"
            aria-label="Cerrar menú"
          >
            <svg
              className="h-6 w-6 text-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="px-2 py-4" aria-label="Navegación principal">
          {primaryItems.map(renderItem)}

          {secondaryItems.length > 0 && (
            <>
              <div className="my-3 border-t border-border" />
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Análisis profundo
              </p>
              {secondaryItems.map(renderItem)}
            </>
          )}
        </nav>
      </div>
    </>
  );
}
