/**
 * Sprint 15 — Parser de contrataciones publicadas en portales CKAN.
 *
 * Diseñado contra el schema de Quilmes (`datos.quilmes.gov.ar`), que es la
 * única fuente CKAN reachable + parseable que el discovery probe encontró.
 * Schema CSV (semicolon-delimited):
 *
 *   id;ano;estado;objeto;presupuesto_cifra;presupuesto_cifra_texto;
 *   fecha_retiro;hora_retiro;fecha_recepcion;hora_recepcion;
 *   fecha_apertura;hora_apertura;lugar_apertura;lugarApertura;valor
 *
 * Fechas en formato d/m/yyyy. Montos como entero o `nnn,nn` (decimal con coma).
 *
 * El parser es sin estado y puro: recibe el body CSV + metadata mínima,
 * devuelve `Contratacion[]`. La I/O (fetch del dataset, lectura del index
 * CKAN) vive en el script de ingest.
 *
 * Otros municipios pueden tener schemas distintos. Si Sprint 16+ agrega
 * Avellaneda o Bahía Blanca, conviene factorizar este parser detrás de un
 * adapter por municipio. Por ahora, es Quilmes-only.
 */

import type {
  Contratacion,
  ContratacionEstado,
  ContratacionesAggregate,
} from "@radar-municipal/core";

// ─────────────────────────────────────────
// Schema interno
// ─────────────────────────────────────────

/**
 * Aliases por concepto. Sprint 15 descubrió que Quilmes mismo cambia el
 * nombre de columna entre años (2018=`presupuesto_pesos`, 2019=
 * `presupuesto_monto`, 2020=`presupuesto_cifra`). Buscamos la primera
 * coincidencia case-insensitive (post-trim). Si ninguno aparece, el
 * concepto queda nullable.
 */
const COLUMN_ALIASES = {
  id: ["id"],
  ano: ["ano", "año", "anio"],
  estado: ["estado"],
  objeto: ["objeto"],
  monto: ["presupuesto_cifra", "presupuesto_monto", "presupuesto_pesos"],
  fechaApertura: ["fecha_apertura", "fechaapertura"],
  lugarApertura: ["lugar_apertura", "lugarapertura"],
} as const;

type ConceptKey = keyof typeof COLUMN_ALIASES;

// ─────────────────────────────────────────
// CSV reader (minimal, semicolon-delimited)
// ─────────────────────────────────────────

/**
 * Parser CSV minimal: split por `;` después de detectar quotes. Útil para
 * un schema simple como Quilmes — no usa una lib pesada porque las celdas
 * no tienen comas embebidas relevantes y los quotes son ocasionales.
 *
 * Devuelve filas como `string[]`. La primera fila es el header.
 */
export function splitSemicolonCsv(csv: string): string[][] {
  const out: string[][] = [];
  // Normalize line endings; BOM strip.
  const norm = csv.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (const line of norm.split("\n")) {
    if (line.length === 0) continue;
    const cells: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        // Escaped quote: ""
        if (inQuote && line[i + 1] === '"') {
          current += '"';
          i++;
          continue;
        }
        inQuote = !inQuote;
        continue;
      }
      if (c === ";" && !inQuote) {
        cells.push(current);
        current = "";
        continue;
      }
      current += c;
    }
    cells.push(current);
    out.push(cells);
  }
  return out;
}

// ─────────────────────────────────────────
// Normalizadores
// ─────────────────────────────────────────

