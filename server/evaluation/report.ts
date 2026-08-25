import type { ProviderDiagnostics } from "../../src/types/enrichment.js";
import type { EvaluationMetrics } from "../../src/evaluation/metrics.js";
import { megaMgcGroundTruth } from "../../src/evaluation/megaMgcGroundTruth.js";

export interface StoredExperiment { model: string; dataset: string; inputMode: string; contextMode: string; reasoningEffort?: string; diagnostics: ProviderDiagnostics; metrics: EvaluationMetrics; }
export interface StoredEvaluation { generatedAt: string; promptVersion: string; datasetId?: string; datasetName?: string; datasetVersion?: string; coreAttributes?: readonly string[]; results: StoredExperiment[]; }
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

export function renderEvaluationReport(payload: StoredEvaluation): string {
  const modern = payload.results.every((result) => Array.isArray(result.metrics.cases));
  const lines = ["# AI Attribute Evaluation", "", `- Generated: ${payload.generatedAt}`, `- Prompt version: ${payload.promptVersion}`, `- Dataset version: ${payload.datasetVersion ?? "legacy-unversioned"}`, `- Offline recalculation: ${modern ? "available" : "unavailable (legacy file does not contain complete predictions)"}`, "", "## Metric Definitions", "", "- Range Accuracy: finite prediction is inside the inclusive human-defined range.", "- Range-aware Error: zero inside the range; otherwise distance to the nearest boundary.", "- Strict Profile Accuracy: every evaluated numeric attribute for a menu is correct.", "- Profile Success @80%: at least 80% of a menu's evaluated attributes are correct.", "- Error Review Recall: incorrect attributes sent to simulated review.", "- Dangerous Error Review Recall: attributes with range distance >= 0.20 sent to review.", "- Unnecessary Review: reviewed attributes that were actually inside range.", "- Auto Approval Accuracy: correctness among attributes not sent to review.", "- Dangerous Miss: range distance >= 0.20 and confidence >= simulated threshold. Provider needsReview is reported separately.", "", "| Model | Dataset | Input | Context | Range accuracy | Range error | Strict profile | Profile @80% | Temp accuracy | Latency ms | Tokens in/out |", "|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|"];
  lines.splice(3, 0, `- Dataset: ${payload.datasetName ?? payload.datasetId ?? "MegaMGC (legacy)"}`, `- Core attributes: ${payload.coreAttributes?.join(", ") ?? "not recorded"}`);
  for (const r of payload.results) lines.push(`| ${r.model} | ${r.dataset} | ${r.inputMode} | ${r.contextMode} | ${pct(r.metrics.rangeAccuracy)} | ${r.metrics.meanRangeError.toFixed(3)} | ${pct(r.metrics.strictProfileAccuracy ?? r.metrics.menuProfileAccuracy)} | ${r.metrics.profileSuccessAt80 === undefined ? "n/a" : pct(r.metrics.profileSuccessAt80)} | ${pct(r.metrics.temperatureAccuracy)} | ${r.diagnostics.latencyMs} | ${r.diagnostics.inputTokens ?? "n/a"}/${r.diagnostics.outputTokens ?? "n/a"} |`);
  for (const r of payload.results) {
    lines.push("", `## ${r.model} / ${r.dataset} / ${r.inputMode} / ${r.contextMode}`, "", `Reasoning effort: ${r.reasoningEffort ?? "not recorded"}`);
    if (!modern) {
      lines.push("", "Legacy metrics preserved. Full attribute recalculation, regression cases, and revised threshold metrics require a future run that stores complete predictions.", "", "### Stored largest errors (legacy subset)", "");
      const legacyErrors = r.metrics.largestErrors as unknown as Array<{ menuId: string; attribute: string; value: number; confidence: number; rangeError: number }>;
      for (const e of legacyErrors.filter((item) => item.rangeError > 0)) {
        const range = megaMgcGroundTruth.find((item) => item.menuId === e.menuId)?.numeric[e.attribute];
        lines.push(`- Menu: ${e.menuId}; Attribute: ${e.attribute}; Predicted: ${e.value.toFixed(3)}; Expected range: ${range ? `${range[0].toFixed(3)} ~ ${range[1].toFixed(3)}` : "unavailable"}; Range distance: ${e.rangeError.toFixed(3)}; Confidence: ${e.confidence.toFixed(3)}; Provider needs review: ${e.confidence < .6}`);
      }
      continue;
    }
    lines.push("", "### Attribute metrics", "", "| Attribute | Accuracy | n | Mean range error | Mean confidence |", "|---|---:|---:|---:|---:|");
    for (const a of r.metrics.attributeMetrics) lines.push(`| ${a.attribute} | ${pct(a.rangeAccuracy)} | ${a.sampleCount} | ${a.meanRangeError.toFixed(3)} | ${a.meanConfidence.toFixed(3)} |`);
    lines.push("", "### Threshold sweep", "", "| Threshold | Review n | Error recall | Dangerous recall | Unnecessary | Auto approval | Auto accuracy | Moderate/Severe/Critical misses |", "|---:|---:|---:|---:|---:|---:|---:|---:|");
    for (const t of r.metrics.thresholds) lines.push(`| ${t.threshold} | ${t.reviewCount} | ${pct(t.errorReviewRecall)} | ${pct(t.dangerousErrorReviewRecall)} | ${pct(t.unnecessaryReviewRate)} | ${pct(t.autoApprovalRate)} | ${pct(t.autoApprovalAccuracy)} | ${t.moderateDangerousMisses}/${t.severeDangerousMisses}/${t.criticalDangerousMisses} |`);
    lines.push("", "### Largest errors", "");
    for (const e of r.metrics.largestErrors) lines.push(`- Menu: ${e.menuId}; Attribute: ${e.attribute}; Predicted: ${e.predictedValue.toFixed(3)}; Expected range: ${e.expectedMin.toFixed(3)} ~ ${e.expectedMax.toFixed(3)}; Range distance: ${e.rangeDistance.toFixed(3)}; Confidence: ${e.confidence.toFixed(3)}; Provider needs review: ${e.providerNeedsReview}`);
    lines.push("", `Calibration: mean confidence ${r.metrics.averageConfidence.toFixed(3)}, ECE ${r.metrics.expectedCalibrationError.toFixed(3)}.`);
  }
  if (modern) appendComparisons(lines, payload.results);
  return `${lines.join("\n")}\n`;
}

