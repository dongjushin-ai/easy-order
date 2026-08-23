import type { AttributeEnrichmentProvider, AttributeInferenceInput, AttributeInferenceResult, StoreInferenceInput, StoreInferenceResult } from "../types/enrichment";
import { mergePartialWithFallback } from "./batch";

export class FallbackAttributeProvider implements AttributeEnrichmentProvider {
  readonly id: string;
  constructor(private readonly primary: AttributeEnrichmentProvider, private readonly fallback: AttributeEnrichmentProvider) { this.id = `${primary.id}+fallback:${fallback.id}`; }
  async inferMenuAttributes(input: AttributeInferenceInput): Promise<AttributeInferenceResult> {
    try { const result = await this.primary.inferMenuAttributes(input); if (Object.keys(result.estimates).length) return result; } catch { /* fallback below */ }
    const fallback = await this.fallback.inferMenuAttributes(input);
    return { estimates: Object.fromEntries(Object.entries(fallback.estimates).map(([key, estimate]) => [key, { ...estimate, confidence: Math.min(estimate.confidence, 0.55), evidence: `Production AI fallback: ${estimate.evidence ?? "rule-based estimate"}` }])) };
  }
  async inferStoreAttributes(input: StoreInferenceInput): Promise<StoreInferenceResult> {
    const fallback = this.fallback.inferStoreAttributes ? await this.fallback.inferStoreAttributes(input) : { results: {}, diagnostics: { provider: this.fallback.id, menuCount: input.menus.length, batchCount: 1, latencyMs: 0, retryCount: 0 } };
    try {
      if (!this.primary.inferStoreAttributes) throw new Error("Primary provider has no batch support");
      const primary = await this.primary.inferStoreAttributes(input);
      return mergePartialWithFallback(primary, fallback, input.menus, input.schema);
    } catch {
      return { ...fallback, results: Object.fromEntries(Object.entries(fallback.results).map(([menuId, result]) => [menuId, { estimates: Object.fromEntries(Object.entries(result.estimates).map(([key, estimate]) => [key, { ...estimate, confidence: Math.min(estimate.confidence, 0.55), evidence: `Production AI unavailable: ${estimate.evidence ?? "fallback"}` }])) }])), diagnostics: { ...fallback.diagnostics, fallbackMenuCount: input.menus.length } };
    }
  }
}
