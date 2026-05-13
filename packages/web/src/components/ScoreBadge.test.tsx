/**
 * Sprint 42A — Tests de <ScoreBadge>.
 *
 * Casos:
 *   - score null/undefined → "Sin datos"
 *   - score 0 → score-low
 *   - score 50 → score-mid
 *   - score 80 → score-high
 *   - Formato: 1 decimal
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBadge } from "./ScoreBadge";

describe("<ScoreBadge>", () => {
  it("score null renderiza 'Sin datos'", () => {
    render(<ScoreBadge score={null} />);
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
  });

  it("score undefined renderiza 'Sin datos'", () => {
    render(<ScoreBadge score={undefined} />);
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
  });

  it("score bajo (15) renderiza bg-score-low", () => {
    const { container } = render(<ScoreBadge score={15} />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("bg-score-low");
  });

  it("score medio (50) renderiza bg-score-mid", () => {
    const { container } = render(<ScoreBadge score={50} />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("bg-score-mid");
  });

  it("score alto (80) renderiza bg-score-high", () => {
    const { container } = render(<ScoreBadge score={80} />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("bg-score-high");
  });

  it("formatea con 1 decimal", () => {
    render(<ScoreBadge score={67.83} />);
    expect(screen.getByText("67.8")).toBeInTheDocument();
  });

  it("threshold 70 cae en high (boundary)", () => {
    const { container } = render(<ScoreBadge score={70} />);
    expect(container.querySelector("span")?.className).toContain(
      "bg-score-high",
    );
  });

  it("threshold 40 cae en mid (boundary)", () => {
    const { container } = render(<ScoreBadge score={40} />);
    expect(container.querySelector("span")?.className).toContain(
      "bg-score-mid",
    );
  });

  it("size='sm' aplica clase text-xs", () => {
    const { container } = render(<ScoreBadge score={50} size="sm" />);
    expect(container.querySelector("span")?.className).toContain("text-xs");
  });

  it("size='lg' aplica clase text-base", () => {
    const { container } = render(<ScoreBadge score={50} size="lg" />);
    expect(container.querySelector("span")?.className).toContain("text-base");
  });
});
