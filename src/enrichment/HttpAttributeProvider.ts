import type { AttributeEnrichmentProvider, AttributeInferenceInput, AttributeInferenceResult, StoreInferenceInput, StoreInferenceResult } from "../types/enrichment";
import { validateBatchResponse } from "./batch";

export class HttpAttributeProvider implements AttributeEnrichmentProvider {
  readonly id = "server-attribute-provider";
  constructor(private readonly endpoint = "/api/attribute-enrichment") {}

  async inferStoreAttributes(input: StoreInferenceInput): Promise<StoreInferenceResult> {
    const response = await fetch(this.endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error(`Attribute endpoint failed (${response.status})`);
    const payload = await response.json() as StoreInferenceResult;
    const normalized = { menus: Object.entries(payload.results ?? {}).map(([menuId, result]) => ({ menuId, attributes: result.estimates })) };
    const checked = validateBatchResponse(normalized, input.menus, input.schema);
    return { results: checked.valid, diagnostics: payload.diagnostics ?? { provider: this.id, menuCount: input.menus.length, batchCount: 1, latencyMs: 0, retryCount: 0 } };
  }

  async inferMenuAttributes(input: AttributeInferenceInput): Promise<AttributeInferenceResult> {
    const result = await this.inferStoreAttributes({ storeName: "single-menu", menus: [input.menu], schema: input.schema });
    return result.results[input.menu.id] ?? { estimates: {} };
  }
}
