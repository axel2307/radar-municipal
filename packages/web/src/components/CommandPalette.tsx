"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  searchCommandIndex,
  type CommandItem,
  type CommandItemKind,
} from "@/lib/command-index";

/**
 * Sprint 45A — Global command palette.
 *
 * Keyboard:
 *   ⌘K / Ctrl+K → abrir
 *   ESC         → cerrar
 *   ↑ / ↓       → navegar
 *   Enter       → ir al item seleccionado
 *
 * Click fuera, click en backdrop, o seleccionar item también cierran.
 * Focus auto al input al abrir; focus return al elemento previo al cerrar.
 *
 * Accesible: role="dialog" aria-modal, listbox + options con aria-selected,
 * aria-live polite del contador de resultados.
 */

const KIND_LABEL: Record<CommandItemKind, string> = {
  municipio: "Municipio",
  dimension: "Dimensión",
  page: "Página",
  metric: "Métrica del mapa",
};

const KIND_BADGE_CLASS: Record<CommandItemKind, string> = {
  municipio: "bg-blue-100 text-blue-700",
  dimension: "bg-amber-100 text-amber-700",
  page: "bg-slate-100 text-slate-700",
  metric: "bg-violet-100 text-violet-700",
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const results = useMemo(() => searchCommandIndex(query, undefined, 50), [query]);

  // ⌘K / Ctrl+K global listener + custom event "open-command-palette" para
  // triggers programáticos (e.g. botón en navbar). Acoplamiento débil:
  // CommandPalette listens, cualquier UI dispatches.
  useEffect(() => {
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    function handleCustomOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("open-command-palette", handleCustomOpen);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, [open]);

  // Focus management
  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      // Delay para que la transición termine antes de focus
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    } else {
      prevFocusRef.current?.focus({ preventScroll: true });
      // Reset state al cerrar para próxima apertura limpia
      setQuery("");
      setSelectedIdx(0);
    }
  }, [open]);

  // Body scroll lock
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

  // Reset selectedIdx cuando cambian los results
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Auto-scroll del item seleccionado al viewport
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLLIElement>(
      `[data-idx="${selectedIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const navigateTo = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router],
  );

  const handleInputKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIdx]) {
        e.preventDefault();
        navigateTo(results[selectedIdx]);
      }
    },
    [results, selectedIdx, navigateTo],
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
        className="fixed left-1/2 top-[10vh] z-[70] w-[92vw] max-w-2xl -translate-x-1/2 rounded-xl border border-border bg-white shadow-2xl"
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <svg
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            ref={inputRef}
            type="search"
            aria-label="Buscar municipios, dimensiones, páginas o métricas"
            aria-autocomplete="list"
            aria-controls="command-palette-listbox"
            placeholder="Buscar municipio, dimensión, página, métrica..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKey}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          aria-live="polite"
          className="sr-only"
        >
          {results.length} resultado{results.length === 1 ? "" : "s"}
        </div>

        {results.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Sin resultados para &quot;{query}&quot;
          </div>
        ) : (
          <ul
            id="command-palette-listbox"
            ref={listRef}
            role="listbox"
            aria-label="Resultados"
            className="max-h-[60vh] overflow-y-auto py-2"
          >
            {results.map((item, idx) => (
              <li
                key={`${item.kind}-${item.href}`}
                data-idx={idx}
                role="option"
                aria-selected={idx === selectedIdx}
                onClick={() => navigateTo(item)}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  idx === selectedIdx && "bg-primary/10",
                )}
              >
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0",
                    KIND_BADGE_CLASS[item.kind],
                  )}
                >
                  {KIND_LABEL[item.kind]}
                </span>
                <span className="font-medium truncate">{item.label}</span>
                <span className="ml-auto text-xs text-muted-foreground truncate max-w-[40%]">
                  {item.subtitle}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Footer hints */}
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center rounded border border-border bg-muted/50 px-1 py-0.5 font-mono">
              ↑↓
            </kbd>{" "}
            navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center rounded border border-border bg-muted/50 px-1 py-0.5 font-mono">
              ⏎
            </kbd>{" "}
            ir
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <kbd className="inline-flex items-center rounded border border-border bg-muted/50 px-1 py-0.5 font-mono">
              ⌘K
            </kbd>{" "}
            abrir
          </span>
        </div>
      </div>
    </>
  );
}

/**
 * Trigger button para el navbar (desktop). Imita el estilo de search bar.
 * El listener global ya está enchufado en CommandPalette — esto solo
 * dispara un evento simulado para abrirlo. Simpler: usar un custom event.
 */
export function CommandPaletteTrigger() {
  const open = useCallback(() => {
    document.dispatchEvent(new Event("open-command-palette"));
  }, []);

  return (
    <button
      type="button"
      onClick={open}
      className="hidden md:inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      aria-label="Buscar (Ctrl+K)"
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      Buscar
      <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}
