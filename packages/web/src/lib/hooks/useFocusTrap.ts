"use client";

import { useEffect, type RefObject } from "react";

/**
 * Sprint 47A — Focus trap reusable para modales.
 *
 * Cuando `enabled` es true, Tab y Shift+Tab quedan atrapados dentro del
 * container ref. Si el foco está en el último focusable y el usuario
 * presiona Tab, vuelve al primero (y viceversa con Shift+Tab desde el
 * primero).
 *
 * WCAG 2.1.2 "No keyboard trap" + WAI-ARIA modal dialog pattern. El user
 * sale del modal con ESC (responsabilidad del consumer del hook).
 *
 * Sprint 43B agregó focus management básico (auto-focus al abrir, return
 * focus al cerrar) pero el Tab podía escapar al contenido detrás. Este
 * hook lo cierra.
 *
 * Implementación:
 *   - Listener global (document.keydown) en lugar de container.keydown
 *     porque cuando el foco escapa, los eventos no burbujean desde elementos
 *     fuera del container.
 *   - Sin caché del focusables: NodeList se reevalúa en cada Tab. Para
 *     modales con <10 focusables el costo es negligible.
 */
const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useFocusTrap(
  enabled: boolean,
  containerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      // Re-leer container.current cada vez por si cambió ref
      const node = containerRef.current;
      if (!node) return;

      // El hook solo se activa cuando el modal está abierto/visible
      // (enabled=true), así que confiamos en que todos los focusables del
      // container son alcanzables. No filtramos por offsetParent porque
      // (a) jsdom no lo calcula y rompería tests; (b) si el consumer
      // tiene elementos hidden adentro del modal abierto, es bug suyo.
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const insideContainer = active != null && node.contains(active);

      if (e.shiftKey) {
        // Shift+Tab desde el primero (o foco fuera del container) → último
        if (active === first || !insideContainer) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab desde el último (o foco fuera del container) → primero
        if (active === last || !insideContainer) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [enabled, containerRef]);
}

/**
 * Selector exportado para tests + casos de uso especiales (e.g. encontrar
 * el primer focusable manualmente para auto-focus al abrir).
 */
export { FOCUSABLE_SELECTORS };
