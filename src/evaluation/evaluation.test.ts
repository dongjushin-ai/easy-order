import { OpenAIAttributeProvider } from "../../server/OpenAIAttributeProvider";
import { megaMgcRawStore } from "../data/megaMgcRawStore";
import { MockAttributeProvider } from "../enrichment/MockAttributeProvider";
import { validateBatchResponse } from "../enrichment/batch";
import { enrichStoreData } from "../enrichment/enrichment";
import { evaluateEnrichment, isWithinRange, rangeAwareError } from "./metrics";
import { megaMgcGroundTruth } from "./megaMgcGroundTruth";
import { megaMgcEvaluationDataset, validateEvaluationDataset } from "./dataset";
import type { EnrichedStoreData } from "../types/enrichment";
import { aggregateRaterRanges, classifyModelRelation, reliabilityWeightedAccuracy, simulateReviewPolicy, snackRiskPolicy } from "./attributeAudit";

function check(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Evaluation assertion failed: ${message}`); }

export async function runEvaluationTests(): Promise<void> {
  console.log("\n[AI evaluation harness]");
  const schema = [{ key: "score", label: "Score", type: "number" as const }];
  const menus = [{ id: "a", name: "A", price: 1 }, { id: "b", name: "B", price: 1 }];
  const estimate = (value: number) => ({ score: { value, confidence: .8, evidence: "test", unknown: false } });
  const reordered = validateBatchResponse({ menus: [{ menuId: "b", attributes: estimate(.2) }, { menuId: "unknown", attributes: estimate(.5) }, { menuId: "a", attributes: estimate(.8) }] }, menus, schema);
  check(reordered.valid.a.estimates.score.value === .8 && reordered.valid.b.estimates.score.value === .2, "response order must map by menuId");
  const duplicate = validateBatchResponse({ menus: [{ menuId: "a", attributes: estimate(.2) }, { menuId: "a", attributes: estimate(.8) }] }, menus, schema);
  check(!duplicate.valid.a && duplicate.invalid.some((item) => item.menuId === "a") && duplicate.invalid.some((item) => item.menuId === "b"), "duplicate and missing IDs must be rejected");

  const invalidJson = new OpenAIAttributeProvider({ apiKey: "test", model: "test", maxRetries: 0, fetchImpl: async () => new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: "not-json" }] }] }), { status: 200 }) });
  const invalidResult = await invalidJson.inferStoreAttributes({ storeName: "failure", menus: [menus[0]], schema });
  check(Object.keys(invalidResult.results).length === 0, "invalid JSON must fail closed");

  const timeoutFetch = ((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  })) as typeof fetch;
  const timeoutProvider = new OpenAIAttributeProvider({ apiKey: "test", model: "test", timeoutMs: 1, maxRetries: 1, fetchImpl: timeoutFetch });
  const timeoutResult = await timeoutProvider.inferStoreAttributes({ storeName: "failure", menus: [menus[0]], schema });
  check(Object.keys(timeoutResult.results).length === 0 && timeoutResult.diagnostics.retryCount === 1, "timeout must retry then fail closed");

  const enriched = await enrichStoreData(megaMgcRawStore, new MockAttributeProvider());
  const metrics = evaluateEnrichment(enriched, megaMgcGroundTruth);
  check(metrics.evaluatedAttributes === 140 && metrics.thresholds.length === 5 && metrics.calibration.length === 4, "20-menu metric coverage");
  check(metrics.rangeAccuracy >= 0 && metrics.rangeAccuracy <= 1 && metrics.largestErrors.length <= 10, "metric bounds");
  check(isWithinRange(.3, .3, .7) && isWithinRange(.5, .3, .7) && isWithinRange(.7, .3, .7), "range boundaries are inclusive");
  check(!isWithinRange(.29, .3, .7) && !isWithinRange(.71, .3, .7) && !isWithinRange(Number.NaN, .3, .7), "outside and invalid values are incorrect");
  check(rangeAwareError(.5, .3, .7) === 0 && Math.abs(rangeAwareError(.1, .3, .7) - .2) < 1e-9 && Math.abs(rangeAwareError(.9, .3, .7) - .2) < 1e-9, "range-aware error");
  const fixture = { storeId: "fixture", storeName: "Fixture", attributes: [{ key: "a", label: "A", type: "number" as const }, { key: "b", label: "B", type: "number" as const }], menus: [
    { id: "perfect", name: "Perfect", price: 1, attributes: { a: .5, b: .5 }, attributeMetadata: { a: { confidence: .9, source: "AI_FROM_NAME" as const, supportingSources: [], needsReview: false }, b: { confidence: .9, source: "AI_FROM_NAME" as const, supportingSources: [], needsReview: false } } },
    { id: "partial", name: "Partial", price: 1, attributes: { a: .5, b: 1 }, attributeMetadata: { a: { confidence: .3, source: "AI_FROM_NAME" as const, supportingSources: [], needsReview: true }, b: { confidence: .9, source: "AI_FROM_NAME" as const, supportingSources: [], needsReview: false } } },
  ] } satisfies EnrichedStoreData;
  const fixtureMetrics = evaluateEnrichment(fixture, [{ menuId: "perfect", temperature: [], numeric: { a: [.3, .7], b: [.3, .7] } }, { menuId: "partial", temperature: [], numeric: { a: [.3, .7], b: [.3, .7] } }]);
  check(fixtureMetrics.strictProfileAccuracy === .5 && fixtureMetrics.meanProfileAttributeAccuracy === .75, "strict and relaxed profile metrics");
  const threshold = fixtureMetrics.thresholds.find((item) => item.threshold === .6)!;
  check(threshold.errorReviewRecall === 0 && threshold.unnecessaryReviewRate === 1 && threshold.autoApprovalRate === .75 && Math.abs(threshold.autoApprovalAccuracy - .6667) < .0001, "review and auto approval definitions");
  check(fixtureMetrics.calibration.every((bucket) => typeof bucket.overconfidenceGap === "number"), "calibration gap");
  check(validateEvaluationDataset(megaMgcEvaluationDataset).valid, "Mega ground truth validation");
  const invalidDataset = { ...megaMgcEvaluationDataset, groundTruth: [...megaMgcEvaluationDataset.groundTruth, megaMgcEvaluationDataset.groundTruth[0]] };
  check(!validateEvaluationDataset(invalidDataset).valid, "duplicate ground truth rejection");
  check(reliabilityWeightedAccuracy(fixtureMetrics.cases) >= 0 && reliabilityWeightedAccuracy(fixtureMetrics.cases) <= 1, "reliability weighted metric bounds");
  const relationBase = { ...fixtureMetrics.cases[0], correct: false, predictedValue: 0, rangeDistance: .3 };
  check(classifyModelRelation(relationBase, { ...relationBase, predictedValue: .05 }) === "MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT", "model consensus conflict");
  check(classifyModelRelation(relationBase, { ...relationBase, predictedValue: .8 }) === "MODEL_DISAGREEMENT", "model disagreement");
  const rater = aggregateRaterRanges([{ min:.2,max:.5 },{ min:.3,max:.6 },{ min:.25,max:.55 }]);
  check(rater?.median.min === .25 && rater.intersection.min === .3 && rater.union.max === .6, "inter-rater aggregation");
  const globalPolicy = simulateReviewPolicy(fixtureMetrics.cases, () => .8);
  const riskPolicy = simulateReviewPolicy(fixtureMetrics.cases, attribute => snackRiskPolicy[attribute] ?? .8);
  check(globalPolicy.reviewCount >= 0 && riskPolicy.reviewCount >= 0, "review policy simulation");
  console.log("- ID mapping/failures/range/profile/review/calibration/ground-truth validation passed");
}
