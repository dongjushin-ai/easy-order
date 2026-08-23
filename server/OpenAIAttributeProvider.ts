import type { AttributeEnrichmentProvider, AttributeInferenceInput, AttributeInferenceResult, StoreInferenceInput, StoreInferenceResult } from "../src/types/enrichment.js";
import type { AttributeDefinition } from "../src/types/store.js";
import { ATTRIBUTE_MAX_RETRIES, ATTRIBUTE_REQUEST_TIMEOUT_MS, chunkMenus, validateBatchResponse } from "../src/enrichment/batch.js";
import { ATTRIBUTE_ENRICHMENT_INSTRUCTIONS, ATTRIBUTE_PROMPT_VERSION } from "../src/enrichment/prompt.js";

export interface OpenAIProviderConfig {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
  debugOutput?: (payload: unknown) => void;
  reasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh" | "max";
}
class NonRetryableProviderError extends Error {}

function extractOutputText(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const direct = (body as { output_text?: unknown }).output_text;
  if (typeof direct === "string") return direct;
  const output = (body as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    if (!item || typeof item !== "object" || !Array.isArray((item as { content?: unknown }).content)) continue;
    for (const content of (item as { content: unknown[] }).content) {
      if (content && typeof content === "object" && (content as { type?: unknown }).type === "output_text" && typeof (content as { text?: unknown }).text === "string") return (content as { text: string }).text;
    }
  }
  return null;
}

function outputSchema(schema: AttributeDefinition[]) {
  const attributeProperties = Object.fromEntries(schema.map((definition) => [definition.key, { type: "object", additionalProperties: false, required: ["value", "confidence", "evidence", "unknown"], properties: {
    value: definition.type === "number" ? { type: "number", minimum: 0, maximum: 1 } : { type: "string", enum: definition.options?.map((option) => option.value) ?? [] },
    confidence: { type: "number", minimum: 0, maximum: 1 }, evidence: { type: "string", maxLength: 240 }, unknown: { type: "boolean" },
  } }]));
  return { type: "object", additionalProperties: false, required: ["menus"], properties: { menus: { type: "array", items: { type: "object", additionalProperties: false, required: ["menuId", "attributes"], properties: { menuId: { type: "string" }, attributes: { type: "object", additionalProperties: false, required: schema.map((item) => item.key), properties: attributeProperties } } } } } };
}

export class OpenAIAttributeProvider implements AttributeEnrichmentProvider {
  readonly id = "openai-responses";
  constructor(private readonly config: OpenAIProviderConfig) {}

  async inferStoreAttributes(input: StoreInferenceInput): Promise<StoreInferenceResult> {
    const started = Date.now(); const batches = chunkMenus(input.menus); const results: StoreInferenceResult["results"] = {}; let retryCount = 0; let inputTokens = 0; let outputTokens = 0; let validationErrorCount = 0;
    for (const menus of batches) {
      let responsePayload: unknown = null;
      for (let attempt = 0; attempt <= (this.config.maxRetries ?? ATTRIBUTE_MAX_RETRIES); attempt += 1) {
        const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? ATTRIBUTE_REQUEST_TIMEOUT_MS);
        try {
          const response = await (this.config.fetchImpl ?? fetch)("https://api.openai.com/v1/responses", { method: "POST", signal: controller.signal, headers: { authorization: `Bearer ${this.config.apiKey}`, "content-type": "application/json" }, body: JSON.stringify({
            model: this.config.model, store: false,
            reasoning: { effort: this.config.reasoningEffort ?? "none" },
            instructions: ATTRIBUTE_ENRICHMENT_INSTRUCTIONS,
            metadata: { prompt_version: ATTRIBUTE_PROMPT_VERSION },
            input: JSON.stringify({ storeName: input.storeName, schema: input.schema, menus: menus.map(({ id, name, price, description, category, options }) => ({ id, name, price, description, category, options })) }),
            text: { format: { type: "json_schema", name: "menu_attribute_enrichment", strict: true, schema: outputSchema(input.schema) } },
          }) });
          if (!response.ok) { if ((response.status === 429 || response.status >= 500) && attempt < (this.config.maxRetries ?? ATTRIBUTE_MAX_RETRIES)) { retryCount += 1; continue; } throw new NonRetryableProviderError(`OpenAI request failed (${response.status})`); }
          const body = await response.json() as { usage?: { input_tokens?: number; output_tokens?: number } };
          inputTokens += body.usage?.input_tokens ?? 0; outputTokens += body.usage?.output_tokens ?? 0;
          const outputText = extractOutputText(body);
          responsePayload = outputText ? JSON.parse(outputText) : null;
          this.config.debugOutput?.(responsePayload);
          break;
        } catch (error) { if (attempt >= (this.config.maxRetries ?? ATTRIBUTE_MAX_RETRIES) || error instanceof SyntaxError || error instanceof NonRetryableProviderError) break; retryCount += 1; }
        finally { clearTimeout(timeout); }
      }
      const checked = validateBatchResponse(responsePayload, menus, input.schema); validationErrorCount += checked.invalid.length; Object.assign(results, checked.valid);
    }
    return { results, diagnostics: { provider: this.id, model: this.config.model, menuCount: input.menus.length, batchCount: batches.length, latencyMs: Date.now() - started, retryCount, inputTokens, outputTokens, fallbackMenuCount: 0, validationErrorCount } };
  }

  async inferMenuAttributes(input: AttributeInferenceInput): Promise<AttributeInferenceResult> {
    const result = await this.inferStoreAttributes({ storeName: "single-menu", menus: [input.menu], schema: input.schema });
    return result.results[input.menu.id] ?? { estimates: {} };
  }
}
