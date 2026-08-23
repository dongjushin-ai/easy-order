import type { AttributeVector } from "./menu";

export type ScoredAttribute = string;
export type QuestionAttribute = string;

export interface QuestionOption {
  id: string;
  label: string;
  attributeValues: Partial<AttributeVector>;
  aliases?: string[];
}

export interface Question {
  id: string;
  text: string;
  attributes: QuestionAttribute[];
  options: QuestionOption[];
}

export interface UserAnswer {
  questionId: string;
  optionId: string;
}

export interface UserState {
  answers: UserAnswer[];
}
