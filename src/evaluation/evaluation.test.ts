import { OpenAIAttributeProvider } from "../../server/OpenAIAttributeProvider";
import { megaMgcRawStore } from "../data/megaMgcRawStore";
import { MockAttributeProvider } from "../enrichment/MockAttributeProvider";
import { validateBatchResponse } from "../enrichment/batch";
import { enrichStoreData } from "../enrichment/enrichment";
import { evaluateEnrichment } from "./metrics";
import { megaMgcGroundTruth } from "./megaMgcGroundTruth";

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
  console.log("- ID mapping/duplicate/missing/invalid JSON/timeout/metrics passed");
}
