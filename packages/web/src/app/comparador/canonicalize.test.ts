/**
 * Sprint 44A — Tests para canonicalizeComparadorSearchParams.
 *
 * IDs piloto válidos (13):
 *   060056 Bahía Blanca, 060357 General Pueyrredón, 060791 Tandil,
 *   060861 Vicente López, 060735 San Isidro, 060441 La Plata,
 *   060882 Zárate, 060490 Luján, 060042 Ayacucho, 060476 Lobería,
 *   060049 Azul, 060105 Bragado, 060567 Necochea
 */
import { describe, it, expect } from "vitest";
import { canonicalizeComparadorSearchParams } from "./canonicalize";

describe("canonicalizeComparadorSearchParams", () => {
  it("URL pelada /comparador → null (canónica)", () => {
    expect(canonicalizeComparadorSearchParams({})).toBeNull();
  });

  it("?a=060056&b=060791 → null (2 piloto válidos)", () => {
    expect(
      canonicalizeComparadorSearchParams({ a: "060056", b: "060791" }),
    ).toBeNull();
  });

  it("?a=060056&b=060791&c=060357 → null (3 piloto válidos)", () => {
    expect(
      canonicalizeComparadorSearchParams({
        a: "060056",
        b: "060791",
        c: "060357",
      }),
    ).toBeNull();
  });

  it("?a=999999 → '' (ID inválido, strip)", () => {
    expect(canonicalizeComparadorSearchParams({ a: "999999" })).toBe("");
  });

  it("?a=060056&b=060056 → '?a=060056' (duplicado strip)", () => {
    expect(
      canonicalizeComparadorSearchParams({ a: "060056", b: "060056" }),
    ).toBe("?a=060056");
  });

  it("?b=060056 (sin a) → '?a=060056' (consolidar slots)", () => {
    expect(canonicalizeComparadorSearchParams({ b: "060056" })).toBe(
      "?a=060056",
    );
  });

  it("?a=060056&c=060791 (sin b) → '?a=060056&b=060791' (consolidar)", () => {
    expect(
      canonicalizeComparadorSearchParams({ a: "060056", c: "060791" }),
    ).toBe("?a=060056&b=060791");
  });

  it("?a=999999&b=060056 → '?a=060056' (strip inválido + consolidar)", () => {
    expect(
      canonicalizeComparadorSearchParams({ a: "999999", b: "060056" }),
    ).toBe("?a=060056");
  });

  it("?a=060056&b=060791&c=060791 → '?a=060056&b=060791' (c duplica b)", () => {
    expect(
      canonicalizeComparadorSearchParams({
        a: "060056",
        b: "060791",
        c: "060791",
      }),
    ).toBe("?a=060056&b=060791");
  });
});
