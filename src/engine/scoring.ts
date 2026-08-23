import type { StoreMenu } from "../types/menu";
import type { NormalizedUserAnswer } from "../types/input";
import type { ScoredAttribute } from "../types/question";

export type PreferenceVector = Partial<Record<ScoredAttribute, number>>;

export function applyNormalizedAnswer(
  preferences: PreferenceVector,
  answer: NormalizedUserAnswer,
): PreferenceVector {
  if (answer.needsClarification || answer.confidence < 0.6) return preferences;

  const next = { ...preferences };
  for (const [attribute, value] of Object.entries(answer.attributeValues)) {
    if (attribute !== "temperature" && typeof value === "number") {
      next[attribute as ScoredAttribute] = value;
    }
  }
  return next;
}

// 복잡한 추천 로직을 추가하기 전 사용할 단순 가중합 점수 함수다.
export function calculateScore(menu: StoreMenu, preferences: PreferenceVector): number {
  return Object.entries(preferences).reduce((score, [attribute, weight]) => {
    const value = menu.attributes[attribute as ScoredAttribute];
    return score + (typeof value === "number" ? value * (weight ?? 0) : 0);
  }, 0);
}
