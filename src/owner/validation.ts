import { loadStoreData } from "../data/storeLoader";
import { getReviewRequiredAttributes } from "../enrichment/review";
import { toFinalStoreData } from "../enrichment/enrichment";
import type { EnrichedStoreData } from "../types/enrichment";

export interface ValidationResult { valid: boolean; errors: string[]; warnings: string[]; unresolvedCount: number; questionCount: number; }

export function validateFinalStore(store: EnrichedStoreData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  const schemaKeys = new Set(store.attributes.map((item) => item.key));
  for (const menu of store.menus) {
    if (ids.has(menu.id)) errors.push(`중복 메뉴 ID: ${menu.id}`);
    ids.add(menu.id);
    if (!menu.id || !menu.name.trim() || !Number.isFinite(menu.price) || menu.price < 0) errors.push(`메뉴 기본 정보 오류: ${menu.id}`);
    for (const key of Object.keys(menu.attributes)) if (!schemaKeys.has(key)) errors.push(`${menu.name}: 스키마에 없는 속성 ${key}`);
    for (const definition of store.attributes) {
      const value = menu.attributes[definition.key];
      if (definition.type === "number" && (typeof value !== "number" || value < 0 || value > 1)) errors.push(`${menu.name}.${definition.key}: 0~1 범위 오류`);
      if (definition.type === "category" && !definition.options?.some((option) => option.value === value)) errors.push(`${menu.name}.${definition.key}: 허용되지 않은 범주`);
    }
  }
  const unresolvedCount = getReviewRequiredAttributes(store).length;
  if (unresolvedCount) warnings.push(`확인이 필요한 속성이 ${unresolvedCount}개 남아 있습니다.`);
  let questionCount = 0;
  try { questionCount = loadStoreData(toFinalStoreData(store)).questions.length; }
  catch (error) { errors.push(error instanceof Error ? error.message : "Store Loader validation 실패"); }
  if (!questionCount) warnings.push("현재 데이터 분포로 생성 가능한 추천 질문이 없습니다.");
  return { valid: errors.length === 0, errors, warnings, unresolvedCount, questionCount };
}
