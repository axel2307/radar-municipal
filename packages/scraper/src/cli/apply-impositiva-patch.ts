#!/usr/bin/env tsx
/**
 * Sprint 10: aplica el patch emitido por `resolve-impositiva-urls.ts` al
 * archivo `auto-audit.json`.
 *
 * Por cada entry del patch con `newUrl !== null`:
 *   - Busca la entry del municipio en el audit.
 *   - Agrega/actualiza un DocumentAudit con categoría ORDENANZA_IMPOSITIVA
 *     apuntando a la nueva URL, con confianza MEDIA y nota explicativa.
 *   - Deja la entry ORDENANZA_FISCAL original intacta (seguimos reconociendo
 *     que el municipio publica Código Fiscal — simplemente ahora tenemos
 *     la Impositiva separada).
 *
 * Para entries del patch con `newUrl === null` NO se hace nada: el audit
 * sigue como estaba. El operador humano puede decidir si remover la
 * categoría FISCAL o esperar un próximo sprint.
 *
 * Uso:
 *   pnpm apply:impositiva-patch -- --patch ./output/resolve-impositiva-patch.json \
 *     --audit ../web/src/data/auto-audit.json
 *   pnpm apply:impositiva-patch -- --patch X --audit Y --dry-run
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ConfidenceLevel,
  DocumentCategory,
  DocumentFormat,
  type DocumentAudit,
  type PilotAuditData,
} from "@radar-municipal/core";
import type { ImpositivaPatchEntry } from "./resolve-impositiva-urls";

export interface CliOptions {
  patchPath: string;
  auditPath: string;
  dryRun: boolean;
}

export function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const patchIdx = args.indexOf("--patch");
  if (patchIdx === -1 || !args[patchIdx + 1]) {
    throw new Error("--patch <path> es requerido");
  }
  const auditIdx = args.indexOf("--audit");
  if (auditIdx === -1 || !args[auditIdx + 1]) {
    throw new Error("--audit <path> es requerido");
  }
  return {
    patchPath: args[patchIdx + 1],
    auditPath: args[auditIdx + 1],
    dryRun: args.includes("--dry-run"),
  };
}

export interface ApplyResult {
  applied: number;
  skippedNoNewUrl: number;
  skippedMissingEntry: number;
  updatedEntries: Array<{ municipioId: string; action: "added" | "updated"; newUrl: string }>;
}

/**
 * Mutación en memoria. Devuelve el mismo array con los cambios aplicados.
 * Puro-ish — testeable pasando fixtures sintéticos.
 */
export function applyPatchInMemory(
  audit: PilotAuditData,
  patch: ReadonlyArray<ImpositivaPatchEntry>,
): ApplyResult {
  let applied = 0;
  let skippedNoNewUrl = 0;
  let skippedMissingEntry = 0;
  const updatedEntries: ApplyResult["updatedEntries"] = [];

  for (const p of patch) {
    if (!p.newUrl) {
      skippedNoNewUrl++;
      continue;
    }
    const entry = audit.find((e) => e.municipioId === p.municipioId);
    if (!entry) {
      skippedMissingEntry++;
      continue;
    }
    // ¿Ya hay una entry ORDENANZA_IMPOSITIVA publicada? La actualizamos.
    // Si no, agregamos una nueva.
    const existing = entry.documentos.find(
      (d) => d.categoria === DocumentCategory.ORDENANZA_IMPOSITIVA,
    );
    const nota = `Sprint 10: URL detectada por resolve-impositiva-urls (classifier ${p.newKind} ${p.newScore})`;

    if (existing) {
      existing.url = p.newUrl;
      existing.publicado = true;
      existing.formato = DocumentFormat.PDF;
      existing.esParseable = true;
      existing.notas = nota;
      updatedEntries.push({ municipioId: p.municipioId, action: "updated", newUrl: p.newUrl });
    } else {
      const newDoc: DocumentAudit = {
        categoria: DocumentCategory.ORDENANZA_IMPOSITIVA,
        publicado: true,
        url: p.newUrl,
        formato: DocumentFormat.PDF,
        anio: null,
        trimestre: null,
        fechaPublicacion: null,
        fechaCorte: null,
        esParseable: true,
        notas: nota,
      };
      entry.documentos.push(newDoc);
      updatedEntries.push({ municipioId: p.municipioId, action: "added", newUrl: p.newUrl });
    }
    applied++;
  }

  return { applied, skippedNoNewUrl, skippedMissingEntry, updatedEntries };
}

function main() {
  const opt = parseArgs(process.argv);
  const patch = JSON.parse(
    readFileSync(resolve(opt.patchPath), "utf-8"),
  ) as ImpositivaPatchEntry[];
  const auditAbs = resolve(opt.auditPath);
  const audit = JSON.parse(readFileSync(auditAbs, "utf-8")) as PilotAuditData;

  const result = applyPatchInMemory(audit, patch);

  console.log(`📝 Patch summary:`);
  console.log(`   · Patch entries:       ${patch.length}`);
  console.log(`   · Aplicados:           ${result.applied}`);
  console.log(`   · Skippeados (sin url):${result.skippedNoNewUrl}`);
  console.log(`   · Skippeados (no entry):${result.skippedMissingEntry}`);
  for (const u of result.updatedEntries) {
    console.log(`   · ${u.action} ${u.municipioId}: ${u.newUrl}`);
  }

  if (opt.dryRun) {
    console.log(`\n[DRY RUN] No se escribió ${auditAbs}`);
    return;
  }
  writeFileSync(auditAbs, JSON.stringify(audit, null, 2), "utf-8");
  console.log(`\n✅ Audit actualizado: ${auditAbs}`);
}

const invokedAs = process.argv[1] ?? "";
const isMain = invokedAs.endsWith("apply-impositiva-patch.ts");
if (isMain) {
  main();
}
