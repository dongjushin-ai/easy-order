import type { AttributeValue } from "../types/menu";
import type { AttributeDefinition } from "../types/store";

export interface ReviewChoice { label: string; value: AttributeValue; }

export function getReviewChoices(definition: AttributeDefinition): ReviewChoice[] {
  if (definition.reviewChoices?.length) return definition.reviewChoices;
  if (definition.type === "category") return definition.options?.map((option) => ({ label: option.label, value: option.value })) ?? [];
  return [
    { label: "매우 낮음", value: 0.1 },
    { label: "낮음", value: 0.3 },
    { label: "보통", value: 0.5 },
    { label: "높음", value: 0.75 },
    { label: "매우 높음", value: 0.95 },
  ];
}

export function formatAttributeValue(value: AttributeValue, definition: AttributeDefinition): string {
  if (definition.type === "category") return definition.options?.find((option) => option.value === value)?.label ?? String(value);
  const numeric = Number(value);
  return numeric <= 0.25 ? "매우 낮음" : numeric <= 0.45 ? "낮음" : numeric <= 0.65 ? "보통" : numeric <= 0.85 ? "높음" : "매우 높음";
}

export const sourceLabels: Record<string, string> = {
  OWNER_EXPLICIT: "점주가 직접 확인",
  OWNER_DESCRIPTION: "메뉴 설명에서 명확히 확인",
  MENU_METADATA: "입력된 메뉴 옵션에서 확인",
  AI_FROM_DESCRIPTION: "메뉴 설명을 보고 추정",
  AI_FROM_NAME: "메뉴 이름을 보고 추정",
  RELATIVE_NORMALIZATION: "매장 내 다른 메뉴와 비교",
  DEFAULT: "정보가 부족해 기본값 사용",
};
