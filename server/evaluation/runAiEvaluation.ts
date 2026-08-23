import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { OpenAIAttributeProvider } from "../OpenAIAttributeProvider.js";
import { enrichStoreData } from "../../src/enrichment/enrichment.js";
import { ATTRIBUTE_PROMPT_VERSION } from "../../src/enrichment/prompt.js";
import { evaluateEnrichment, type EvaluationMetrics } from "../../src/evaluation/metrics.js";
import { megaMgcGroundTruth, megaMgcSmokeMenuIds } from "../../src/evaluation/megaMgcGroundTruth.js";
import { megaMgcRawStore } from "../../src/data/megaMgcRawStore.js";
import type { AttributeEnrichmentProvider, AttributeInferenceInput, AttributeInferenceResult, ProviderDiagnostics, StoreInferenceInput, StoreInferenceResult } from "../../src/types/enrichment.js";
import type { RawStoreData } from "../../src/types/store.js";
import { loadServerEnvironment } from "../loadEnvironment.js";

type ContextMode = "batch" | "single";
interface ExperimentResult { model: string; dataset: "smoke-5" | "full-20"; inputMode: "name-only" | "description"; contextMode: ContextMode; diagnostics: ProviderDiagnostics; metrics: EvaluationMetrics; }

class MeasuredProvider implements AttributeEnrichmentProvider {
  readonly id: string;
  diagnostics: ProviderDiagnostics[] = [];
  constructor(private readonly base: OpenAIAttributeProvider, private readonly mode: ContextMode) { this.id = `${base.id}-${mode}`; }
  async inferMenuAttributes(input: AttributeInferenceInput): Promise<AttributeInferenceResult> {
    const response = await this.base.inferStoreAttributes({ storeName: "single-menu-evaluation", menus: [input.menu], schema: input.schema });
    this.diagnostics.push(response.diagnostics);
    return response.results[input.menu.id] ?? { estimates: {} };
  }
  async inferStoreAttributes(input: StoreInferenceInput): Promise<StoreInferenceResult> {
    const response = await this.base.inferStoreAttributes(input); this.diagnostics.push(response.diagnostics); return response;
  }
  get batchMethod(): AttributeEnrichmentProvider {
    return this.mode === "batch" ? this : { id: this.id, inferMenuAttributes: this.inferMenuAttributes.bind(this) };
  }
}

function aggregateDiagnostics(items: ProviderDiagnostics[], model: string, menuCount: number): ProviderDiagnostics {
  return { provider: "openai-responses", model, menuCount, batchCount: items.reduce((sum, item) => sum + item.batchCount, 0), latencyMs: items.reduce((sum, item) => sum + item.latencyMs, 0), retryCount: items.reduce((sum, item) => sum + item.retryCount, 0), inputTokens: items.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0), outputTokens: items.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0), fallbackMenuCount: items.reduce((sum, item) => sum + (item.fallbackMenuCount ?? 0), 0), validationErrorCount: items.reduce((sum, item) => sum + (item.validationErrorCount ?? 0), 0) };
}

function variant(ids: readonly string[], inputMode: "name-only" | "description"): RawStoreData {
  return { ...megaMgcRawStore, menus: megaMgcRawStore.menus.filter((menu) => ids.includes(menu.id)).map((menu) => inputMode === "name-only" ? { ...menu, description: undefined } : { ...menu }) };
}

