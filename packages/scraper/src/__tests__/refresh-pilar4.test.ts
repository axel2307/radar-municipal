/**
 * Sprint 18 — tests del orquestador de refresh Pilar 4.
 *
 * Cubrimos sólo la pieza pura `buildManifest`. La parte I/O (fetch
 * upstream, file writes) se ejerce en el script real cuando se corre
 * `pnpm refresh:pilar4` — esos no son tests de unit, son verificación
 * end-to-end manual.
 */

import { describe, it, expect } from "vitest";
import {
  buildManifest,
  refreshCkanLicitaciones,
  CKAN_SOURCES,
  type FuenteResult,
} from "../cli/refresh-pilar4";
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

// ─────────────────────────────────────────
// Sprint 53 — refreshCkanLicitaciones (parser genérico)
// ─────────────────────────────────────────

const QUILMES_HEADER =
  "id;ano;estado;objeto;presupuesto_cifra;presupuesto_cifra_texto;fecha_retiro;hora_retiro;fecha_recepcion;hora_recepcion;fecha_apertura;hora_apertura;lugar_apertura;lugarApertura;valor";

const QUILMES_CSV = [
  QUILMES_HEADER,
  '1200;2025;finalizado;servicio de sepelios;5705000;cinco;5/3/2025;10:00;9/3/2025;10:00;9/3/2025;10:00;salon;Alberdi 500;0',
  '2200;2025;finalizado;servicio de comida;14342520;catorce;26/2/2025;12:00;28/2/2025;12:00;28/2/2025;12:00;salon;Alberdi 500;0',
].join("\n");

const CKAN_PACKAGE_SEARCH_RESPONSE = JSON.stringify({
  success: true,
  result: {
    results: [
      {
        title: "Licitaciones públicas 2025",
        resources: [
          { format: "CSV", url: "http://datos.example.com/lic-2025.csv" },
          { format: "PDF", url: "http://datos.example.com/lic-2025.pdf" },
        ],
      },
    ],
  },
});

/**
 * Crea un `fetcher` mock que devuelve respuestas distintas según la URL.
 * Util para testear sin red.
 */
function makeMockFetcher(routes: Record<string, string>): (url: string) => Promise<string> {
  return async (url: string) => {
    if (url in routes) return routes[url];
    // Match por prefijo (ej. cualquier .../api/3/action/...).
    for (const k of Object.keys(routes)) {
      if (url.startsWith(k)) return routes[k];
    }
    throw new Error(`Mock fetcher: URL desconocida ${url}`);
  };
}

describe("refreshCkanLicitaciones", () => {
  it("parsea un CKAN search response + un CSV Quilmes-style", async () => {
    const fetcher = makeMockFetcher({
      "http://datos.example.com/api/3/action/package_search": CKAN_PACKAGE_SEARCH_RESPONSE,
      "http://datos.example.com/lic-2025.csv": QUILMES_CSV,
    });
    const result = await refreshCkanLicitaciones(
      {
        label: "Example (CKAN)",
        municipioId: "060001",
        baseUrl: "http://datos.example.com",
      },
      fetcher,
    );
    expect(result.label).toBe("Example (CKAN)");
    expect(result.municipioId).toBe("060001");
    expect(result.datasetsParseados).toBe(1);
    expect(result.contrataciones.length).toBe(2);
    // Verifica que los IDs vinieron del CSV (parser prefixea
    // municipioId-anio-IDoriginal por unicidad cross-municipio).
    const rawIds = result.contrataciones.map((c) => c.id).sort();
    expect(rawIds).toEqual(["060001-2025-1200", "060001-2025-2200"]);
  });

  it("falla si CKAN reporta success:false", async () => {
    const fetcher = makeMockFetcher({
      "http://datos.example.com/api/3/action/package_search": JSON.stringify({
        success: false,
        error: { message: "boom" },
      }),
    });
    await expect(
      refreshCkanLicitaciones(
        { label: "X", municipioId: "060001", baseUrl: "http://datos.example.com" },
        fetcher,
      ),
    ).rejects.toThrow(/CKAN action failed/);
  });

  it("salta datasets sin recurso CSV sin tirar el run completo", async () => {
    const response = JSON.stringify({
      success: true,
      result: {
        results: [
          { title: "Sin CSV 2025", resources: [{ format: "PDF", url: "x.pdf" }] },
          {
            title: "Con CSV 2025",
            resources: [
              { format: "CSV", url: "http://datos.example.com/ok.csv" },
            ],
          },
        ],
      },
    });
    const fetcher = makeMockFetcher({
      "http://datos.example.com/api/3/action/package_search": response,
      "http://datos.example.com/ok.csv": QUILMES_CSV,
    });
    const result = await refreshCkanLicitaciones(
      { label: "X", municipioId: "060001", baseUrl: "http://datos.example.com" },
      fetcher,
    );
    expect(result.datasetsParseados).toBe(1);
    expect(result.contrataciones.length).toBe(2);
  });

  it("CSV upstream caído no rompe la fuente — sigue con los demás", async () => {
    const response = JSON.stringify({
      success: true,
      result: {
        results: [
          {
            title: "Caido 2025",
            resources: [
              { format: "CSV", url: "http://datos.example.com/down.csv" },
            ],
          },
          {
            title: "OK 2025",
            resources: [
              { format: "CSV", url: "http://datos.example.com/ok.csv" },
            ],
          },
        ],
      },
    });
    const fetcher = async (url: string): Promise<string> => {
      if (url.includes("package_search")) return response;
      if (url.endsWith("/down.csv")) throw new Error("HTTP 503");
      if (url.endsWith("/ok.csv")) return QUILMES_CSV;
      throw new Error("unexpected " + url);
    };
    const result = await refreshCkanLicitaciones(
      { label: "X", municipioId: "060001", baseUrl: "http://datos.example.com" },
      fetcher,
    );
    expect(result.datasetsParseados).toBe(1);
    expect(result.contrataciones.length).toBe(2);
  });
});

describe("CKAN_SOURCES catálogo", () => {
  it("incluye Quilmes (Sprint 17) y Tandil (Sprint 53)", () => {
    const ids = CKAN_SOURCES.map((s) => s.municipioId);
    expect(ids).toContain("060638"); // Quilmes
    expect(ids).toContain("060791"); // Tandil
  });

  it("todas las entries declaran label + municipioId + baseUrl", () => {
    for (const src of CKAN_SOURCES) {
      expect(src.label).toBeTruthy();
      expect(src.municipioId).toMatch(/^06\d{4}$/); // INDEC PBA 6 digitos
      expect(src.baseUrl).toMatch(/^https?:\/\//);
    }
  });
});
