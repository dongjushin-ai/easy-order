import type { Question, ScoredAttribute } from "../types/question";

function neutralOption() {
  return { id: "neutral", label: "상관없어요", attributeValues: {} };
}

function binaryQuestion(id: string, text: string, attribute: ScoredAttribute, lowLabel: string, highLabel: string): Question {
  return {
    id,
    text,
    attributes: [attribute],
    options: [
      { id: "low", label: lowLabel, attributeValues: { [attribute]: 0 } },
      { id: "high", label: highLabel, attributeValues: { [attribute]: 1 } },
      neutralOption(),
    ],
  };
}

export const questions: Question[] = [
  {
    id: "temperature",
    text: "따뜻한 게 좋으세요, 시원한 게 좋으세요?",
    attributes: ["temperature"],
    options: [
      { id: "cold", label: "시원하게", attributeValues: { temperature: "cold" } },
      { id: "hot", label: "따뜻하게", attributeValues: { temperature: "hot" } },
      neutralOption(),
    ],
  },
  binaryQuestion("coffee", "커피 음료를 원하시나요?", "coffee", "커피 말고", "커피로"),
  {
    id: "sweetness",
    text: "단맛은 어느 정도가 좋으세요?",
    attributes: ["sweetness"],
    options: [
      { id: "low", label: "안 달게", attributeValues: { sweetness: 0 } },
      { id: "medium", label: "조금 달게", attributeValues: { sweetness: 0.5 } },
      { id: "high", label: "달콤하게", attributeValues: { sweetness: 1 } },
      neutralOption(),
    ],
  },
  binaryQuestion("milk", "우유가 들어간 음료가 좋으신가요?", "milk", "아니요", "네"),
  binaryQuestion("caffeine", "카페인이 필요하신가요?", "caffeine", "아니요", "네"),
  binaryQuestion("refreshing", "상쾌한 음료를 원하시나요?", "refreshing", "아니요", "네"),
  binaryQuestion("creamy", "부드럽고 크리미한 맛을 원하시나요?", "creamy", "아니요", "네"),
  binaryQuestion("fruity", "과일 풍미를 원하시나요?", "fruity", "아니요", "네"),
];
