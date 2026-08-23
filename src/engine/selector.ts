import type { StoreMenu } from "../types/menu";
import type { Question, QuestionOption, UserState } from "../types/question";

export interface QuestionEvaluation {
  question: Question;
  informationGain: number;
  expectedRemaining: number;
  branches: Map<string, StoreMenu[]>;
}

export interface SelectorOptions {
  targetCandidateCount?: number;
}

function distance(menu: StoreMenu, question: Question, option: QuestionOption): number {
  return question.attributes.reduce((sum, attribute) => {
    const target = option.attributeValues[attribute];
    if (target === undefined) return sum;
    const actual = menu.attributes[attribute];
    if (typeof actual === "number" && typeof target === "number") {
      const difference = actual - target;
      return sum + difference * difference;
    }
    if (attribute === "temperature" && actual === "both") return sum + 0.5;
    return sum + (actual === target ? 0 : 1);
  }, 0);
}

export function partitionCandidates(
  candidates: StoreMenu[],
  question: Question,
): Map<string, StoreMenu[]> {
  const activeOptions = question.options.filter((option) =>
    question.attributes.some((attribute) => option.attributeValues[attribute] !== undefined),
  );
  const branches = new Map(activeOptions.map((option) => [option.id, [] as StoreMenu[]]));

  for (const menu of candidates) {
    const bestOption = activeOptions.reduce((best, option) =>
      distance(menu, question, option) < distance(menu, question, best) ? option : best,
    );
    branches.get(bestOption.id)?.push(menu);
  }

  return branches;
}

export function evaluateQuestion(candidates: StoreMenu[], question: Question): QuestionEvaluation {
  const branches = partitionCandidates(candidates, question);
  const total = candidates.length;
  let entropy = 0;
  let expectedRemaining = 0;

  for (const branch of branches.values()) {
    if (branch.length === 0 || total === 0) continue;
    const probability = branch.length / total;
    entropy -= probability * Math.log2(probability);
    expectedRemaining += probability * branch.length;
  }

  return { question, informationGain: entropy, expectedRemaining, branches };
}

export function selectNextQuestion(
  candidates: StoreMenu[],
  questions: Question[],
  userState: UserState,
  options: SelectorOptions = {},
): QuestionEvaluation | null {
  const targetCandidateCount = options.targetCandidateCount ?? 3;
  if (candidates.length <= targetCandidateCount) return null;

  const answeredIds = new Set(userState.answers.map((answer) => answer.questionId));
  const evaluations = questions
    .filter((question) => !answeredIds.has(question.id))
    .map((question) => evaluateQuestion(candidates, question))
    .filter((evaluation) => evaluation.branches.size > 1 && evaluation.informationGain > 0);

  if (evaluations.length === 0) return null;

  return evaluations.sort((a, b) =>
    b.informationGain - a.informationGain || a.expectedRemaining - b.expectedRemaining,
  )[0];
}