function appendComparisons(lines: string[], results: StoredExperiment[]): void {
  lines.push("", "## Description Regression Cases", "");
  for (const described of results.filter((r) => r.dataset === "full-20" && r.inputMode === "description" && r.contextMode === "batch")) {
    const nameOnly = results.find((r) => r.model === described.model && r.dataset === described.dataset && r.inputMode === "name-only" && r.contextMode === "batch"); if (!nameOnly) continue;
    for (const d of described.metrics.cases.filter((item) => !item.correct)) { const n = nameOnly.metrics.cases.find((item) => item.menuId === d.menuId && item.attribute === d.attribute); if (n?.correct) lines.push(`- ${described.model}: ${d.menuId}.${d.attribute}; name-only ${n.predictedValue.toFixed(2)} -> description ${d.predictedValue.toFixed(2)}; expected ${d.expectedMin.toFixed(2)}~${d.expectedMax.toFixed(2)}`); }
  }
  lines.push("", "## Ground Truth Review Candidates", "");
  const fullBatch = results.filter((r) => r.dataset === "full-20" && r.inputMode === "description" && r.contextMode === "batch");
  if (fullBatch.length >= 2) for (const first of fullBatch[0].metrics.cases) { const peers = fullBatch.slice(1).map((r) => r.metrics.cases.find((item) => item.menuId === first.menuId && item.attribute === first.attribute)).filter(Boolean); if (!first.correct && first.rangeDistance >= .1 && peers.length && peers.every((item) => item && !item.correct && item.rangeDistance >= .1) && peers.every((item) => item && Math.abs(item.predictedValue - first.predictedValue) <= .1)) lines.push(`- GROUND_TRUTH_REVIEW_CANDIDATE: ${first.menuId}.${first.attribute}; expected ${first.expectedMin.toFixed(2)}~${first.expectedMax.toFixed(2)}; models ${[first, ...peers].map((item) => item!.predictedValue.toFixed(2)).join(", ")}`); }
  if (lines.at(-1) === "") lines.push("- None detected.");
}
