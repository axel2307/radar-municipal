/**
 * Sprint 15 — Tests del parser de contrataciones CKAN (schema Quilmes).
 *
 * Cubrimos:
 *  - splitSemicolonCsv: BOM, line endings, quotes
 *  - parseQuilmesMonto: enteros, miles AR (puntos), decimal AR (coma), inválidos
 *  - parseQuilmesFecha: d/m/yyyy, dd/mm/yyyy, edge cases
 *  - normalizeEstado: mapeo de variantes a enum cerrado
 *  - parseQuilmesContratacionesCsv: happy path + header roto + filas vacías
 *  - aggregateContrataciones: stats sobre fixture
 */

import { describe, it, expect } from "vitest";
import {
  splitSemicolonCsv,
  parseQuilmesMonto,
  parseQuilmesFecha,
  normalizeEstado,
  parseQuilmesContratacionesCsv,
  aggregateContrataciones,
} from "../parsers/ckan-contrataciones";

// ─────────────────────────────────────────
// Fixtures inline (concisas, no necesitamos archivos)
// ─────────────────────────────────────────

const QUILMES_HEADER =
  "id;ano;estado;objeto;presupuesto_cifra;presupuesto_cifra_texto;fecha_retiro;hora_retiro;fecha_recepcion;hora_recepcion;fecha_apertura;hora_apertura;lugar_apertura;lugarApertura;valor";

const QUILMES_CSV_HAPPY = [
  QUILMES_HEADER,
  '1200;2020;finalizado;servicio de sepelios;5705000;cinco millones;5/3/2020;10:00;9/3/2020;10:00;9/3/2020;10:00;salon peron;Alberdi 500;0',
  '2200;2020;finalizado;servicio de comida;14342520;catorce mill;26/2/2020;12:00;28/2/2020;12:00;28/2/2020;12:00;salon peron;Alberdi 500;0',
  '7200;2020;abierta;adquisicion descartables;15708032,1;;12/5/2020;14:00;14/5/2020;10:00;14/5/2020;10:00;salon peron;Alberdi 500;',
].join("\n");

