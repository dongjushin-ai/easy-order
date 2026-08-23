import type { AttributeValue } from "../types/menu";
import type { AttributeDefinition, RawStoreData } from "../types/store";
import type { AttributeEnrichmentProvider, AttributeEstimateMetadata, EnrichedStoreData, EnrichedStoreMenu } from "../types/enrichment";

export const REVIEW_THRESHOLD = 0.6;

function normalize(value: unknown, definition: AttributeDefinition): AttributeValue | undefined {
  if (definition.type === "number") return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const category = value.trim();
  return definition.options && !definition.options.some((option) => option.value === category) ? undefined : category;
}

function addRelativeMetadata(menus: EnrichedStoreMenu[], schema: AttributeDefinition[]): void {
  for (const definition of schema.filter((item) => item.type === "number")) {
    const values = menus.map((menu) => Number(menu.attributes[definition.key])).filter(Number.isFinite).sort((a, b) => a - b);
    if (!values.length) continue;
    const middle = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
    for (const menu of menus) {
      const value = menu.attributes[definition.key];
      if (typeof value !== "number") continue;
      const belowOrEqual = values.filter((candidate) => candidate <= value).length;
      const rank = [...values].sort((a, b) => b - a).findIndex((candidate) => candidate === value) + 1;
      const metadata = menu.attributeMetadata[definition.key];
      metadata.relative = { percentile: belowOrEqual / values.length, relativeRank: rank, storeMedian: median };
      if (!metadata.supportingSources.includes("RELATIVE_NORMALIZATION")) metadata.supportingSources.push("RELATIVE_NORMALIZATION");
    }
  }
}

export async function enrichStoreData(raw: RawStoreData, provider: AttributeEnrichmentProvider): Promise<EnrichedStoreData> {
  const menus: EnrichedStoreMenu[] = [];
  const batch = provider.inferStoreAttributes ? await provider.inferStoreAttributes({ storeName: raw.storeName, menus: raw.menus, schema: raw.attributes }) : null;
  for (const menu of raw.menus) {
    const inferred = batch?.results[menu.id] ?? await provider.inferMenuAttributes({ menu, schema: raw.attributes });
    const attributes: Record<string, AttributeValue> = {};
    const attributeMetadata: Record<string, AttributeEstimateMetadata> = {};
    for (const definition of raw.attributes) {
      const ownerValue = normalize(menu.attributes?.[definition.key], definition);
      const estimate = inferred.estimates[definition.key];
      const estimatedValue = normalize(estimate?.value, definition);
      if (ownerValue !== undefined) {
        attributes[definition.key] = ownerValue;
        attributeMetadata[definition.key] = { confidence: 1, source: "OWNER_EXPLICIT", supportingSources: [], needsReview: false, evidence: "점주가 직접 입력한 값" };
      } else {
        const confidence = Math.min(1, Math.max(0, estimate?.confidence ?? 0));
        attributes[definition.key] = estimatedValue ?? (definition.type === "number" ? 0.5 : String(definition.options?.[0]?.value ?? "unknown"));
        attributeMetadata[definition.key] = { confidence, source: estimate?.source ?? "DEFAULT", supportingSources: [], needsReview: confidence < REVIEW_THRESHOLD, evidence: estimate?.evidence };
      }
    }
    menus.push({ ...menu, attributes, attributeMetadata });
  }
  addRelativeMetadata(menus, raw.attributes);
  return { ...raw, menus };
}

export async function reenrichStoreData(raw: RawStoreData, current: EnrichedStoreData, provider: AttributeEnrichmentProvider): Promise<EnrichedStoreData> {
  const menus = raw.menus.map((menu) => {
    const existing = current.menus.find((item) => item.id === menu.id);
    const ownerAttributes = existing ? Object.fromEntries(Object.entries(existing.attributeMetadata).filter(([, metadata]) => metadata.source === "OWNER_EXPLICIT").map(([key]) => [key, existing.attributes[key]])) : {};
    return { ...menu, attributes: { ...menu.attributes, ...ownerAttributes } };
  });
  return enrichStoreData({ ...raw, menus }, provider);
}

export function applyOwnerOverride(store: EnrichedStoreData, menuId: string, attributeKey: string, value: AttributeValue): EnrichedStoreData {
  const definition = store.attributes.find((item) => item.key === attributeKey);
  if (!definition) throw new Error(`Unknown attribute: ${attributeKey}`);
  const normalized = normalize(value, definition);
  if (normalized === undefined) throw new Error(`Invalid override for ${attributeKey}`);
  const menus = store.menus.map((menu) => {
    const attributeMetadata = Object.fromEntries(Object.entries(menu.attributeMetadata).map(([key, metadata]) => [key, {
      ...metadata,
      supportingSources: [...metadata.supportingSources],
      relative: metadata.relative ? { ...metadata.relative } : undefined,
    }]));
    if (menu.id !== menuId) return { ...menu, attributes: { ...menu.attributes }, attributeMetadata };
    return {
      ...menu,
      attributes: { ...menu.attributes, [attributeKey]: normalized },
      attributeMetadata: { ...attributeMetadata, [attributeKey]: { confidence: 1, source: "OWNER_EXPLICIT" as const, supportingSources: [], needsReview: false, evidence: "점주 검토 후 확정" } },
    };
  });
  addRelativeMetadata(menus, store.attributes);
  return { ...store, menus };
}

export function confirmOwnerEstimate(store: EnrichedStoreData, menuId: string, attributeKey: string): EnrichedStoreData {
  return {
    ...store,
    menus: store.menus.map((menu) => menu.id !== menuId ? menu : {
      ...menu,
      attributes: { ...menu.attributes },
      attributeMetadata: {
        ...menu.attributeMetadata,
        [attributeKey]: { ...menu.attributeMetadata[attributeKey], confidence: 1, needsReview: false, confirmedByOwner: true, evidence: "점주가 AI 추정값을 확인함" },
      },
    }),
  };
}

export function toFinalStoreData(store: EnrichedStoreData): RawStoreData {
  return { ...store, menus: store.menus.map(({ attributeMetadata: _metadata, ...menu }) => menu) };
}
