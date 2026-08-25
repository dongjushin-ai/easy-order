import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getEvaluationDataset } from "../../src/evaluation/registry.js";
import {
  evaluatePolicy,
  globalCandidates,
  policyEvidence,
  riskReductionPerReview,
  searchPolicies,
  sharedMetrics,
  type PolicyCandidate,
} from "../../src/evaluation/policyOptimizer.js";
import { snackAttributeRiskPolicies } from "../../src/evaluation/riskPolicy.js";
import type { AttributeEvaluationCase } from "../../src/evaluation/metrics.js";
import type { GroundTruthStressRecord } from "../../src/evaluation/stressTest.js";
const args = process.argv.slice(2),
  version = args[args.indexOf("--dataset") + 1] ?? "snack20-v1";
const dataset = getEvaluationDataset(version);
if (!dataset) throw new Error(`Unknown dataset ${version}`);
if (version !== "snack20-v1")
  throw new Error(
    "Optimization requires a modern baseline with complete stored predictions",
  );
const baseline = JSON.parse(
  await readFile(
    resolve("evaluation-results/baselines/snack20-2026-08-23-v1.json"),
    "utf8",
  ),
) as {
  results: Array<{
    model: string;
    dataset: string;
    inputMode: string;
    contextMode: string;
    metrics: { cases: AttributeEvaluationCase[] };
  }>;
};
const stress = JSON.parse(
  await readFile(
    resolve("evaluation-results/stress-tests/snack20-v1-stress-test.json"),
    "utf8",
  ),
) as { records: GroundTruthStressRecord[] };
const experiments = baseline.results.filter(
  (x) =>
    x.dataset === "full-20" &&
    x.inputMode === "description" &&
    x.contextMode === "batch",
);
const stableKeys = new Set(
  stress.records
    .filter((x) => x.status === "STABLE")
    .map((x) => `${x.menuId}::${x.attributeId}`),
);
const attrs = [...dataset.coreAttributes];
const optimized = experiments.map((e) => {
  const search = searchPolicies(e.metrics.cases, attrs);
  const aware = searchPolicies(e.metrics.cases, attrs, stableKeys, 1500);
  const globals = globalCandidates(e.metrics.cases, attrs);
  const current = {
    policies: snackAttributeRiskPolicies,
    metrics: evaluatePolicy(e.metrics.cases, snackAttributeRiskPolicies),
  };
  return {
    model: e.model,
    cases: e.metrics.cases,
    search,
    stabilityAware: aware.presets.balanced,
    globals,
    current,
  };
});
const combined = optimized.flatMap((x) => x.cases);
const sharedSearch = searchPolicies(combined, attrs, undefined, 4000);
const shared = sharedSearch.presets.balanced;
const sharedPerModel = optimized.map((x) => ({
  model: x.model,
  metrics: evaluatePolicy(x.cases, shared.policies),
}));
const loo = Object.fromEntries(
  attrs.map((attribute) => {
    const signatures: string[] = [];
    for (const menu of dataset.store.menus) {
      const cases = optimized[0].cases.filter(
        (c) => c.menuId !== menu.id && c.attribute === attribute,
      );
      const options = searchPolicies(cases, [attribute], undefined, 20).presets
        .balanced.policies[0];
      signatures.push(
        `${options.reviewMode}:${options.minimumConfidence ?? "-"}`,
      );
    }
    const unique = [...new Set(signatures)];
    return [
      attribute,
      {
        uniquePolicies: unique,
        policyUnstable: unique.length > 3,
        evidenceLevel: policyEvidence(
          stress.records,
          shared.policies.find((p) => p.attributeId === attribute)!,
        ),
      },
    ];
  }),
);
const result = {
  metadata: {
    dataset: version,
    apiRequests: 0,
    status: ["PROVISIONAL", "DATASET_SPECIFIC", "NOT_PRODUCTION_VALIDATED"],
    searchedPolicies:
      optimized.reduce((s, x) => s + x.search.evaluated, 0) +
      sharedSearch.evaluated,
  },
  models: optimized.map((x) => ({
    model: x.model,
    globalBaselines: x.globals,
    current: x.current,
    presets: x.search.presets,
    paretoFrontier: x.search.frontier,
    stabilityAware: x.stabilityAware,
    riskReductionPerReview: riskReductionPerReview(
      x.globals.find((g) => g.threshold === 0.8)!.metrics,
      x.search.presets.balanced.metrics,
    ),
  })),
  shared: {
    candidate: shared,
    perModel: sharedPerModel,
    worstCase: sharedMetrics(
      sharedPerModel[0].metrics,
      sharedPerModel[1].metrics,
    ),
    frontierSize: sharedSearch.frontier.length,
  },
  leaveOneMenuOut: loo,
  warning:
    "20 menus and n=20 per attribute; optimized rules may overfit snack20-v1. Simulation only.",
};
const dir = resolve("evaluation-results/policies");
await mkdir(dir, { recursive: true });
const json = resolve(dir, "snack20-v1-optimized-risk-policy.json"),
  md = resolve(dir, "snack20-v1-optimized-risk-policy.md");
