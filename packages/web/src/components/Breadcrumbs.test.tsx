/**
 * Sprint 42A — Tests de <Breadcrumbs>.
 *
 * Casos:
 *   - Items con href se renderizan como Link
 *   - Último item se renderiza sin link (current page) con aria-current
 *   - nav tiene aria-label="Breadcrumb"
 *   - Separator '/' aparece entre items pero NO después del último
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "./Breadcrumbs";

describe("<Breadcrumbs>", () => {
  it("renderiza nav con aria-label='Breadcrumb'", () => {
    render(
      <Breadcrumbs items={[{ href: "/", label: "Inicio" }, { label: "Hoy" }]} />,
    );
    expect(screen.getByLabelText("Breadcrumb")).toBeInTheDocument();
  });

  it("items intermedios con href son Link clickeable", () => {
    render(
      <Breadcrumbs
        items={[
          { href: "/", label: "Inicio" },
          { href: "/municipios", label: "Municipios" },
          { label: "Bahía Blanca" },
        ]}
      />,
    );
    const inicioLink = screen.getByRole("link", { name: "Inicio" });
    expect(inicioLink).toHaveAttribute("href", "/");
    const muniLink = screen.getByRole("link", { name: "Municipios" });
    expect(muniLink).toHaveAttribute("href", "/municipios");
  });

  it("último item NO es link y tiene aria-current='page'", () => {
    render(
      <Breadcrumbs
        items={[
          { href: "/", label: "Inicio" },
          { label: "Bahía Blanca" },
        ]}
      />,
    );
    // "Bahía Blanca" NO debe estar como link
    expect(
      screen.queryByRole("link", { name: "Bahía Blanca" }),
    ).not.toBeInTheDocument();
    // Sí debe estar como texto con aria-current
    const current = screen.getByText("Bahía Blanca");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renderiza separators '/' entre items pero no después del último", () => {
    render(
      <Breadcrumbs
        items={[
          { href: "/", label: "Inicio" },
          { href: "/municipios", label: "Municipios" },
          { label: "Bahía Blanca" },
        ]}
      />,
    );
    // 3 items → 2 separators
    const separators = screen.getAllByText("/");
    expect(separators).toHaveLength(2);
  });

  it("aplica className extra al nav", () => {
    const { container } = render(
      <Breadcrumbs
        items={[{ label: "Solo" }]}
        className="my-custom-class"
      />,
    );
    const nav = container.querySelector("nav");
    expect(nav).toHaveClass("my-custom-class");
  });

  it("último item sin href se renderiza igualmente como current", () => {
    // Edge case: si solo hay 1 item, también es 'current'.
    render(<Breadcrumbs items={[{ label: "Solo" }]} />);
    expect(screen.getByText("Solo")).toHaveAttribute("aria-current", "page");
  });
});
