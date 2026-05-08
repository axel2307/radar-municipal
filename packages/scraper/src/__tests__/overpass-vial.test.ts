/**
 * Sprint 30 — Tests del cliente Overpass + summarizer.
 *
 * No hits live a Overpass: usamos un fixture inline pequeño (4 ways)
 * con coords reales de Berisso para verificar el cálculo de km.
 */

import { describe, it, expect } from "vitest";
import {
  haversineKm,
  wayLengthKm,
  summarizeOverpassResponse,
  buildOverpassQuery,
  bboxFromGeometry,
  HIGHWAY_TYPES,
  type OverpassResponse,
} from "../parsers/overpass-vial";

// ─────────────────────────────────────────
// haversineKm
// ─────────────────────────────────────────

describe("haversineKm", () => {
  it("dos puntos idénticos → 0", () => {
    expect(haversineKm(-37, -59, -37, -59)).toBe(0);
  });

  it("Buenos Aires (-34.6, -58.4) → Mar del Plata (-38.0, -57.5) ~ 400 km", () => {
    const km = haversineKm(-34.6, -58.4, -38.0, -57.5);
    // valor real ~395 km. Tolerancia 5%.
    expect(km).toBeGreaterThan(370);
    expect(km).toBeLessThan(420);
  });

  it("1° de latitud ≈ 111 km en cualquier longitud", () => {
    const km = haversineKm(-37, -59, -38, -59);
    expect(km).toBeCloseTo(111, 0);
  });
});

// ─────────────────────────────────────────
// wayLengthKm
// ─────────────────────────────────────────

describe("wayLengthKm", () => {
  it("way con 2 nodes a ~100m → ~0.1 km", () => {
    const way = {
      type: "way" as const,
      id: 1,
      tags: { highway: "track" },
      geometry: [
        { lat: -34.9, lon: -57.9 },
        { lat: -34.9009, lon: -57.9 }, // ~100m al sur
      ],
    };
    const km = wayLengthKm(way);
    expect(km).toBeGreaterThan(0.08);
    expect(km).toBeLessThan(0.12);
  });

  it("way sin geometry → 0", () => {
    expect(wayLengthKm({ type: "way", id: 2 })).toBe(0);
  });

  it("way con 1 solo node → 0 (no hay segments)", () => {
    expect(
      wayLengthKm({
        type: "way",
        id: 3,
        geometry: [{ lat: -34.9, lon: -57.9 }],
      }),
    ).toBe(0);
  });
});

// ─────────────────────────────────────────
// summarizeOverpassResponse — fixture
// ─────────────────────────────────────────

const FIXTURE: OverpassResponse = {
  version: 0.6,
  generator: "test",
  elements: [
    // ~1 km de track
    {
      type: "way",
      id: 100,
      tags: { highway: "track" },
      geometry: [
        { lat: -34.90, lon: -57.90 },
        { lat: -34.91, lon: -57.90 }, // ~1.11 km
      ],
    },
    // ~0.55 km de unclassified
    {
      type: "way",
      id: 101,
      tags: { highway: "unclassified" },
      geometry: [
        { lat: -34.92, lon: -57.90 },
        { lat: -34.925, lon: -57.90 }, // ~0.55 km
      ],
    },
    // ~0.55 km de tertiary
    {
      type: "way",
      id: 102,
      tags: { highway: "tertiary" },
      geometry: [
        { lat: -34.93, lon: -57.90 },
        { lat: -34.935, lon: -57.90 },
      ],
    },
    // way con tag NO en HIGHWAY_TYPES (footway) → ignorado
    {
      type: "way",
      id: 103,
      tags: { highway: "footway" },
      geometry: [
        { lat: -34.94, lon: -57.90 },
        { lat: -34.95, lon: -57.90 },
      ],
    },
  ],
};

