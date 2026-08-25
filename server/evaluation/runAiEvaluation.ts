import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { OpenAIAttributeProvider } from "../OpenAIAttributeProvider.js";
import { enrichStoreData } from "../../src/enrichment/enrichment.js";
import { ATTRIBUTE_PROMPT_VERSION } from "../../src/enrichment/prompt.js";
import { evaluateEnrichment, type EvaluationMetrics } from "../../src/evaluation/metrics.js";
import { megaMgcSmokeMenuIds } from "../../src/evaluation/megaMgcGroundTruth.js";
import type { AttributeEnrichmentProvider, AttributeInferenceInput, AttributeInferenceResult, ProviderDiagnostics, StoreInferenceInput, StoreInferenceResult } from "../../src/types/enrichment.js";
import type { RawStoreData } from "../../src/types/store.js";
import { loadServerEnvironment } from "../loadEnvironment.js";
import { megaMgcEvaluationDataset, validateEvaluationDataset } from "../../src/evaluation/dataset.js";
import type { EvaluationDataset } from "../../src/evaluation/dataset.js";
import { getEvaluationDataset } from "../../src/evaluation/registry.js";
import { renderEvaluationReport } from "./report.js";

type ContextMode = "batch" | "single";
interface ExperimentResult { model: string; dataset: "smoke-5" | "full-20"; inputMode: "name-only" | "description"; contextMode: ContextMode; reasoningEffort: string; diagnostics: ProviderDiagnostics; metrics: EvaluationMetrics; }

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

function variant(dataset: EvaluationDataset, ids: readonly string[], inputMode: "name-only" | "description"): RawStoreData {
  return { ...dataset.store, menus: dataset.store.menus.filter((menu) => ids.includes(menu.id)).map((menu) => inputMode === "name-only" ? { ...menu, description: undefined } : { ...menu }) };
}

async function experiment(dataset: EvaluationDataset, model: string, ids: readonly string[], inputMode: "name-only" | "description", contextMode: ContextMode, debug: unknown[]): Promise<ExperimentResult> {
  const raw = variant(dataset, ids, inputMode);
  const effort = process.env.OPENAI_ATTRIBUTE_REASONING_EFFORT as "none" | "low" | "medium" | "high" | "xhigh" | "max" | undefined;
  const evaluationTimeoutMs = Number(process.env.OPENAI_ATTRIBUTE_EVAL_TIMEOUT_MS ?? 30_000);
  const base = new OpenAIAttributeProvider({ apiKey: process.env.OPENAI_API_KEY!, model, reasoningEffort: effort ?? "none", timeoutMs: evaluationTimeoutMs, debugOutput: process.env.DEBUG ? (payload) => debug.push({ model, inputMode, contextMode, payload }) : undefined });
  const measured = new MeasuredProvider(base, contextMode);
  const enriched = await enrichStoreData(raw, measured.batchMethod);
  return { model, dataset: ids.length === 5 ? "smoke-5" : "full-20", inputMode, contextMode, reasoningEffort: effort ?? "none", diagnostics: aggregateDiagnostics(measured.diagnostics, model, raw.menus.length), metrics: evaluateEnrichment(enriched, dataset.groundTruth.filter((item) => ids.includes(item.menuId))) };
}

async function main(): Promise<void> {
  loadServerEnvironment();
  const datasetArgumentIndex = process.argv.indexOf("--dataset");
  const datasetArgument = datasetArgumentIndex >= 0 ? process.argv[datasetArgumentIndex + 1] : megaMgcEvaluationDataset.version;
  const evaluationDataset = getEvaluationDataset(datasetArgument);
  if (!evaluationDataset) throw new Error(`Unknown evaluation dataset: ${datasetArgument}`);
  const datasetValidation = validateEvaluationDataset(evaluationDataset);
  if (!datasetValidation.valid) throw new Error(`Invalid evaluation dataset:\n${datasetValidation.errors.join("\n")}`);
  const smokeOnly = process.argv.includes("--smoke");
  const batchOnly = process.argv.includes("--batch-only");
  const models = (process.env.OPENAI_ATTRIBUTE_EVAL_MODELS || process.env.OPENAI_ATTRIBUTE_MODEL || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!process.env.OPENAI_API_KEY || models.length === 0) {
    console.log("[AI evaluation skipped] Set OPENAI_API_KEY and OPENAI_ATTRIBUTE_EVAL_MODELS (or OPENAI_ATTRIBUTE_MODEL) to run real API evaluation.");
    return;
  }
  const results: ExperimentResult[] = []; const debug: unknown[] = [];
  for (const model of models) {
    console.log(`[AI evaluation] smoke: ${model}`);
    const smokeIds = evaluationDataset.smokeMenuIds ?? (evaluationDataset.version === megaMgcEvaluationDataset.version ? megaMgcSmokeMenuIds : evaluationDataset.store.menus.slice(0, 5).map((menu) => menu.id));
    const smoke = await experiment(evaluationDataset, model, smokeIds, "description", "batch", debug);
    results.push(smoke);
    if ((smoke.diagnostics.validationErrorCount ?? 0) > 0) throw new Error(`Smoke validation failed for ${model}; full evaluation stopped.`);
    if (!smokeOnly) {
      console.log(`[AI evaluation] full experiments: ${model}`);
      const allIds = evaluationDataset.groundTruth.map((item) => item.menuId);
      results.push(await experiment(evaluationDataset, model, allIds, "description", "batch", debug));
      results.push(await experiment(evaluationDataset, model, allIds, "name-only", "batch", debug));
      if (!batchOnly) results.push(await experiment(evaluationDataset, model, allIds, "description", "single", debug));
    }
  }
  const outputDir = resolve("evaluation-results"); await mkdir(outputDir, { recursive: true });
  const payload = { generatedAt: new Date().toISOString(), promptVersion: ATTRIBUTE_PROMPT_VERSION, datasetId: evaluationDataset.id, datasetName: evaluationDataset.store.storeName, datasetVersion: evaluationDataset.version, coreAttributes: evaluationDataset.coreAttributes, results };
  await writeFile(resolve(outputDir, "latest.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(resolve(outputDir, "latest.md"), renderEvaluationReport(payload), "utf8");
  if (process.env.DEBUG) await writeFile(resolve(outputDir, "debug-sanitized.json"), `${JSON.stringify(debug, null, 2)}\n`, "utf8");
  console.log(`[AI evaluation complete] ${results.length} experiment(s); reports: evaluation-results/latest.json, latest.md`);
}

await main();
