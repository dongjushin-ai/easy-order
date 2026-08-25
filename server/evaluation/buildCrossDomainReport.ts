import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type AnyResult = { model: string; dataset: string; inputMode: string; contextMode: string; diagnostics: Record<string, number | string>; metrics: any };
type EvaluationFile = { datasetVersion?: string; results: AnyResult[] };
const mega = JSON.parse(await readFile(resolve("evaluation-results/baselines/mega20-2026-08-23-v1.json"), "utf8")) as EvaluationFile;
const snack = JSON.parse(await readFile(resolve("evaluation-results/baselines/snack20-2026-08-23-v1.json"), "utf8")) as EvaluationFile;
const models = ["gpt-5.6-luna", "gpt-5.6-terra"];
const pick = (file: EvaluationFile, model: string) => file.results.find((r) => r.model === model && r.dataset === "full-20" && r.inputMode === "description" && r.contextMode === "batch")!;
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const legacyEce = (result: AnyResult) => result.metrics.calibration.reduce((sum: number, bucket: any) => sum + Math.abs(bucket.meanConfidence - bucket.accuracy) * bucket.count / result.metrics.evaluatedAttributes, 0);
const legacyThreshold = (result: AnyResult, threshold: number) => result.metrics.thresholds.find((item: any) => item.threshold === threshold);
const modernThreshold = (result: AnyResult, threshold: number) => result.metrics.thresholds.find((item: any) => item.threshold === threshold);

const lines = ["# Cross-domain AI Enrichment Baseline", "", `- Mega dataset: ${mega.datasetVersion ?? "mega20-v1 (legacy metrics)"}`, `- Snack dataset: ${snack.datasetVersion ?? "snack20-v1"}`, "- Comparison experiment: description + batch", "- Review threshold shown below: 0.6", "", "| Metric | Mega Luna | Snack Luna | Mega Terra | Snack Terra |", "|---|---:|---:|---:|---:|"];
const ml = pick(mega, models[0]); const sl = pick(snack, models[0]); const mt = pick(mega, models[1]); const st = pick(snack, models[1]);
lines.push(`| Range Accuracy | ${pct(ml.metrics.rangeAccuracy)} | ${pct(sl.metrics.rangeAccuracy)} | ${pct(mt.metrics.rangeAccuracy)} | ${pct(st.metrics.rangeAccuracy)} |`);
lines.push(`| Strict Profile Accuracy | ${pct(ml.metrics.menuProfileAccuracy)} | ${pct(sl.metrics.strictProfileAccuracy)} | ${pct(mt.metrics.menuProfileAccuracy)} | ${pct(st.metrics.strictProfileAccuracy)} |`);
lines.push(`| Auto Approval Accuracy @0.6 | n/a | ${pct(modernThreshold(sl,.6).autoApprovalAccuracy)} | n/a | ${pct(modernThreshold(st,.6).autoApprovalAccuracy)} |`);
lines.push(`| Dangerous Miss @0.6 | ${legacyThreshold(ml,.6).dangerousMisses} | ${modernThreshold(sl,.6).moderateDangerousMisses} | ${legacyThreshold(mt,.6).dangerousMisses} | ${modernThreshold(st,.6).moderateDangerousMisses} |`);
lines.push(`| ECE | ${legacyEce(ml).toFixed(3)} | ${sl.metrics.expectedCalibrationError.toFixed(3)} | ${legacyEce(mt).toFixed(3)} | ${st.metrics.expectedCalibrationError.toFixed(3)} |`);
lines.push("", "## Domain gaps", "", "| Model | Range accuracy gap | Strict profile gap | ECE gap |", "|---|---:|---:|---:|");
for (const model of models) { const m = pick(mega, model); const s = pick(snack, model); lines.push(`| ${model} | ${pct(Math.abs(m.metrics.rangeAccuracy-s.metrics.rangeAccuracy))} | ${pct(Math.abs(m.metrics.menuProfileAccuracy-s.metrics.strictProfileAccuracy))} | ${Math.abs(legacyEce(m)-s.metrics.expectedCalibrationError).toFixed(3)} |`); }
lines.push("", "## Owner review burden", "", "| Model / dataset | Threshold | Review attributes | Auto approval | Auto approval accuracy | Dangerous misses |", "|---|---:|---:|---:|---:|---:|");
for (const model of models) for (const threshold of [.4,.5,.6,.7,.8]) { const m = legacyThreshold(pick(mega, model), threshold); const s = modernThreshold(pick(snack, model), threshold); lines.push(`| ${model} / Mega | ${threshold} | ${m.reviewCount} | ${pct(m.autoApprovalRate)} | n/a | ${m.dangerousMisses} |`); lines.push(`| ${model} / Snack | ${threshold} | ${s.reviewCount} | ${pct(s.autoApprovalRate)} | ${pct(s.autoApprovalAccuracy)} | ${s.moderateDangerousMisses} |`); }
lines.push("", "## Snack attribute results", "", "| Model | Attribute | Accuracy | n | Mean error | Confidence |", "|---|---|---:|---:|---:|---:|");
for (const model of models) for (const a of pick(snack, model).metrics.attributeMetrics) lines.push(`| ${model} | ${a.attribute} | ${pct(a.rangeAccuracy)} | ${a.sampleCount} | ${a.meanRangeError.toFixed(3)} | ${a.meanConfidence.toFixed(3)} |`);