describe("summarizeOverpassResponse", () => {
  const summary = summarizeOverpassResponse(FIXTURE, {
    municipioId: "060098",
    nombre: "Berisso",
    fuenteUrl: "https://overpass-api.de/test",
    extractedAt: "2026-05-07T00:00:00Z",
  });

  it("preserva metadata (id, nombre, fuente, fecha)", () => {
    expect(summary.municipioId).toBe("060098");
    expect(summary.nombre).toBe("Berisso");
    expect(summary.fuenteUrl).toBe("https://overpass-api.de/test");
    expect(summary.extractedAt).toBe("2026-05-07T00:00:00Z");
  });

  it("calcula km por tipo (rounded a 1 decimal)", () => {
    expect(summary.km.track).toBeCloseTo(1.1, 1);
    expect(summary.km.unclassified).toBeCloseTo(0.6, 1);
    expect(summary.km.tertiary).toBeCloseTo(0.6, 1);
    expect(summary.km.secondary).toBe(0);
    expect(summary.km.primary).toBe(0);
  });

  it("kmRuralEstimado = track + unclassified", () => {
    expect(summary.kmRuralEstimado).toBeCloseTo(
      summary.km.track + summary.km.unclassified,
      1,
    );
  });

  it("kmTotalEstimado = suma de los 5 tipos", () => {
    const sum =
      summary.km.track +
      summary.km.unclassified +
      summary.km.tertiary +
      summary.km.secondary +
      summary.km.primary;
    expect(summary.kmTotalEstimado).toBeCloseTo(sum, 1);
  });

  it("ignora ways con tags fuera de HIGHWAY_TYPES (footway no cuenta)", () => {
    // El fixture tiene 4 ways, 3 de tipos válidos + 1 footway.
    // El footway NO debe sumar a ningún km.
    const totalMeasurable =
      summary.km.track +
      summary.km.unclassified +
      summary.km.tertiary +
      summary.km.secondary +
      summary.km.primary;
    expect(totalMeasurable).toBeLessThan(2.5); // max 2.3 según fixture
  });

  it("waysProcesados refleja el .elements length crudo", () => {
    expect(summary.waysProcesados).toBe(4);
  });

  it("response vacío → todos los km 0", () => {
    const empty = summarizeOverpassResponse(
      { elements: [] },
      { municipioId: "x", nombre: "X", fuenteUrl: "x" },
    );
    expect(empty.kmRuralEstimado).toBe(0);
    expect(empty.kmTotalEstimado).toBe(0);
    expect(empty.waysProcesados).toBe(0);
  });
});

// ─────────────────────────────────────────
// buildOverpassQuery
// ─────────────────────────────────────────

describe("buildOverpassQuery", () => {
  it("incluye los 5 highway types como regex alternation", () => {
    const q = buildOverpassQuery("-37,-59,-36,-58");
    for (const t of HIGHWAY_TYPES) expect(q).toContain(t);
    expect(q).toContain("[out:json]");
    expect(q).toContain("-37,-59,-36,-58");
  });

  it("default timeout 60s", () => {
    expect(buildOverpassQuery("0,0,1,1")).toContain("timeout:60");
  });

  it("respeta timeout custom", () => {
    expect(buildOverpassQuery("0,0,1,1", 30)).toContain("timeout:30");
  });
});

// ─────────────────────────────────────────
// bboxFromGeometry
// ─────────────────────────────────────────

describe("bboxFromGeometry", () => {
  it("Polygon simple → south,west,north,east", () => {
    const geom: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [-58, -34],
          [-57, -34],
          [-57, -35],
          [-58, -35],
          [-58, -34],
        ],
      ],
    };
    expect(bboxFromGeometry(geom)).toBe("-35.0000,-58.0000,-34.0000,-57.0000");
  });

  it("MultiPolygon agrega bbox sobre todos los polygons", () => {
    const geom: GeoJSON.MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [-58, -34],
            [-57, -34],
            [-57, -35],
            [-58, -34],
          ],
        ],
        [
          [
            [-60, -36], // outlier que extiende el bbox
            [-59, -36],
            [-59, -37],
            [-60, -36],
          ],
        ],
      ],
    };
    expect(bboxFromGeometry(geom)).toBe("-37.0000,-60.0000,-34.0000,-57.0000");
  });
});
