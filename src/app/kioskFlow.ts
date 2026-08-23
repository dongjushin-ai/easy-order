import { adaptTouchAnswer } from "../input";
import { applyNormalizedAnswer, calculateScore, type PreferenceVector } from "../engine/scoring";
import { partitionCandidates, selectNextQuestion } from "../engine/selector";
import type { StoreMenu } from "../types/menu";
import type { UserAnswer } from "../types/question";
import type { StoreCatalog } from "../types/store";

export interface FlowSnapshot {
  candidates: StoreMenu[];
  preferences: PreferenceVector;
  nextQuestion: ReturnType<typeof selectNextQuestion>;
}

export function replayAnswers(store: StoreCatalog, history: UserAnswer[]): FlowSnapshot {
  let candidates = [...store.menus];
  let preferences: PreferenceVector = {};
  const accepted: UserAnswer[] = [];

  for (const answer of history) {
    const question = store.questions.find((item) => item.id === answer.questionId);
    if (!question) continue;
    const normalized = adaptTouchAnswer(question, answer.optionId);
    preferences = applyNormalizedAnswer(preferences, normalized);
    const branch = partitionCandidates(candidates, question).get(answer.optionId);
    if (branch?.length) candidates = branch;
    accepted.push(answer);
  }

  return {
    candidates,
    preferences,
    nextQuestion: selectNextQuestion(candidates, store.questions, { answers: accepted }, { targetCandidateCount: 3 }),
  };
}

export function getRecommendations(store: StoreCatalog, history: UserAnswer[]) {
  const snapshot = replayAnswers(store, history);
  return snapshot.candidates
    .map((menu) => ({ menu, score: calculateScore(menu, snapshot.preferences) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function getRecommendationReason(store: StoreCatalog, menu: StoreMenu, history: UserAnswer[]): string {
  const matches = history.flatMap((answer) => {
    const question = store.questions.find((item) => item.id === answer.questionId);
    const option = question?.options.find((item) => item.id === answer.optionId);
    if (!question || !option || option.id === "neutral") return [];
    const attribute = question.attributes[0];
    return menu.attributes[attribute] === undefined ? [] : [option.label];
  });
  return matches.length ? `${matches.slice(0, 2).join(", ")} 선택을 반영했어요.` : "현재 남은 메뉴 중 잘 맞는 메뉴예요.";
}

export function getFeatureSummary(store: StoreCatalog, menu: StoreMenu): string {
  return store.attributeDefinitions
    .filter((definition) => typeof menu.attributes[definition.key] === "number" && Number(menu.attributes[definition.key]) >= 0.7)
    .slice(0, 3)
    .map((definition) => definition.label)
    .join(" · ");
}
