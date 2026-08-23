import { generateQuestions } from "../engine/questionGenerator";
import type { EnrichedStoreData } from "../types/enrichment";

export interface ReviewRequiredAttribute {
  menuId: string;
  menuName: string;
  attribute: string;
  confidence: number;
  source: string;
  evidence?: string;
  reviewPriority: number;
}

function attributeVariance(store: EnrichedStoreData, key: string): number {
  const values = store.menus.map((menu) => menu.attributes[key]).filter((value): value is number => typeof value === "number");
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}

export function getReviewRequiredAttributes(store: EnrichedStoreData): ReviewRequiredAttribute[] {
  const generatedAttributes = new Set(generateQuestions(store.menus.map((menu) => ({ ...menu })), store.attributes).flatMap((question) => question.attributes));
  return store.menus.flatMap((menu) => Object.entries(menu.attributeMetadata)
    .filter(([, metadata]) => metadata.needsReview)
    .map(([attribute, metadata]) => ({
      menuId: menu.id,
      menuName: menu.name,
      attribute,
      confidence: metadata.confidence,
      source: metadata.source,
      evidence: metadata.evidence,
      reviewPriority: (1 - metadata.confidence) * 100
        + (generatedAttributes.has(attribute) ? 20 : 0)
        + Math.min(20, attributeVariance(store, attribute) * 80)
        + (metadata.source === "DEFAULT" ? 20 : metadata.source === "AI_FROM_NAME" ? 10 : 0),
    })),
  ).sort((a, b) => b.reviewPriority - a.reviewPriority || a.confidence - b.confidence);
}

export function getReviewQueue(store: EnrichedStoreData) {
  const items = getReviewRequiredAttributes(store);
  return [...new Set(items.map((item) => item.menuId))].map((menuId) => ({
    menu: store.menus.find((menu) => menu.id === menuId)!,
    items: items.filter((item) => item.menuId === menuId),
    priority: Math.max(...items.filter((item) => item.menuId === menuId).map((item) => item.reviewPriority)),
  })).sort((a, b) => b.priority - a.priority);
}
