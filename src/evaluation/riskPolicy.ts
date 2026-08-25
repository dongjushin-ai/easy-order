import type { AttributeEvaluationCase } from "./metrics";
export type AutomationSuitability =
  | "AUTOMATION_READY"
  | "HUMAN_REVIEW_RECOMMENDED"
  | "NOT_READY";
export type ReviewMode = "AUTO_ALLOWED" | "CONFIDENCE_REVIEW" | "ALWAYS_REVIEW";
export interface AttributeRiskPolicy {
  attributeId: string;
  automationSuitability: AutomationSuitability;
  reviewMode: ReviewMode;
  minimumConfidence?: number;
  provisional: true;
}
export const snackAttributeRiskPolicies: AttributeRiskPolicy[] = [
  ...["fried", "broth", "cheesy"].map(
    (attributeId) =>
      ({
        attributeId,
        automationSuitability: "AUTOMATION_READY",
        reviewMode: "AUTO_ALLOWED",
        provisional: true,
      }) as AttributeRiskPolicy,
  ),
  ...["spiciness", "crispy"].map(
    (attributeId) =>
      ({
        attributeId,
        automationSuitability: "HUMAN_REVIEW_RECOMMENDED",
        reviewMode: "CONFIDENCE_REVIEW",
        minimumConfidence: 0.8,
        provisional: true,
      }) as AttributeRiskPolicy,
  ),
  ...["hearty", "sweetness", "chewy"].map(
    (attributeId) =>
      ({
        attributeId,
        automationSuitability: "NOT_READY",
        reviewMode: "ALWAYS_REVIEW",
        provisional: true,
      }) as AttributeRiskPolicy,
  ),
];
export function simulateRiskPolicy(
  cases: AttributeEvaluationCase[],
  policies: AttributeRiskPolicy[],
  globalThreshold?: number,
) {
  const map = new Map(policies.map((x) => [x.attributeId, x]));
  const reviewed = cases.filter((c) =>
    globalThreshold !== undefined
      ? c.confidence < globalThreshold
      : map.get(c.attribute)?.reviewMode === "ALWAYS_REVIEW" ||
        (map.get(c.attribute)?.reviewMode === "CONFIDENCE_REVIEW" &&
          c.confidence < (map.get(c.attribute)?.minimumConfidence ?? 1)),
  );
  const auto = cases.filter((c) => !reviewed.includes(c));
  const dangerous = auto.filter((c) => c.rangeDistance >= 0.2);
  const tier = (a: string) =>
    ["fried", "broth", "cheesy"].includes(a)
      ? "A"
      : ["spiciness", "crispy"].includes(a)
        ? "B"
        : "C";
  return {
    reviewCount: reviewed.length,
    autoApprovalRate: auto.length / cases.length,
    autoApprovalAccuracy: auto.length
      ? auto.filter((c) => c.correct).length / auto.length
      : 0,
    dangerousMiss: dangerous.length,
    tierReviewBurden: Object.fromEntries(
      ["A", "B", "C"].map((t) => {
        const xs = cases.filter((c) => tier(c.attribute) === t);
        return [
          t,
          {
            reviewCount: reviewed.filter((c) => tier(c.attribute) === t).length,
            total: xs.length,
            rate: xs.length
              ? reviewed.filter((c) => tier(c.attribute) === t).length /
                xs.length
              : 0,
          },
        ];
      }),
    ),
  };
}