function hybrid(primary: AnyResult, fallback: AnyResult, threshold: number) {
  const fallbackCases = new Map(fallback.metrics.cases.map((item: any) => [`${item.menuId}:${item.attribute}`, item])); let primaryAuto=0, fallbackCalls=0, owner=0, correct=0, dangerous=0;
  for (const item of primary.metrics.cases) { let selected = item; if (item.confidence < threshold) { fallbackCalls += 1; selected = fallbackCases.get(`${item.menuId}:${item.attribute}`); if (!selected || selected.confidence < threshold) { owner += 1; continue; } } else primaryAuto += 1; if (selected.correct) correct += 1; if (selected.rangeDistance >= .2) dangerous += 1; }
  return { primaryAuto, fallbackCalls, owner, correct, dangerous, total: primary.metrics.cases.length };
}
lines.push("", "## Hybrid estimate (Snack, description + batch)", "", "Luna predictions below threshold are evaluated with the already-collected Terra prediction; Terra below threshold goes to owner review. This estimates routing only and does not claim independent second-call behavior.", "", "| Threshold | Luna auto | Terra escalation | Owner review | Accepted accuracy | Dangerous accepted |", "|---:|---:|---:|---:|---:|---:|");
for (const threshold of [.6,.7,.8]) { const h=hybrid(sl,st,threshold); lines.push(`| ${threshold} | ${h.primaryAuto} | ${h.fallbackCalls} | ${h.owner} | ${pct(h.correct/(h.total-h.owner))} | ${h.dangerous} |`); }
lines.push("", "## Interpretation", "", `- Luna was stronger on Snack overall range accuracy (${pct(sl.metrics.rangeAccuracy)} vs ${pct(st.metrics.rangeAccuracy)}), but both were much weaker than their Mega baselines.`, "- Ingredient/style attributes fried, broth, and cheesy were relatively stable. Continuous/subjective attributes hearty and sweetness, plus texture attribute chewy, were weakest.", "- A single global threshold is not supported by these two datasets alone: Snack requires substantially more review to control dangerous misses, and the weak attributes are domain-specific.", "- Mega auto-approval accuracy is unavailable because the preserved legacy baseline lacks all predictions; it is intentionally not reconstructed.", "- Production configuration remains unconfirmed pending Ground Truth review and a repeat run for stability.");
await writeFile(resolve("evaluation-results/baselines/cross-domain-mega20-snack20-v1.md"), `${lines.join("\n")}\n`, "utf8");
console.log("[Cross-domain report complete] evaluation-results/baselines/cross-domain-mega20-snack20-v1.md");
