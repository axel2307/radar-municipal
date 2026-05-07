/**
 * Sprint 18 — tests del orquestador de refresh Pilar 4.
 *
 * Cubrimos sólo la pieza pura `buildManifest`. La parte I/O (fetch
 * upstream, file writes) se ejerce en el script real cuando se corre
 * `pnpm refresh:pilar4` — esos no son tests de unit, son verificación
 * end-to-end manual.
 */

import { describe, it, expect } from "vitest";
import { buildManifest, type FuenteResult } from "../cli/refresh-pilar4";
import type { Contratacion } from "@radar-municipal/core";

const mkContratacion = (id: string, municipioId: string, anio = 2026): Contratacion => ({
  id,
  municipioId,
  anio,
  estado: "FINALIZADA",
  estadoRaw: "finalizado",
  objeto: "test",
  montoPresupuesto: 1000,
  fechaApertura: null,
  lugarApertura: null,
  proveedor: null,
  fuenteUrl: "http://x",
  fuenteTipo: "CKAN",
});

describe("buildManifest", () => {
  it("totaliza contrataciones y cuenta municipios distintos", () => {
    const fuentes: FuenteResult[] = [
      {
        label: "A",
        municipioId: "060001",
        datasetsParseados: 2,
        contrataciones: [
          mkContratacion("a1", "060001"),
          mkContratacion("a2", "060001"),
        ],
      },
      {
        label: "B",
        municipioId: "060002",
        datasetsParseados: 1,
        contrataciones: [mkContratacion("b1", "060002")],
      },
    ];
    const m = buildManifest(fuentes, "2026-04-28T12:00:00.000Z", 5);
    expect(m.refreshedAt).toBe("2026-04-28T12:00:00.000Z");
    expect(m.totalContrataciones).toBe(3);
    expect(m.municipiosConDatos).toBe(2);
    expect(m.aggregates).toBe(5);
  });

  it("ordena fuentes por municipioId asc (estable entre corridas)", () => {
    const fuentes: FuenteResult[] = [
      { label: "Z", municipioId: "060999", datasetsParseados: 1, contrataciones: [] },
      { label: "A", municipioId: "060001", datasetsParseados: 1, contrataciones: [] },
      { label: "M", municipioId: "060500", datasetsParseados: 1, contrataciones: [] },
    ];
    const m = buildManifest(fuentes, "x", 0);
    expect(m.fuentes.map((f) => f.municipioId)).toEqual(["060001", "060500", "060999"]);
  });

  it("emite shape mínimo cuando no hay fuentes (todas fallaron upstream)", () => {
    const m = buildManifest([], "x", 0);
    expect(m.totalContrataciones).toBe(0);
    expect(m.municipiosConDatos).toBe(0);
    expect(m.aggregates).toBe(0);
    expect(m.fuentes).toEqual([]);
  });

  it("la entry de fuente preserva los counts del run, no recalcula", () => {
    // Si la fuente reporta 5 datasets pero sólo 3 contrataciones (los
    // otros datasets vinieron vacíos), el manifest debe reflejar AMBOS
    // — es la pieza accionable para detectar regresiones por fuente.
    const fuentes: FuenteResult[] = [
      {
        label: "Quilmes (CKAN)",
        municipioId: "060638",
        datasetsParseados: 3,
        contrataciones: [
          mkContratacion("q1", "060638"),
          mkContratacion("q2", "060638"),
          mkContratacion("q3", "060638"),
        ],
      },
    ];
    const m = buildManifest(fuentes, "x", 1);
    expect(m.fuentes[0]).toEqual({
      label: "Quilmes (CKAN)",
      municipioId: "060638",
      datasetsParseados: 3,
      contrataciones: 3,
    });
  });

  it("idempotencia: la misma input genera el mismo manifest serializado", () => {
    const fuentes: FuenteResult[] = [
      {
        label: "A",
        municipioId: "060001",
        datasetsParseados: 1,
        contrataciones: [mkContratacion("a1", "060001")],
      },
    ];
    const m1 = JSON.stringify(buildManifest(fuentes, "fixed", 1));
    const m2 = JSON.stringify(buildManifest(fuentes, "fixed", 1));
    expect(m1).toBe(m2);
  });
});
