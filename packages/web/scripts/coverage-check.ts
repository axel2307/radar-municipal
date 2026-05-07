/**
 * Smoke test: imprime stats de cobertura tras merge pilot + auto.
 * Ejecutar: tsx scripts/coverage-check.ts
 */
import { auditData, auditMap, allTransparencyScores } from "../src/lib/scoring-data/loaders";

const total = auditData.length;
const withScore = [...allTransparencyScores.values()].filter((s) => (s.scoreTotal ?? 0) > 0).length;
const byAuditor = new Map<string, number>();
for (const a of auditData) byAuditor.set(a.auditor, (byAuditor.get(a.auditor) ?? 0) + 1);

let withDocs = 0;
let withOrdenanza = 0;
for (const a of auditData) {
  const pub = a.documentos.filter((d) => d.publicado);
  if (pub.length > 0) withDocs++;
  if (pub.some((d) => d.categoria === "ORDENANZA_FISCAL")) withOrdenanza++;
}

console.log(JSON.stringify(
  {
    auditDataSize: total,
    auditMapSize: auditMap.size,
    withScoreGt0: withScore,
    withAtLeast1Doc: withDocs,
    withOrdenanzaFiscal: withOrdenanza,
    byAuditor: Object.fromEntries(byAuditor),
  },
  null,
  2,
));