/** Normaliza monto: `12.345,67` o `12345,67` o `12345` → number. Devuelve null si no parsea. */
export function parseQuilmesMonto(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!s) return null;
  // Acepta dígitos, puntos (miles AR), coma (decimal AR).
  if (!/^[\d.,]+$/.test(s)) return null;
  // Si tiene punto Y coma, los puntos son miles y la coma es decimal.
  // Si sólo tiene coma, también es decimal.
  // Si sólo tiene puntos, es miles (AR).
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let cleaned: string;
  if (hasComma && hasDot) {
    cleaned = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    cleaned = s.replace(",", ".");
  } else if (hasDot) {
    // Heurística: si después del último punto hay 3 dígitos exactos, son miles.
    // De lo contrario, asumimos decimal (raro en AR pero posible).
    const parts = s.split(".");
    const last = parts[parts.length - 1];
    if (parts.length > 1 && last.length === 3) {
      cleaned = s.replace(/\./g, "");
    } else {
      cleaned = s;
    }
  } else {
    cleaned = s;
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Normaliza fecha `d/m/yyyy` o `dd/mm/yyyy` → `yyyy-mm-dd`. Null si ilegible. */
export function parseQuilmesFecha(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];
  // Validación liviana: mes 1-12, día 1-31.
  const dN = Number(dd);
  const mN = Number(mm);
  if (mN < 1 || mN > 12 || dN < 1 || dN > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** Normaliza estado. Mapea texto crudo a enum cerrado. */
export function normalizeEstado(raw: string | null | undefined): ContratacionEstado {
  if (raw == null) return "DESCONOCIDO";
  const s = raw.trim().toLowerCase();
  if (!s) return "DESCONOCIDO";
  if (/finaliz/.test(s)) return "FINALIZADA";
  if (/adjudic/.test(s)) return "ADJUDICADA";
  if (/abiert|en\s+curso|en\s+proceso|publicad/.test(s)) return "ABIERTA";
  if (/evaluac|estudio/.test(s)) return "EN_EVALUACION";
  if (/desiert/.test(s)) return "DESIERTA";
  if (/anul|cancel/.test(s)) return "ANULADA";
  return "DESCONOCIDO";
}

// ─────────────────────────────────────────
// Parser principal
// ─────────────────────────────────────────

export interface ParseQuilmesOptions {
  municipioId: string;
  fuenteUrl: string;
  /**
   * Año del dataset (de la metadata CKAN). Sirve como fallback cuando la
   * columna `ano` está vacía o como sanity check si difiere.
   */
  anioFallback: number;
}

export interface ParseQuilmesResult {
  contrataciones: Contratacion[];
  warnings: string[];
}

/**
 * Convierte un CSV de Quilmes en `Contratacion[]`.
 *
 * Robustez:
 *  - Si el header no matchea (la fuente cambió schema), warna y retorna [].
 *  - Filas con 0 celdas se saltan silenciosas (líneas vacías).
 *  - Filas con menos columnas que el header se intentan parsear (los
 *    campos faltantes quedan null).
 *  - `id` siempre tiene la forma `${municipioId}-${anio}-${idLocal}`.
 */
export function parseQuilmesContratacionesCsv(
  csv: string,
  opt: ParseQuilmesOptions,
): ParseQuilmesResult {
  const rows = splitSemicolonCsv(csv);
  const warnings: string[] = [];
  if (rows.length < 2) {
    warnings.push("CSV vacío o sin filas de datos");
    return { contrataciones: [], warnings };
  }

  const headerNormalized = rows[0].map((h) => h.trim().toLowerCase());
  /** Mapa concept → columna index (-1 si no aparece). */
  const conceptIdx: Record<ConceptKey, number> = {
    id: -1,
    ano: -1,
    estado: -1,
    objeto: -1,
    monto: -1,
    fechaApertura: -1,
    lugarApertura: -1,
  };
  for (const concept of Object.keys(COLUMN_ALIASES) as ConceptKey[]) {
    for (const alias of COLUMN_ALIASES[concept]) {
      const i = headerNormalized.indexOf(alias);
      if (i !== -1) {
        conceptIdx[concept] = i;
        break;
      }
    }
  }
  // Mínimo viable: id + estado + alguna columna de monto. Sin estos, el dataset
  // no aporta info útil. ano cae al fallback si falta. fechaApertura, objeto,
  // lugarApertura son opcionales — el parser las deja null si no aparecen.
  const REQUIRED: ConceptKey[] = ["id", "estado", "monto"];
  const missing = REQUIRED.filter((c) => conceptIdx[c] === -1);
  if (missing.length > 0) {
    warnings.push(`Header CSV no matchea schema Quilmes: faltan ${missing.join(", ")}`);
    return { contrataciones: [], warnings };
  }

  const out: Contratacion[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (concept: ConceptKey): string | null => {
      const i = conceptIdx[concept];
      if (i === -1) return null;
      const v = cells[i];
      return v == null ? null : v.trim() || null;
    };

    const idLocal = get("id");
    if (!idLocal) continue; // Skip filas sin id

    const anioRaw = get("ano");
    const anio = anioRaw && /^\d{4}$/.test(anioRaw) ? Number(anioRaw) : opt.anioFallback;

    const monto = parseQuilmesMonto(get("monto"));
    const fecha = parseQuilmesFecha(get("fechaApertura"));
    const estadoRaw = get("estado");
    const estado = normalizeEstado(estadoRaw);

    out.push({
      id: `${opt.municipioId}-${anio}-${idLocal}`,
      municipioId: opt.municipioId,
      anio,
      estado,
      estadoRaw,
      objeto: get("objeto"),
      montoPresupuesto: monto,
      fechaApertura: fecha,
      lugarApertura: get("lugarApertura"),
      proveedor: null, // Quilmes no expone este campo
      fuenteUrl: opt.fuenteUrl,
      fuenteTipo: "CKAN",
    });
  }

  if (out.length === 0) {
    warnings.push("CSV parseado pero sin filas con id válido");
  }
  return { contrataciones: out, warnings };
}

// ─────────────────────────────────────────
// Aggregate (stats por municipio + año)
// ─────────────────────────────────────────

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[m - 1] + sorted[m]) / 2);
  }
  return sorted[m];
}

