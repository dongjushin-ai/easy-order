import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getEvaluationDataset } from "../../src/evaluation/registry.js";
import {
  buildStressRecords,
  STABILITY_CONFIG,
  summarizeStress,
  type StoredPredictionExperiment,
} from "../../src/evaluation/stressTest.js";
const args = process.argv.slice(2);
const datasetArg = args[args.indexOf("--dataset") + 1] ?? "snack20-v1";
const dataset = getEvaluationDataset(datasetArg);
if (!dataset) throw new Error(`Unknown dataset: ${datasetArg}`);
const candidates = dataset.version.startsWith("snack")
  ? ["snack20-2026-08-23-v1.json"]
  : ["mega20-2026-08-23-v1.json"];
const baselinePath = resolve("evaluation-results/baselines", candidates[0]);
const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as {
  generatedAt: string;
  results: StoredPredictionExperiment[];
};
const records = buildStressRecords(dataset, baseline.results);
const summary = summarizeStress(records, baseline.results);
const payload = {
  generatedAt: new Date().toISOString(),
  dataset: {
    id: dataset.id,
    version: dataset.version,
    menuCount: dataset.store.menus.length,
    attributeCount: dataset.coreAttributes.length,
  },
  source: {
    baseline: baselinePath,
    baselineGeneratedAt: baseline.generatedAt,
    apiRequests: 0,
  },
  config: STABILITY_CONFIG,
  summary,
  records,
};
const out = resolve("evaluation-results/stress-tests");
await mkdir(out, { recursive: true });
const stem = `${dataset.version}-stress-test`;
await writeFile(
  resolve(out, `${stem}.json`),
  JSON.stringify(payload, null, 2),
  "utf8",
);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const lines = [
  `# ${dataset.version} Automated Ground Truth Stress Test`,
  "",
  "**Provisionally Stable · Automatically Stress-tested · Pending Human Validation**",
  "",
  "This report measures agreement and instability in stored AI observations. It does not verify ground truth and does not replace human adjudication.",
  "",
  `- Stored observations only; API requests: 0`,
  `- Records: ${summary.total}`,
  `- STABLE: ${summary.classification.stable}`,
  `- QUESTIONABLE: ${summary.classification.questionable}`,
  `- UNRESOLVED: ${summary.classification.unresolved}`,
  `- Stable coverage: ${pct(summary.stableCoverage)}`,
  "",
  "## Model accuracy",
  "",
  "| Model | All GT | Stable only |",
  "|---|---:|---:|",
  ...summary.modelMetrics.map(
    (m) => `| ${m.model} | ${pct(m.allAccuracy)} | ${pct(m.stableAccuracy)} |`,
  ),
  "",
  "## Coverage / accuracy trade-off",
  "",
  "| Score threshold | Coverage | Mean GT hit rate |",
  "|---:|---:|---:|",
  ...summary.tradeoff.map(
    (x) => `| ${x.threshold} | ${pct(x.coverage)} | ${pct(x.gtHitRate)} |`,
  ),
  "",
  "## Attribute summary",
  "",
  "| Attribute | Tier | Stable | Questionable | Unresolved | Stable coverage | Stable accuracy | Suitability |",
  "|---|:---:|---:|---:|---:|---:|---:|---|",
  ...Object.entries(summary.attributes).map(
    ([a, x]) =>
      `| ${a} | ${x.tier} | ${x.stable} | ${x.questionable} | ${x.unresolved} | ${pct(x.coverage)} | ${pct(x.stableAccuracy)} | ${x.automationSuitability} |`,
  ),
  "",
  `## Consensus/GT conflicts (${summary.consensusGtConflicts.length})`,
  "",
  ...summary.consensusGtConflicts.map(
    (x) =>
      `- ${x.menuId}.${x.attributeId}: GT ${x.groundTruthRange.min}–${x.groundTruthRange.max}, AI median ${x.consensus.median}, hit ${pct(x.gtHitRate)}`,
  ),
  "",
  `## Model disagreement (${summary.modelDisagreements.length})`,
  "",
  ...summary.modelDisagreements.map(
    (x) => `- ${x.menuId}.${x.attributeId}: difference ${x.modelDifference}`,
  ),
  "",
  `## Input sensitivity (${summary.inputSensitive.length})`,
  "",
  ...summary.inputSensitive.map(
    (x) => `- ${x.menuId}.${x.attributeId}: robustness ${x.inputRobustness}`,
  ),
  "",
  `## Description sensitivity (${summary.descriptionSensitive.length})`,
  "",
  ...summary.descriptionSensitive.map((x) => `- ${x.menuId}.${x.attributeId}`),
  "",
  "## Human review handoff",
  "",
  `${summary.humanReviewQueue.length} QUESTIONABLE/UNRESOLVED records are exported in JSON for the existing adjudication queue.`,
];
if (!records.length)
  lines.splice(
    8,
    0,
    "- Result: INSUFFICIENT_EVIDENCE — legacy baseline has no complete prediction cases. No API was called.",
  );
await writeFile(resolve(out, `${stem}.md`), `${lines.join("\n")}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      dataset: dataset.version,
      classification: summary.classification,
      stableCoverage: summary.stableCoverage,
      models: summary.modelMetrics,
      conflicts: summary.consensusGtConflicts.length,
      modelDisagreements: summary.modelDisagreements.length,
      inputSensitive: summary.inputSensitive.length,
      descriptionSensitive: summary.descriptionSensitive.length,
      humanReview: summary.humanReviewQueue.length,
      apiRequests: 0,
      outputs: [resolve(out, `${stem}.json`), resolve(out, `${stem}.md`)],
    },
    null,
    2,
  ),
);
