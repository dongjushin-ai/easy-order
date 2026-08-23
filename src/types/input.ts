import type { AttributeVector } from "./menu";

export type InputSource = "touch" | "text" | "voice";

export interface NormalizedUserAnswer {
  questionId: string;
  optionId: string | null;
  attributeValues: Partial<AttributeVector>;
  source: InputSource;
  confidence: number;
  needsClarification: boolean;
  rawInput?: string;
}
