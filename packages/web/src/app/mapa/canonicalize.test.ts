/**
 * Sprint 42A — Tests para canonicalizeMapaSearchParams.
 *
 * Cubre los casos del Sprint 40:
 *   - URL canónica → null (no redirect)
 *   - Default redundante → strip
 *   - Métrica inválida → strip
 *   - compare con valor no-"1" → strip
 *   - b sin compare → strip
 *   - Custom válida → null
 */
import { describe, it, expect } from "vitest";
import { canonicalizeMapaSearchParams } from "./canonicalize";

describe("canonicalizeMapaSearchParams", () => {
  it("URL pelada /mapa → null (canónica)", () => {
    expect(canonicalizeMapaSearchParams({})).toBeNull();
  });

  it("?a=scoreFiscal → null (canónica, métrica válida no-default)", () => {
    expect(canonicalizeMapaSearchParams({ a: "scoreFiscal" })).toBeNull();
  });

  it("?a=scoreTotal → '' (default redundante)", () => {
    expect(canonicalizeMapaSearchParams({ a: "scoreTotal" })).toBe("");
  });

  it("?a=invalidMetric → '' (allowlist)", () => {
    expect(canonicalizeMapaSearchParams({ a: "invalidMetric" })).toBe("");
  });

  it("?compare=true → '' (solo '1' cuenta)", () => {
    expect(canonicalizeMapaSearchParams({ compare: "true" })).toBe("");
  });

  it("?compare=1 → null (canónica)", () => {
    expect(canonicalizeMapaSearchParams({ compare: "1" })).toBeNull();
  });

  it("?compare=1&b=scoreFiscal → '?compare=1' (b default redundante)", () => {
    expect(
      canonicalizeMapaSearchParams({ compare: "1", b: "scoreFiscal" }),
    ).toBe("?compare=1");
  });

  it("?b=vialDensity → '' (b sin compare activo)", () => {
    expect(canonicalizeMapaSearchParams({ b: "vialDensity" })).toBe("");
  });

  it("?a=scoreFiscal&compare=1&b=vialDensity → null (custom canónica)", () => {
    expect(
      canonicalizeMapaSearchParams({
        a: "scoreFiscal",
        compare: "1",
        b: "vialDensity",
      }),
    ).toBeNull();
  });

  it("?a=scoreFiscal&compare=0 → '?a=scoreFiscal' (compare=0 no es 1)", () => {
    expect(
      canonicalizeMapaSearchParams({ a: "scoreFiscal", compare: "0" }),
    ).toBe("?a=scoreFiscal");
  });

  it("?a=scoreFiscal&b=vialDensity (sin compare) → '?a=scoreFiscal' (strip b)", () => {
    expect(
      canonicalizeMapaSearchParams({ a: "scoreFiscal", b: "vialDensity" }),
    ).toBe("?a=scoreFiscal");
  });
});