async function experiment(model: string, ids: readonly string[], inputMode: "name-only" | "description", contextMode: ContextMode, debug: unknown[]): Promise<ExperimentResult> {
  const raw = variant(ids, inputMode);
  const effort = process.env.OPENAI_ATTRIBUTE_REASONING_EFFORT as "none" | "low" | "medium" | "high" | "xhigh" | "max" | undefined;
  const base = new OpenAIAttributeProvider({ apiKey: process.env.OPENAI_API_KEY!, model, reasoningEffort: effort ?? "none", debugOutput: process.env.DEBUG ? (payload) => debug.push({ model, inputMode, contextMode, payload }) : undefined });
  const measured = new MeasuredProvider(base, contextMode);
  const enriched = await enrichStoreData(raw, measured.batchMethod);
  return { model, dataset: ids.length === 5 ? "smoke-5" : "full-20", inputMode, contextMode, diagnostics: aggregateDiagnostics(measured.diagnostics, model, raw.menus.length), metrics: evaluateEnrichment(enriched, megaMgcGroundTruth.filter((item) => ids.includes(item.menuId))) };
}

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
function markdown(results: ExperimentResult[]): string {
  const lines = [`# AI Attribute Evaluation`, ``, `- Generated: ${new Date().toISOString()}`, `- Prompt: ${ATTRIBUTE_PROMPT_VERSION}`, `- Dangerous miss: range distance >= 0.20, confidence >= threshold`, ``, `| Model | Dataset | Input | Context | Range accuracy | Range error | Profile accuracy | Temp accuracy | Latency ms | Tokens in/out |`, `|---|---|---|---|---:|---:|---:|---:|---:|---:|`];
  for (const r of results) lines.push(`| ${r.model} | ${r.dataset} | ${r.inputMode} | ${r.contextMode} | ${pct(r.metrics.rangeAccuracy)} | ${r.metrics.meanRangeError.toFixed(3)} | ${pct(r.metrics.menuProfileAccuracy)} | ${pct(r.metrics.temperatureAccuracy)} | ${r.diagnostics.latencyMs} | ${r.diagnostics.inputTokens ?? 0}/${r.diagnostics.outputTokens ?? 0} |`);
  for (const r of results) {
    lines.push(``, `## ${r.model} / ${r.dataset} / ${r.inputMode} / ${r.contextMode}`, ``, `| Review threshold | Review count | Review recall | Unnecessary review | Auto approval | Dangerous misses |`, `|---:|---:|---:|---:|---:|---:|`);
    for (const t of r.metrics.thresholds) lines.push(`| ${t.threshold} | ${t.reviewCount} | ${pct(t.reviewRecall)} | ${pct(t.unnecessaryReviewRate)} | ${pct(t.autoApprovalRate)} | ${t.dangerousMisses} |`);
    lines.push(``, `Largest errors: ${r.metrics.largestErrors.slice(0, 5).map((e) => `${e.menuId}.${e.attribute}=${e.rangeError.toFixed(2)} (c=${e.confidence.toFixed(2)})`).join(", ") || "none"}`);
  }
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  loadServerEnvironment();
  const smokeOnly = process.argv.includes("--smoke");
  const models = (process.env.OPENAI_ATTRIBUTE_EVAL_MODELS || process.env.OPENAI_ATTRIBUTE_MODEL || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!process.env.OPENAI_API_KEY || models.length === 0) {
    console.log("[AI evaluation skipped] Set OPENAI_API_KEY and OPENAI_ATTRIBUTE_EVAL_MODELS (or OPENAI_ATTRIBUTE_MODEL) to run real API evaluation.");
    return;
  }
  const results: ExperimentResult[] = []; const debug: unknown[] = [];
  for (const model of models) {
    console.log(`[AI evaluation] smoke: ${model}`);
    const smoke = await experiment(model, megaMgcSmokeMenuIds, "description", "batch", debug);
    results.push(smoke);
    if ((smoke.diagnostics.validationErrorCount ?? 0) > 0) throw new Error(`Smoke validation failed for ${model}; full evaluation stopped.`);
    if (!smokeOnly) {
      console.log(`[AI evaluation] full experiments: ${model}`);
      const allIds = megaMgcGroundTruth.map((item) => item.menuId);
      results.push(await experiment(model, allIds, "description", "batch", debug));
      results.push(await experiment(model, allIds, "name-only", "batch", debug));
      results.push(await experiment(model, allIds, "description", "single", debug));
    }
  }
  const outputDir = resolve("evaluation-results"); await mkdir(outputDir, { recursive: true });
  const payload = { generatedAt: new Date().toISOString(), promptVersion: ATTRIBUTE_PROMPT_VERSION, results };
  await writeFile(resolve(outputDir, "latest.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(resolve(outputDir, "latest.md"), markdown(results), "utf8");
  if (process.env.DEBUG) await writeFile(resolve(outputDir, "debug-sanitized.json"), `${JSON.stringify(debug, null, 2)}\n`, "utf8");
  console.log(`[AI evaluation complete] ${results.length} experiment(s); reports: evaluation-results/latest.json, latest.md`);
}

await main();
