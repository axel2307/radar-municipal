/**
 * Sprint 16 — Tests del parser gobabierto.ar (Carlos Casares).
 *
 * Cubre el schema multi-row (una fila por firma invitada) y los casos
 * críticos descubiertos durante el sprint:
 *  - Adjudicacion en fila secundaria, no primaria
 *  - DESIERTA literal en columna de Adjudicacion
 *  - Importe formateado como `$ 12.081.000`
 *  - Año derivado de expediente cuando fecha está vacía
 *  - HHI sobre proveedores adjudicados
 */

import { describe, it, expect } from "vitest";
import {
  splitCommaCsv,
  parseGobabiertoImporte,
  parseGobabiertoFecha,
  parseCarlosCasaresLicitaciones,
} from "../parsers/gobabierto-contrataciones";
import { aggregateContrataciones } from "../parsers/ckan-contrataciones";

// ─────────────────────────────────────────
// Fixtures inline (replican el shape real de Carlos Casares 2026)
// ─────────────────────────────────────────

const HEADER_BANNER = "CONCURSOS,,,,,,,,,";
const HEADER_REAL =
  "N° Concurso,Expediente,Fecha Apertura,Detalle,Firmas Invitadas,Adjudicacion,Orden Compra N°, Importe,,";

const CSV_HAPPY = [
  HEADER_BANNER,
  HEADER_REAL,
  // Concurso 1: 2 firmas invitadas, segunda gana con monto
  "1,140/2026,9/1/2026,Combustible Policia,Casares Combustibles S.R.L,,,,,",
  ",,,,Distribuidora Belmar Casares S.A,Distribuidora Belmar Casares S.A,372,$ 12.081.000,,",
  // Concurso 2: 1 firma, gana directo
  '2,141/2026,15/1/2026,Materiales viales,Casares Combustibles S.R.L,Casares Combustibles S.R.L,373,$ 5.000.000,,',
  // Concurso 3: declarada DESIERTA
  "3,142/2026,20/1/2026,Insumos varios,Empresa X,,,,,",
  ",,,,Empresa Y,DESIERTA,DESIERTA,DESIERTA,,",
].join("\n");

// ─────────────────────────────────────────
// CSV reader
// ─────────────────────────────────────────

