import { evaluateQuestion } from "./selector";
import type { StoreMenu } from "../types/menu";
import type { Question, QuestionOption } from "../types/question";
import type { AttributeDefinition } from "../types/store";

function optionId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "");
}

function numericOptions(definition: AttributeDefinition): QuestionOption[] {
  return [
    { id: "low", label: definition.lowLabel ?? `${definition.label} 낮게`, attributeValues: { [definition.key]: 0 } },
    { id: "high", label: definition.highLabel ?? `${definition.label} 높게`, attributeValues: { [definition.key]: 1 } },
    { id: "neutral", label: "상관없어요", attributeValues: {} },
  ];
}

function categoryOptions(definition: AttributeDefinition, menus: StoreMenu[]): QuestionOption[] {
  const values = [...new Set(menus.map((menu) => menu.attributes[definition.key]))];
  return [
    ...values.map((value) => {
      const configured = definition.options?.find((option) => option.value === value);
      return {
        id: optionId(String(value)),
        label: configured?.label ?? String(value),
        attributeValues: { [definition.key]: value },
        aliases: configured?.aliases,
      };
    }),
    { id: "neutral", label: "상관없어요", attributeValues: {} },
  ];
}

export function generateQuestions(
  menus: StoreMenu[],
  definitions: AttributeDefinition[],
): Question[] {
  return definitions
    .map((definition) => ({
      id: `attribute:${definition.key}`,
      text: definition.question ?? `${definition.label}을(를) 선호하시나요?`,
      attributes: [definition.key],
      options: definition.type === "number"
        ? numericOptions(definition)
        : categoryOptions(definition, menus),
    }))
    .map((question) => ({ question, evaluation: evaluateQuestion(menus, question) }))
    .filter(({ evaluation }) => evaluation.informationGain > 0)
    .sort((a, b) => b.evaluation.informationGain - a.evaluation.informationGain)
    .map(({ question }) => question);
}
