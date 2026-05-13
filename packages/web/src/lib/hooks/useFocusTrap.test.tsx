/**
 * Sprint 47A — Tests del useFocusTrap hook.
 *
 * Valida el comportamiento básico:
 *   - Tab desde el último focusable → foco va al primero
 *   - Shift+Tab desde el primero → foco va al último
 *   - Tab cuando el foco está fuera del container → trae al primero
 *   - Hook desactivado (enabled=false) → Tab funciona normal
 *
 * No testea offsetParent visibility filter (jsdom no calcula layout).
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";
import { useFocusTrap } from "./useFocusTrap";

function TrapModal({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(enabled, ref);
  return (
    <>
      <button data-testid="outside-before">Outside before</button>
      <div ref={ref} data-testid="trap-container">
        <button data-testid="first">First</button>
        <button data-testid="middle">Middle</button>
        <button data-testid="last">Last</button>
      </div>
      <button data-testid="outside-after">Outside after</button>
    </>
  );
}

function pressKey(target: Element, key: string, shiftKey = false) {
  // jsdom: simular tab a nivel document (donde el hook escucha)
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }),
  );
  return target;
}

describe("useFocusTrap", () => {
  it("Tab desde el último focusable cicla al primero", () => {
    const { getByTestId } = render(<TrapModal enabled={true} />);
    const first = getByTestId("first") as HTMLButtonElement;
    const last = getByTestId("last") as HTMLButtonElement;

    last.focus();
    expect(document.activeElement).toBe(last);

    pressKey(last, "Tab");
    expect(document.activeElement).toBe(first);
  });

  it("Shift+Tab desde el primero cicla al último", () => {
    const { getByTestId } = render(<TrapModal enabled={true} />);
    const first = getByTestId("first") as HTMLButtonElement;
    const last = getByTestId("last") as HTMLButtonElement;

    first.focus();
    pressKey(first, "Tab", true);
    expect(document.activeElement).toBe(last);
  });

  it("Tab cuando foco está fuera del container trae al primero", () => {
    const { getByTestId } = render(<TrapModal enabled={true} />);
    const outside = getByTestId("outside-before") as HTMLButtonElement;
    const first = getByTestId("first") as HTMLButtonElement;

    outside.focus();
    expect(document.activeElement).toBe(outside);

    pressKey(outside, "Tab");
    expect(document.activeElement).toBe(first);
  });

  it("enabled=false NO atrapa el foco (deja a Tab nativo)", () => {
    const { getByTestId } = render(<TrapModal enabled={false} />);
    const last = getByTestId("last") as HTMLButtonElement;

    last.focus();
    pressKey(last, "Tab");
    // El hook está deshabilitado; el foco NO se mueve programáticamente
    // (jsdom no implementa Tab natural, así que active queda en last)
    expect(document.activeElement).toBe(last);
  });

  it("Tab desde el middle NO interfiere — foco avanza naturalmente", () => {
    const { getByTestId } = render(<TrapModal enabled={true} />);
    const middle = getByTestId("middle") as HTMLButtonElement;

    middle.focus();
    pressKey(middle, "Tab");
    // En middle, el hook no llama preventDefault. jsdom no avanza Tab
    // automáticamente, pero verifica que el foco NO saltó al first
    // (sería el síntoma de un bug donde el hook cicla siempre).
    expect(document.activeElement).toBe(middle);
  });
});
