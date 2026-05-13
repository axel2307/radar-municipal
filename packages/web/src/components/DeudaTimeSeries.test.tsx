/**
 * Sprint 45B — Tests del DeudaTimeSeries.
 *
 * Recharts requiere width/height para renderizar — en jsdom no hay layout
 * real, así que solo testeo:
 *   - El componente monta sin throw para series válidas
 *   - El helper formatArsCompact maneja órdenes de magnitud típicos
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { StockDeudaSnapshot } from "@radar-municipal/core";
import { DeudaTimeSeries, formatArsCompact } from "./DeudaTimeSeries";

const SAMPLE: StockDeudaSnapshot[] = [
  {
    municipioId: "060154",
    nombreFuente: "Carmen de Areco",
    fechaSnapshot: "2020-06-30",
    saldoTotal: 12_500_000,
    acreedoresConSaldo: 8,
    acreedores: [],
    fuenteUrl: "https://example.com/c.xlsx",
    parsedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    municipioId: "060154",
    nombreFuente: "Carmen de Areco",
    fechaSnapshot: "2024-12-31",
    saldoTotal: 280_000_000,
    acreedoresConSaldo: 12,
    acreedores: [],
    fuenteUrl: "https://example.com/c2.xlsx",
    parsedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("<DeudaTimeSeries>", () => {
  it("monta sin throw con 2 snapshots válidos", () => {
    expect(() => render(<DeudaTimeSeries series={SAMPLE} />)).not.toThrow();
  });

  it("monta sin throw con 1 solo snapshot (caso borde)", () => {
    expect(() =>
      render(<DeudaTimeSeries series={[SAMPLE[0]]} />),
    ).not.toThrow();
  });
});

describe("formatArsCompact", () => {
  it("formatea miles con sufijo k", () => {
    expect(formatArsCompact(12_500)).toBe("$13k");
  });

  it("formatea millones con sufijo M (1 decimal)", () => {
    expect(formatArsCompact(12_500_000)).toBe("$12.5M");
  });

  it("formatea miles de millones con B", () => {
    expect(formatArsCompact(2_300_000_000)).toBe("$2.3B");
  });

  it("formatea valores < 1000 sin sufijo", () => {
    expect(formatArsCompact(500)).toBe("$500");
  });
});