await writeFile(json, JSON.stringify(result, null, 2), "utf8");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`,
  metric = (m: ReturnType<typeof evaluatePolicy>) =>
    `Review ${m.reviewCount} (${pct(m.reviewRate)}), Auto accuracy ${pct(m.autoApprovalAccuracy)}, miss M/S/C ${m.moderateMiss}/${m.severeMiss}/${m.criticalMiss}, efficiency ${pct(m.reviewEfficiency)}`;
const lines = [
  "# snack20-v1 Optimized Risk Policy",
  "",
  "**PROVISIONAL · DATASET_SPECIFIC · NOT_PRODUCTION_VALIDATED**",
  "",
  "No OpenAI API calls. Stored predictions only. This policy is not applied to production.",
  "",
  `- Searched candidates/partial policies: ${result.metadata.searchedPolicies}`,
  "",
  "## Model presets",
  ...result.models.flatMap((x) => [
    "",
    `### ${x.model}`,
    `- Global 0.8: ${metric(x.globalBaselines.find((g) => g.threshold === 0.8)!.metrics)}`,
    `- Current: ${metric(x.current.metrics)}`,
    `- Safety First: ${metric(x.presets.safetyFirst.metrics)}`,
    `- Balanced: ${metric(x.presets.balanced.metrics)}`,
    `- Automation First: ${metric(x.presets.automationFirst.metrics)}`,
    `- Stability-aware: ${metric(x.stabilityAware.metrics)}`,
    `- Risk reduction/additional review: ${x.riskReductionPerReview}`,
  ]),
  "",
  "## Shared Balanced Policy",
  `- ${metric(shared.metrics)}`,
  `- Worst case M/S/C: ${result.shared.worstCase.worstModerate}/${result.shared.worstCase.worstSevere}/${result.shared.worstCase.worstCritical}`,
  "",
  ...shared.policies.map(
    (p) =>
      `- ${p.attributeId}: ${p.reviewMode}${p.minimumConfidence === undefined ? "" : ` ${p.minimumConfidence}`}`,
  ),
  "",
  "## Pareto frontier",
  ...result.models.map((x) => `- ${x.model}: ${x.paretoFrontier.length}`),
  `- Shared: ${result.shared.frontierSize}`,
  "",
  "## Leave-one-menu-out policy stability",
  ...Object.entries(loo).map(
    ([a, x]) =>
      `- ${a}: ${x.policyUnstable ? "POLICY_UNSTABLE" : "stable-ish"}; evidence ${x.evidenceLevel}; ${x.uniquePolicies.join(", ")}`,
  ),
  "",
  "## Overfitting warning",
  result.warning,
];
await writeFile(md, lines.join("\n") + "\n", "utf8");
console.log(
  JSON.stringify(
    {
      outputs: [json, md],
      ...result.metadata,
      models: result.models.map((x) => ({
        model: x.model,
        safety: x.presets.safetyFirst.metrics,
        balanced: x.presets.balanced.metrics,
        automation: x.presets.automationFirst.metrics,
        stabilityAware: x.stabilityAware.metrics,
        frontier: x.paretoFrontier.length,
      })),
      shared: result.shared,
      unstable: Object.entries(loo)
        .filter(([, x]) => x.policyUnstable)
        .map(([a]) => a),
    },
    null,
    2,
  ),
);
