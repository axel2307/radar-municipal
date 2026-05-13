import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Sprint 41E — Breadcrumbs visuales.
 *
 * Item con `href` = link clickeable. Sin `href` = current page (último item),
 * se renderiza con `aria-current="page"` y sin link.
 *
 * Diseño consistente con el patrón inline previo de `/dimensiones/[slug]` y
 * `/dimensiones/red-vial`: separator "/", muted-foreground para anteriores,
 * foreground bold para current.
 *
 * No emite JSON-LD — eso queda en el `<JsonLd>` component aparte donde se
 * necesite (e.g. ficha de municipio ya lo tiene). Mantener visual y SEO
 * desacoplados evita acoplar el componente al hostname del sitio.
 */
export interface BreadcrumbItem {
  /** Texto visible. */
  label: string;
  /** Si está presente, se renderiza como Link. Si no, es la página actual. */
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("text-sm text-muted-foreground", className)}
    >
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-primary transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(isLast && "text-foreground font-medium")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && <span className="text-muted-foreground/50">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