/**
 * Sprint 16: HHI sobre proveedores adjudicados.
 *
 * Sólo aplica cuando hay ≥2 contrataciones que tienen TANTO `proveedor`
 * (string no vacío) COMO `montoPresupuesto > 0`. Si alguna de las dos
 * faltantes, se descarta del cálculo. Si quedan menos de 2, devolvemos
 * null porque HHI sobre 0-1 proveedor no informa nada.
 *
 * Escala 0-10000:
 *   HHI = Σ (share_i * 100)² donde share_i = monto_i / monto_total ∈ [0,1].
 *   Un solo proveedor con 100% → 10000. N proveedores con shares iguales
 *   1/N → 10000/N.
 */
function computeHhi(contrataciones: Contratacion[]): {
  hhi: number | null;
  proveedoresUnicos: number | null;
} {
  const usable = contrataciones.filter(
    (c) => c.proveedor != null && c.proveedor.trim().length > 0 && c.montoPresupuesto != null && c.montoPresupuesto > 0,
  );
  if (usable.length < 2) return { hhi: null, proveedoresUnicos: null };
  const porProveedor = new Map<string, number>();
  let total = 0;
  for (const c of usable) {
    const k = c.proveedor!.trim();
    porProveedor.set(k, (porProveedor.get(k) ?? 0) + c.montoPresupuesto!);
    total += c.montoPresupuesto!;
  }
  if (total <= 0) return { hhi: null, proveedoresUnicos: null };
  let hhi = 0;
  for (const monto of porProveedor.values()) {
    const share = (monto / total) * 100;
    hhi += share * share;
  }
  return { hhi: Math.round(hhi), proveedoresUnicos: porProveedor.size };
}

/**
 * Agrega un set de contrataciones (de un mismo municipio + año) en stats
 * comparables: total, mediana, distribución por estado, HHI de proveedores.
 *
 * Si el input mezcla años o municipios, usa el primero como referencia y
 * warna implícitamente vía el `anio` resultante (caller debería filtrar).
 */
export function aggregateContrataciones(
  contrataciones: Contratacion[],
  fuenteUrl: string,
): ContratacionesAggregate | null {
  if (contrataciones.length === 0) return null;
  const first = contrataciones[0];
  const validMontos = contrataciones
    .map((c) => c.montoPresupuesto)
    .filter((v): v is number => v != null && v > 0);
  const total = validMontos.reduce((s, v) => s + v, 0);
  const porEstado: Partial<Record<ContratacionEstado, number>> = {};
  for (const c of contrataciones) {
    porEstado[c.estado] = (porEstado[c.estado] ?? 0) + 1;
  }
  const { hhi, proveedoresUnicos } = computeHhi(contrataciones);
  return {
    municipioId: first.municipioId,
    anio: first.anio,
    totalContrataciones: contrataciones.length,
    montoTotalPresupuesto: total,
    conMontoValido: validMontos.length,
    medianaMonto: median(validMontos),
    porEstado,
    hhiProveedores: hhi,
    proveedoresUnicos,
    fuenteUrl,
  };
}
