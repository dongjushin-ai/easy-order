import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  simulateRiskPolicy,
  snackAttributeRiskPolicies,
} from "../../src/evaluation/riskPolicy.js";
import type { AttributeEvaluationCase } from "../../src/evaluation/metrics.js";
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
const experiments = baseline.results.filter(
  (x) =>
    x.dataset === "full-20" &&
    x.inputMode === "description" &&
    x.contextMode === "batch",
);
const rows = experiments.map((x) => ({
  model: x.model,
  global: simulateRiskPolicy(x.metrics.cases, snackAttributeRiskPolicies, 0.8),
  policy: simulateRiskPolicy(x.metrics.cases, snackAttributeRiskPolicies),
}));
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const lines = [
  "# snack20-v1 Provisional Attribute Risk Policy",
  "",
  "**Stress-test based provisional policy. Not applied to production Owner Review or enrichment flows.**",
  "",
  "## Attribute policies",
  "",
  "| Attribute | Suitability | Review mode | Minimum confidence |",
  "|---|---|---|---:|",
  ...snackAttributeRiskPolicies.map(
    (x) =>
      `| ${x.attributeId} | ${x.automationSuitability} | ${x.reviewMode} | ${x.minimumConfidence ?? "n/a"} |`,
  ),
  "",
  "## Global 0.8 vs attribute policy",
  "",
  "| Model | Policy | Review count | Auto approval | Auto accuracy | Dangerous miss | Tier A/B/C review |",
  "|---|---|---:|---:|---:|---:|---|",
  ...rows.flatMap((x) =>
    [
      ["Global 0.8", x.global],
      ["Attribute policy", x.policy],
    ].map(([name, m]) => {
      const z = m as typeof x.global;
      return `| ${x.model} | ${name} | ${z.reviewCount} | ${pct(z.autoApprovalRate)} | ${pct(z.autoApprovalAccuracy)} | ${z.dangerousMiss} | ${z.tierReviewBurden.A.reviewCount}/${z.tierReviewBurden.B.reviewCount}/${z.tierReviewBurden.C.reviewCount} |`;
    }),
  ),
  "",
  "Provisionally stable items remain pending human validation. This report is simulation-only.",
];
const dir = resolve("evaluation-results/policies");
await mkdir(dir, { recursive: true });
const path = resolve(dir, "snack20-v1-risk-policy.md");
await writeFile(path, lines.join("\n") + "\n", "utf8");
console.log(JSON.stringify({ apiRequests: 0, rows, path }, null, 2));
