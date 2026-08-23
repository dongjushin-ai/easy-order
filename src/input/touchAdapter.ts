import type { NormalizedUserAnswer } from "../types/input";
import type { Question } from "../types/question";

export function adaptTouchAnswer(question: Question, selectedOptionId: string): NormalizedUserAnswer {
  const option = question.options.find((candidate) => candidate.id === selectedOptionId);
  if (!option) throw new Error(`Question ${question.id} has no option ${selectedOptionId}`);

  return {
    questionId: question.id,
    optionId: option.id,
    attributeValues: option.attributeValues,
    source: "touch",
    confidence: 1,
    needsClarification: false,
  };
}
