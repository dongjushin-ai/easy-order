import type { AttributeValue } from "../types/menu";
import type { AttributeDefinition, RawStoreMenu } from "../types/store";
import type { AttributeInferenceResult, ProviderAttributeEstimate, StoreInferenceResult } from "../types/enrichment";

export const ATTRIBUTE_BATCH_SIZE = 25;
export const ATTRIBUTE_REQUEST_TIMEOUT_MS = 30_000;
export const ATTRIBUTE_MAX_RETRIES = 2;

export function chunkMenus(menus: RawStoreMenu[], size = ATTRIBUTE_BATCH_SIZE): RawStoreMenu[][] {
  const chunks: RawStoreMenu[][] = [];
  for (let index = 0; index < menus.length; index += size) chunks.push(menus.slice(index, index + size));
  return chunks;
}

function validValue(value: unknown, definition: AttributeDefinition): value is AttributeValue {
  if (definition.type === "number") return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
  return typeof value === "string" && !!definition.options?.some((option) => option.value === value);
}

export function validateBatchResponse(raw: unknown, menus: RawStoreMenu[], schema: AttributeDefinition[]): { valid: Record<string, AttributeInferenceResult>; invalid: Array<{ menuId: string; attribute: string }> } {
  const valid: Record<string, AttributeInferenceResult> = {};
  const invalid: Array<{ menuId: string; attribute: string }> = [];
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { menus?: unknown }).menus)) return { valid, invalid: menus.flatMap((menu) => schema.map((definition) => ({ menuId: menu.id, attribute: definition.key }))) };
  const requestedIds = new Set(menus.map((menu) => menu.id));
  const items = (raw as { menus: unknown[] }).menus;
  const idCounts = new Map<string, number>();
  for (const item of items) {
    if (item && typeof item === "object" && typeof (item as { menuId?: unknown }).menuId === "string") {
      const id = (item as { menuId: string }).menuId;
      idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    }
  }
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as { menuId?: unknown; attributes?: unknown };
    if (typeof candidate.menuId !== "string" || !requestedIds.has(candidate.menuId) || idCounts.get(candidate.menuId) !== 1 || !candidate.attributes || typeof candidate.attributes !== "object") continue;
    const estimates: Record<string, ProviderAttributeEstimate> = {};
    for (const definition of schema) {
      const estimate = (candidate.attributes as Record<string, unknown>)[definition.key] as Record<string, unknown> | undefined;
      if (!estimate || !validValue(estimate.value, definition) || typeof estimate.confidence !== "number" || estimate.confidence < 0 || estimate.confidence > 1 || typeof estimate.evidence !== "string") {
        invalid.push({ menuId: candidate.menuId, attribute: definition.key }); continue;
      }
      estimates[definition.key] = { value: estimate.value, confidence: estimate.confidence, source: menus.find((menu) => menu.id === candidate.menuId)?.description ? "AI_FROM_DESCRIPTION" : "AI_FROM_NAME", evidence: estimate.evidence.slice(0, 240) };
    }
    valid[candidate.menuId] = { estimates };
  }
  for (const menu of menus) if (!valid[menu.id]) for (const definition of schema) invalid.push({ menuId: menu.id, attribute: definition.key });
  const uniqueInvalid = [...new Map(invalid.map((item) => [`${item.menuId}\u0000${item.attribute}`, item])).values()];
  return { valid, invalid: uniqueInvalid };
}

export function mergePartialWithFallback(production: StoreInferenceResult, fallback: StoreInferenceResult, menus: RawStoreMenu[], schema: AttributeDefinition[]): StoreInferenceResult {
  const results: Record<string, AttributeInferenceResult> = {};
  let fallbackMenuCount = 0;
  for (const menu of menus) {
    const primary = production.results[menu.id]?.estimates ?? {};
    const backup = fallback.results[menu.id]?.estimates ?? {};
    const estimates: Record<string, ProviderAttributeEstimate> = {};
    let usedFallback = false;
    for (const definition of schema) { estimates[definition.key] = primary[definition.key] ?? { ...backup[definition.key], confidence: Math.min(backup[definition.key]?.confidence ?? 0.25, 0.55), evidence: `AI 결과 검증 실패 후 fallback: ${backup[definition.key]?.evidence ?? "기본 추정"}` }; if (!primary[definition.key]) usedFallback = true; }
    if (usedFallback) fallbackMenuCount += 1;
    results[menu.id] = { estimates };
  }
  return { results, diagnostics: { ...production.diagnostics, fallbackMenuCount } };
}
