import { inputAliases } from "../data/inputAliases";
import type { InputSource, NormalizedUserAnswer } from "../types/input";
import type { Question } from "../types/question";

export const PARSER_CONFIDENCE_THRESHOLD = 0.6;

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[.,!?~…]/g, " ").replace(/\s+/g, " ").trim();
}

function result(
  question: Question,
  rawInput: string,
  source: InputSource,
  optionId: string | null,
  confidence: number,
  needsClarification: boolean,
): NormalizedUserAnswer {
  const option = question.options.find((candidate) => candidate.id === optionId);
  return {
    questionId: question.id,
    optionId: option?.id ?? null,
    attributeValues: option?.attributeValues ?? {},
    source,
    confidence,
    needsClarification,
    rawInput,
  };
}

export function parseTextAnswer(
  question: Question,
  rawInput: string,
  source: "text" | "voice" = "text",
): NormalizedUserAnswer {
  const text = normalizeText(rawInput);
  if (!text) return result(question, rawInput, source, null, 0, true);

  const relevantAliases = [
    ...inputAliases.filter((entry) => entry.questionId === "*" || entry.questionId === question.id),
    ...question.options
      .filter((option) => option.aliases?.length)
      .map((option) => ({ questionId: question.id, optionId: option.id, aliases: option.aliases ?? [] })),
  ];
  const explicitNeutral = relevantAliases
    .filter((entry) => entry.optionId === "neutral")
    .some((entry) => entry.aliases.some((alias) => text.includes(alias)));

  if (explicitNeutral) return result(question, rawInput, source, "neutral", 0.95, false);

  const matches = relevantAliases
    .filter((entry) => entry.optionId !== "neutral")
    .flatMap((entry) => entry.aliases
      .filter((alias) => text.includes(alias))
      .map((alias) => ({ optionId: entry.optionId, alias })),
    );

  if (matches.length === 0) return result(question, rawInput, source, null, 0.1, true);

  const longestLength = Math.max(...matches.map((match) => match.alias.length));
  const strongest = matches.filter((match) => match.alias.length === longestLength);
  const allOptions = new Set(matches.map((match) => match.optionId));
  const strongestOptions = new Set(strongest.map((match) => match.optionId));

  if (question.id === "temperature" && allOptions.has("cold") && allOptions.has("hot")) {
    return result(question, rawInput, source, "neutral", 0.75, false);
  }
  if (strongestOptions.size !== 1 || allOptions.size > 1 && longestLength <= 4) {
    return result(question, rawInput, source, null, 0.35, true);
  }

  return result(question, rawInput, source, strongest[0].optionId, 0.9, false);
}

export function parseVoiceAnswer(question: Question, sttResult: string): NormalizedUserAnswer {
  return parseTextAnswer(question, sttResult, "voice");
}