describe("splitSemicolonCsv", () => {
  it("separa filas y celdas en CSV semicolon-delimited", () => {
    const out = splitSemicolonCsv("a;b;c\n1;2;3\n");
    expect(out).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("strip BOM al inicio", () => {
    const out = splitSemicolonCsv("\uFEFFa;b\n1;2");
    expect(out[0]).toEqual(["a", "b"]);
  });

  it("normaliza CRLF y CR", () => {
    expect(splitSemicolonCsv("a;b\r\n1;2\r\n3;4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(splitSemicolonCsv("a;b\r1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("respeta quotes para celdas con punto y coma embebido", () => {
    const out = splitSemicolonCsv('a;b\n"x;y";z');
    expect(out[1]).toEqual(["x;y", "z"]);
  });

  it("ignora líneas completamente vacías", () => {
    const out = splitSemicolonCsv("a;b\n\n1;2");
    expect(out).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseQuilmesMonto", () => {
  it("entero simple", () => {
    expect(parseQuilmesMonto("5705000")).toBe(5705000);
  });

  it("decimal con coma (AR)", () => {
    expect(parseQuilmesMonto("15708032,1")).toBeCloseTo(15708032.1, 2);
  });

  it("miles con puntos (AR) seguido de decimal con coma", () => {
    expect(parseQuilmesMonto("1.234.567,89")).toBeCloseTo(1234567.89, 2);
  });

  it("solo miles con puntos (último grupo de 3 dígitos → miles)", () => {
    expect(parseQuilmesMonto("1.234.567")).toBe(1234567);
  });

  it("punto con menos de 3 dígitos finales → decimal anglo (raro pero lo aceptamos como número)", () => {
    expect(parseQuilmesMonto("123.45")).toBeCloseTo(123.45, 2);
  });

  it("texto no numérico → null", () => {
    expect(parseQuilmesMonto("cinco millones")).toBeNull();
    expect(parseQuilmesMonto("")).toBeNull();
    expect(parseQuilmesMonto(null)).toBeNull();
    expect(parseQuilmesMonto(undefined)).toBeNull();
  });
});

describe("parseQuilmesFecha", () => {
  it("d/m/yyyy con un dígito", () => {
    expect(parseQuilmesFecha("5/3/2020")).toBe("2020-03-05");
  });

  it("dd/mm/yyyy con dos dígitos", () => {
    expect(parseQuilmesFecha("28/12/2020")).toBe("2020-12-28");
  });

  it("rechaza formatos inválidos", () => {
    expect(parseQuilmesFecha("2020-03-05")).toBeNull(); // ISO no es lo que viene de Quilmes
    expect(parseQuilmesFecha("32/13/2020")).toBeNull();
    expect(parseQuilmesFecha("")).toBeNull();
    expect(parseQuilmesFecha(null)).toBeNull();
  });
});

describe("normalizeEstado", () => {
  it("mapea variantes comunes de Quilmes", () => {
    expect(normalizeEstado("finalizado")).toBe("FINALIZADA");
    expect(normalizeEstado("FINALIZADO")).toBe("FINALIZADA");
    expect(normalizeEstado("adjudicada")).toBe("ADJUDICADA");
    expect(normalizeEstado("abierta")).toBe("ABIERTA");
    expect(normalizeEstado("en proceso")).toBe("ABIERTA"); // Quilmes 2019/2020 variant
    expect(normalizeEstado("en evaluación")).toBe("EN_EVALUACION");
    expect(normalizeEstado("desierta")).toBe("DESIERTA");
    expect(normalizeEstado("anulada")).toBe("ANULADA");
  });

  it("estados sin patrón conocido → DESCONOCIDO (preserva info en estadoRaw del caller)", () => {
    expect(normalizeEstado("xyz")).toBe("DESCONOCIDO");
    expect(normalizeEstado("")).toBe("DESCONOCIDO");
    expect(normalizeEstado(null)).toBe("DESCONOCIDO");
  });
});

describe("parseQuilmesContratacionesCsv — happy path", () => {
  const result = parseQuilmesContratacionesCsv(QUILMES_CSV_HAPPY, {
    municipioId: "060658",
    fuenteUrl: "http://datos.quilmes.gov.ar/dataset/x",
    anioFallback: 2020,
  });

  it("parsea 3 contrataciones del fixture", () => {
    expect(result.warnings).toEqual([]);
    expect(result.contrataciones).toHaveLength(3);
  });

  it("ID compuesto municipio-anio-idLocal", () => {
    expect(result.contrataciones[0].id).toBe("060658-2020-1200");
    expect(result.contrataciones[2].id).toBe("060658-2020-7200");
  });

  it("monto numérico extraído correctamente", () => {
    expect(result.contrataciones[0].montoPresupuesto).toBe(5705000);
    expect(result.contrataciones[1].montoPresupuesto).toBe(14342520);
    expect(result.contrataciones[2].montoPresupuesto).toBeCloseTo(15708032.1, 2);
  });

  it("fecha apertura normalizada a ISO", () => {
    expect(result.contrataciones[0].fechaApertura).toBe("2020-03-09");
    expect(result.contrataciones[2].fechaApertura).toBe("2020-05-14");
  });

  it("estado normalizado", () => {
    expect(result.contrataciones[0].estado).toBe("FINALIZADA");
    expect(result.contrataciones[2].estado).toBe("ABIERTA");
  });

  it("estadoRaw preserva el texto fuente", () => {
    expect(result.contrataciones[0].estadoRaw).toBe("finalizado");
  });

  it("proveedor null (Quilmes no expone)", () => {
    expect(result.contrataciones.every((c) => c.proveedor === null)).toBe(true);
  });

  it("fuenteTipo CKAN", () => {
    expect(result.contrataciones.every((c) => c.fuenteTipo === "CKAN")).toBe(true);
  });
});

describe("parseQuilmesContratacionesCsv — schema drift entre años", () => {
  // Quilmes mismo cambia el nombre de la columna de monto entre años:
  // 2018=presupuesto_pesos, 2019=presupuesto_monto, 2020=presupuesto_cifra.
  // El alias map en el parser debe resolver los 3.

  it("acepta el schema 2018 (presupuesto_pesos)", () => {
    const header2018 =
      "id;ano;estado;objeto;presupuesto_pesos;fecha_Retiro;hora_retiro;fecha_recepcion;hora_recepcion;fecha_apertura;horario_apertura;lugar_apertura;direccion_apertura;valor";
    const csv = [
      header2018,
      "1180;2018;Finalizado;Compra de asfalto;3960000,00;8/2/2018;14:00;15/2/2018;10:00;15/2/2018;10:00;Salon Peron;Alberdi;Gratuito",
    ].join("\n");
    const r = parseQuilmesContratacionesCsv(csv, {
      municipioId: "060658",
      fuenteUrl: "http://x",
      anioFallback: 2018,
    });
    expect(r.warnings).toEqual([]);
    expect(r.contrataciones).toHaveLength(1);
    expect(r.contrataciones[0].montoPresupuesto).toBe(3960000);
    expect(r.contrataciones[0].fechaApertura).toBe("2018-02-15");
    expect(r.contrataciones[0].estado).toBe("FINALIZADA");
  });

  it("acepta el schema 2019 (presupuesto_monto)", () => {
    const header2019 =
      "id;ano;estado;objeto;;presupuesto_monto;presupuesto_monto_texto;fecha_retiro;hora_retiro;fecha_apertura;hora_apertura;lugar_apertura;direccion_apertura;valor";
    const csv = [
      header2019,
      "1190;2019;finalizado;adquisicion de hormigon;;6000000;seis millones;6/2/2019;14:00;11/2/2019;10:00;Salon Peron;Alberdi;Gratuito",
    ].join("\n");
    const r = parseQuilmesContratacionesCsv(csv, {
      municipioId: "060658",
      fuenteUrl: "http://x",
      anioFallback: 2019,
    });
    expect(r.warnings).toEqual([]);
    expect(r.contrataciones).toHaveLength(1);
    expect(r.contrataciones[0].montoPresupuesto).toBe(6000000);
    expect(r.contrataciones[0].fechaApertura).toBe("2019-02-11");
  });
});

describe("parseQuilmesContratacionesCsv — robustez", () => {
  it("CSV vacío → 0 contrataciones + warning", () => {
    const r = parseQuilmesContratacionesCsv("", {
      municipioId: "060658",
      fuenteUrl: "http://x",
      anioFallback: 2020,
    });
    expect(r.contrataciones).toEqual([]);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("header roto (faltan columnas requeridas) → 0 contrataciones + warning específico", () => {
    const r = parseQuilmesContratacionesCsv("foo;bar\n1;2", {
      municipioId: "060658",
      fuenteUrl: "http://x",
      anioFallback: 2020,
    });
    expect(r.contrataciones).toEqual([]);
    expect(r.warnings.some((w) => /Header CSV no matchea schema/.test(w))).toBe(true);
  });

  it("usa anioFallback si la columna 'ano' está vacía o malformada", () => {
    const csv = [
      QUILMES_HEADER,
      ";;finalizado;test;1000;;;;;;;;;;",
      "999;XXXX;finalizado;test;2000;;;;;;;;;;",
    ].join("\n");
    const r = parseQuilmesContratacionesCsv(csv, {
      municipioId: "060658",
      fuenteUrl: "http://x",
      anioFallback: 2020,
    });
    // La primera fila no tiene id → se salta. La segunda tiene id pero ano malformado → fallback.
    expect(r.contrataciones).toHaveLength(1);
    expect(r.contrataciones[0].anio).toBe(2020);
    expect(r.contrataciones[0].id).toBe("060658-2020-999");
  });

  it("filas sin id se saltan silenciosamente", () => {
    const csv = [
      QUILMES_HEADER,
      ";2020;finalizado;sin id;1000;;;;;;;;;;",
      "777;2020;finalizado;con id;2000;;;;;;;;;;",
    ].join("\n");
    const r = parseQuilmesContratacionesCsv(csv, {
      municipioId: "060658",
      fuenteUrl: "http://x",
      anioFallback: 2020,
    });
    expect(r.contrataciones).toHaveLength(1);
    expect(r.contrataciones[0].id).toBe("060658-2020-777");
  });
});

describe("aggregateContrataciones", () => {
  const { contrataciones } = parseQuilmesContratacionesCsv(QUILMES_CSV_HAPPY, {
    municipioId: "060658",
    fuenteUrl: "http://x",
    anioFallback: 2020,
  });

  it("totaliza monto y cuenta", () => {
    const agg = aggregateContrataciones(contrataciones, "http://x");
    expect(agg).not.toBeNull();
    expect(agg!.municipioId).toBe("060658");
    expect(agg!.anio).toBe(2020);
    expect(agg!.totalContrataciones).toBe(3);
    expect(agg!.conMontoValido).toBe(3);
    // 5705000 + 14342520 + 15708032.1 = 35755552.1
    expect(agg!.montoTotalPresupuesto).toBeCloseTo(35755552.1, 1);
  });

  it("mediana sobre los 3 montos", () => {
    const agg = aggregateContrataciones(contrataciones, "http://x");
    // Mediana de {5705000, 14342520, 15708032} → 14342520
    expect(agg!.medianaMonto).toBe(14342520);
  });

  it("distribución por estado", () => {
    const agg = aggregateContrataciones(contrataciones, "http://x");
    expect(agg!.porEstado).toEqual({ FINALIZADA: 2, ABIERTA: 1 });
  });

  it("input vacío → null", () => {
    expect(aggregateContrataciones([], "http://x")).toBeNull();
  });
});