describe("splitCommaCsv", () => {
  it("separa filas y celdas comma-delimited", () => {
    expect(splitCommaCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("respeta quotes para celdas con comma embebido", () => {
    expect(splitCommaCsv('a,b\n"x,y",z')).toEqual([
      ["a", "b"],
      ["x,y", "z"],
    ]);
  });

  it("preserva celdas vacías (campo intermedio sin valor)", () => {
    expect(splitCommaCsv("a,b,c\n1,,3")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });
});

// ─────────────────────────────────────────
// Importe / fecha
// ─────────────────────────────────────────

describe("parseGobabiertoImporte", () => {
  it("formato $ 12.081.000 → 12081000", () => {
    expect(parseGobabiertoImporte("$ 12.081.000")).toBe(12081000);
  });

  it("sin signo: 5.000.000 → 5000000", () => {
    expect(parseGobabiertoImporte("5.000.000")).toBe(5000000);
  });

  it("DESIERTA → null (no es un monto, es estado)", () => {
    expect(parseGobabiertoImporte("DESIERTA")).toBeNull();
  });

  it("vacío / null → null", () => {
    expect(parseGobabiertoImporte("")).toBeNull();
    expect(parseGobabiertoImporte(null)).toBeNull();
    expect(parseGobabiertoImporte(undefined)).toBeNull();
  });

  it("texto no numérico → null", () => {
    expect(parseGobabiertoImporte("anulada")).toBeNull();
    expect(parseGobabiertoImporte("doce mil")).toBeNull();
  });
});

describe("parseGobabiertoFecha", () => {
  it("d/m/yyyy", () => {
    expect(parseGobabiertoFecha("9/1/2026")).toBe("2026-01-09");
  });

  it("dd/mm/yyyy", () => {
    expect(parseGobabiertoFecha("29/01/2025")).toBe("2025-01-29");
  });

  it("rechaza inválidos", () => {
    expect(parseGobabiertoFecha("32/13/2025")).toBeNull();
    expect(parseGobabiertoFecha("")).toBeNull();
  });
});

// ─────────────────────────────────────────
// Parser
// ─────────────────────────────────────────

describe("parseCarlosCasaresLicitaciones — happy path", () => {
  const r = parseCarlosCasaresLicitaciones(CSV_HAPPY, {
    municipioId: "060140",
    fuenteUrl: "https://gobabierto.ar/carloscasares/x.csv",
    anioFallback: 2026,
  });

  it("agrupa multi-row en 3 contrataciones (no 5 filas)", () => {
    expect(r.warnings).toEqual([]);
    expect(r.contrataciones).toHaveLength(3);
  });

  it("Concurso 1: adjudicación en fila secundaria, monto extraído correctamente", () => {
    const c1 = r.contrataciones[0];
    expect(c1.estado).toBe("ADJUDICADA");
    expect(c1.proveedor).toBe("Distribuidora Belmar Casares S.A");
    expect(c1.montoPresupuesto).toBe(12081000);
    expect(c1.fechaApertura).toBe("2026-01-09");
    expect(c1.objeto).toBe("Combustible Policia");
    expect(c1.id).toBe("060140-140/2026");
  });

  it("Concurso 2: adjudicación en fila primaria", () => {
    const c2 = r.contrataciones[1];
    expect(c2.estado).toBe("ADJUDICADA");
    expect(c2.proveedor).toBe("Casares Combustibles S.R.L");
    expect(c2.montoPresupuesto).toBe(5000000);
  });

  it("Concurso 3: DESIERTA → estado DESIERTA, proveedor/monto null", () => {
    const c3 = r.contrataciones[2];
    expect(c3.estado).toBe("DESIERTA");
    expect(c3.proveedor).toBeNull();
    expect(c3.montoPresupuesto).toBeNull();
    expect(c3.estadoRaw).toBe("DESIERTA");
  });

  it("año derivado del expediente (140/2026 → 2026)", () => {
    expect(r.contrataciones.every((c) => c.anio === 2026)).toBe(true);
  });

  it("fuenteTipo OTRO (gobabierto no es CKAN ni Junar)", () => {
    expect(r.contrataciones.every((c) => c.fuenteTipo === "OTRO")).toBe(true);
  });
});

describe("parseCarlosCasaresLicitaciones — robustez", () => {
  it("CSV demasiado corto → warning", () => {
    const r = parseCarlosCasaresLicitaciones("CONCURSOS\nN° Concurso,Expediente", {
      municipioId: "060140",
      fuenteUrl: "x",
      anioFallback: 2026,
    });
    expect(r.contrataciones).toEqual([]);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("header roto → warning específico", () => {
    const r = parseCarlosCasaresLicitaciones("BANNER\nfoo,bar\n1,2", {
      municipioId: "060140",
      fuenteUrl: "x",
      anioFallback: 2026,
    });
    expect(r.contrataciones).toEqual([]);
    expect(r.warnings.some((w) => /Header CSV no matchea/.test(w))).toBe(true);
  });

  it("filas continuación sin grupo previo se ignoran silenciosamente", () => {
    const csv = [
      HEADER_BANNER,
      HEADER_REAL,
      // Continuación huérfana (todos los campos primarios vacíos)
      ",,,,Empresa Z,Empresa Z,999,$ 100,,",
      // Después un grupo válido
      "5,200/2026,1/2/2026,Test,Empresa A,Empresa A,500,$ 1.000.000,,",
    ].join("\n");
    const r = parseCarlosCasaresLicitaciones(csv, {
      municipioId: "060140",
      fuenteUrl: "x",
      anioFallback: 2026,
    });
    expect(r.contrataciones).toHaveLength(1);
    expect(r.contrataciones[0].id).toBe("060140-200/2026");
  });

  it("sin Adjudicacion en ningún row → estado ABIERTA, proveedor/monto null", () => {
    const csv = [
      HEADER_BANNER,
      HEADER_REAL,
      "9,300/2026,1/3/2026,Sin adjudicar,Empresa Q,,,,,",
      ",,,,Empresa R,,,,,",
    ].join("\n");
    const r = parseCarlosCasaresLicitaciones(csv, {
      municipioId: "060140",
      fuenteUrl: "x",
      anioFallback: 2026,
    });
    expect(r.contrataciones).toHaveLength(1);
    expect(r.contrataciones[0].estado).toBe("ABIERTA");
    expect(r.contrataciones[0].proveedor).toBeNull();
    expect(r.contrataciones[0].montoPresupuesto).toBeNull();
  });
});

// ─────────────────────────────────────────
// HHI sobre proveedores
// ─────────────────────────────────────────

describe("aggregateContrataciones — HHI con proveedor (Sprint 16)", () => {
  it("HHI = 5000 cuando 2 proveedores tienen 50/50 share", () => {
    const r = parseCarlosCasaresLicitaciones(
      [
        HEADER_BANNER,
        HEADER_REAL,
        "1,1/2026,1/1/2026,A,Empresa A,Empresa A,1,$ 1.000.000,,",
        "2,2/2026,1/1/2026,B,Empresa B,Empresa B,2,$ 1.000.000,,",
      ].join("\n"),
      { municipioId: "060140", fuenteUrl: "x", anioFallback: 2026 },
    );
    const agg = aggregateContrataciones(r.contrataciones, "x");
    expect(agg).not.toBeNull();
    expect(agg!.hhiProveedores).toBe(5000); // 50² + 50² = 5000
    expect(agg!.proveedoresUnicos).toBe(2);
  });

  it("HHI = 10000 cuando un proveedor concentra 100%", () => {
    const r = parseCarlosCasaresLicitaciones(
      [
        HEADER_BANNER,
        HEADER_REAL,
        "1,1/2026,1/1/2026,A,X,X,1,$ 1.000.000,,",
        "2,2/2026,1/1/2026,B,X,X,2,$ 2.000.000,,",
      ].join("\n"),
      { municipioId: "060140", fuenteUrl: "x", anioFallback: 2026 },
    );
    const agg = aggregateContrataciones(r.contrataciones, "x");
    expect(agg!.hhiProveedores).toBe(10000);
    expect(agg!.proveedoresUnicos).toBe(1);
  });

  it("HHI null cuando ninguna contratación tiene proveedor (caso Quilmes)", () => {
    // Si proveedor es null en TODAS, HHI no es calculable.
    const sinProv = [
      {
        id: "x-1",
        municipioId: "060140",
        anio: 2026,
        estado: "FINALIZADA" as const,
        estadoRaw: "finalizado",
        objeto: "x",
        montoPresupuesto: 1000,
        fechaApertura: null,
        lugarApertura: null,
        proveedor: null,
        fuenteUrl: "x",
        fuenteTipo: "CKAN" as const,
      },
    ];
    const agg = aggregateContrataciones(sinProv, "x");
    expect(agg!.hhiProveedores).toBeNull();
    expect(agg!.proveedoresUnicos).toBeNull();
  });

  it("HHI null cuando solo hay 1 contratación con proveedor (n=1 no informa)", () => {
    const r = parseCarlosCasaresLicitaciones(
      [
        HEADER_BANNER,
        HEADER_REAL,
        "1,1/2026,1/1/2026,A,X,X,1,$ 1.000.000,,",
      ].join("\n"),
      { municipioId: "060140", fuenteUrl: "x", anioFallback: 2026 },
    );
    const agg = aggregateContrataciones(r.contrataciones, "x");
    expect(agg!.hhiProveedores).toBeNull();
    expect(agg!.proveedoresUnicos).toBeNull();
  });

  it("DESIERTA no contribuye al HHI (proveedor null)", () => {
    const r = parseCarlosCasaresLicitaciones(
      [
        HEADER_BANNER,
        HEADER_REAL,
        "1,1/2026,1/1/2026,A,X,X,1,$ 1.000.000,,",
        "2,2/2026,1/1/2026,B,Y,DESIERTA,DESIERTA,DESIERTA,,",
        "3,3/2026,1/1/2026,C,Z,Z,3,$ 1.000.000,,",
      ].join("\n"),
      { municipioId: "060140", fuenteUrl: "x", anioFallback: 2026 },
    );
    const agg = aggregateContrataciones(r.contrataciones, "x");
    // HHI sólo sobre las 2 adjudicadas (X, Z) con shares 50/50.
    expect(agg!.proveedoresUnicos).toBe(2);
    expect(agg!.hhiProveedores).toBe(5000);
    // Pero el total de contrataciones sigue siendo 3 (incluye DESIERTA).
    expect(agg!.totalContrataciones).toBe(3);
    expect(agg!.porEstado.DESIERTA).toBe(1);
  });
});
