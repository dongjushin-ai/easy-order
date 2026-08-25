import type { AttributeEvaluationCase } from "./metrics";
import type { AttributeRiskPolicy, ReviewMode } from "./riskPolicy";
import type { GroundTruthStressRecord } from "./stressTest";

export const POLICY_THRESHOLDS = [
  0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95,
] as const;
export const GLOBAL_THRESHOLDS = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9] as const;
export type PolicyEvidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export interface SafetyConstraints {
  criticalMiss?: number;
  severeMiss?: number;
  minimumAutoApprovalAccuracy?: number;
  minimumAutoApprovalCount?: number;
}
export interface PolicyMetrics {
  reviewCount: number;
  reviewRate: number;
  autoApprovalCount: number;
  autoApprovalRate: number;
  autoApprovalAccuracy: number;
  incorrectAutoApprovals: number;
  moderateMiss: number;
  severeMiss: number;
  criticalMiss: number;
  reviewEfficiency: number;
  tierReviewCount: Record<string, number>;
  attributeReviewCount: Record<string, number>;
}
export interface PolicyCandidate {
  policies: AttributeRiskPolicy[];
  metrics: PolicyMetrics;
  stabilityAware: boolean;
  signature: string;
}
export interface OptimizedPresets {
  safetyFirst: PolicyCandidate;
  balanced: PolicyCandidate;
  automationFirst: PolicyCandidate;
}
const tiers: Record<string, string> = {
  fried: "A",
  broth: "A",
  cheesy: "A",
  spiciness: "B",
  crispy: "B",
  hearty: "C",
  sweetness: "C",
  chewy: "C",
};
const key = (c: AttributeEvaluationCase) => `${c.menuId}::${c.attribute}`;
export function policyOptions(attributeId: string): AttributeRiskPolicy[] {
  const tier = tiers[attributeId] ?? "C";
  const confidence = POLICY_THRESHOLDS.map((minimumConfidence) => ({
    attributeId,
    automationSuitability:
      tier === "A"
        ? "AUTOMATION_READY"
        : tier === "B"
          ? "HUMAN_REVIEW_RECOMMENDED"
          : "NOT_READY",
    reviewMode: "CONFIDENCE_REVIEW" as const,
    minimumConfidence,
    provisional: true as const,
  }));
  return tier === "A"
    ? ([
        {
          attributeId,
          automationSuitability: "AUTOMATION_READY",
          reviewMode: "AUTO_ALLOWED",
          provisional: true,
        },
        ...confidence,
      ] as AttributeRiskPolicy[])
    : ([
        ...confidence,
        {
          attributeId,
          automationSuitability:
            tier === "B" ? "HUMAN_REVIEW_RECOMMENDED" : "NOT_READY",
          reviewMode: "ALWAYS_REVIEW",
          provisional: true,
        },
      ] as AttributeRiskPolicy[]);
}
export function evaluatePolicy(
  cases: AttributeEvaluationCase[],
  policies: AttributeRiskPolicy[],
  stableKeys?: Set<string>,
): PolicyMetrics {
  const map = new Map(policies.map((p) => [p.attributeId, p]));
  const reviewed = cases.filter((c) => {
    if (stableKeys && !stableKeys.has(key(c))) return true;
    const p = map.get(c.attribute);
    return (
      !p ||
      p.reviewMode === "ALWAYS_REVIEW" ||
      (p.reviewMode === "CONFIDENCE_REVIEW" &&
        c.confidence < (p.minimumConfidence ?? 1))
    );
  });
  const auto = cases.filter((c) => !reviewed.includes(c));
  const incorrect = auto.filter((c) => !c.correct);
  const caught = reviewed.filter((c) => !c.correct).length;
  const attr = Object.fromEntries(
    [...new Set(cases.map((c) => c.attribute))].map((a) => [
      a,
      reviewed.filter((c) => c.attribute === a).length,
    ]),
  );
  return {
    reviewCount: reviewed.length,
    reviewRate: reviewed.length / cases.length,
    autoApprovalCount: auto.length,
    autoApprovalRate: auto.length / cases.length,
    autoApprovalAccuracy: auto.length
      ? auto.filter((c) => c.correct).length / auto.length
      : 1,
    incorrectAutoApprovals: incorrect.length,
    moderateMiss: incorrect.filter((c) => c.rangeDistance >= 0.2).length,
    severeMiss: incorrect.filter((c) => c.rangeDistance >= 0.35).length,
    criticalMiss: incorrect.filter((c) => c.rangeDistance >= 0.5).length,
    reviewEfficiency: reviewed.length ? caught / reviewed.length : 0,
    tierReviewCount: Object.fromEntries(
      ["A", "B", "C"].map((t) => [
        t,
        reviewed.filter((c) => tiers[c.attribute] === t).length,
      ]),
    ),
    attributeReviewCount: attr,
  };
}
const sig = (ps: AttributeRiskPolicy[]) =>
  ps
    .map(
      (p) => `${p.attributeId}:${p.reviewMode}:${p.minimumConfidence ?? "-"}`,
    )
    .join("|");
export function satisfies(m: PolicyMetrics, c: SafetyConstraints) {
  return (
    (c.criticalMiss === undefined || m.criticalMiss <= c.criticalMiss) &&
    (c.severeMiss === undefined || m.severeMiss <= c.severeMiss) &&
    (c.minimumAutoApprovalAccuracy === undefined ||
      m.autoApprovalAccuracy >= c.minimumAutoApprovalAccuracy) &&
    (c.minimumAutoApprovalCount === undefined ||
      m.autoApprovalCount >= c.minimumAutoApprovalCount)
  );
}
export function dominates(a: PolicyMetrics, b: PolicyMetrics) {
  return (
    a.reviewCount <= b.reviewCount &&
    a.criticalMiss <= b.criticalMiss &&
    a.severeMiss <= b.severeMiss &&
    a.moderateMiss <= b.moderateMiss &&
    a.autoApprovalAccuracy >= b.autoApprovalAccuracy &&
    (a.reviewCount < b.reviewCount ||
      a.criticalMiss < b.criticalMiss ||
      a.severeMiss < b.severeMiss ||
      a.moderateMiss < b.moderateMiss ||
      a.autoApprovalAccuracy > b.autoApprovalAccuracy)
  );
}
export function paretoFrontier(xs: PolicyCandidate[]) {
  return xs.filter(
    (x, i) => !xs.some((y, j) => i !== j && dominates(y.metrics, x.metrics)),
  );
}
const balancedScore = (m: PolicyMetrics) =>
  m.criticalMiss * 1e6 +
  m.severeMiss * 1e5 +
  m.moderateMiss * 1e3 +
  m.incorrectAutoApprovals * 100 +
  m.reviewCount;
export function selectPresets(candidates: PolicyCandidate[]): OptimizedPresets {
  const maximumAuto = Math.max(0, ...candidates.map((x) => x.metrics.autoApprovalCount));
  const minimumAuto = Math.min(20, maximumAuto);
  const viable = candidates.filter((x) => x.metrics.autoApprovalCount >= minimumAuto);
  const constrained = viable.filter((x) =>
    satisfies(x.metrics, {
      criticalMiss: 0,
      severeMiss: 0,
      minimumAutoApprovalAccuracy: 0.9,
    }),
  );
  const pool = constrained.length ? constrained : viable;
  const safetyFirst = [...pool].sort(
    (a, b) =>
      a.metrics.criticalMiss - b.metrics.criticalMiss ||
      a.metrics.severeMiss - b.metrics.severeMiss ||
      a.metrics.moderateMiss - b.metrics.moderateMiss ||
      b.metrics.autoApprovalAccuracy - a.metrics.autoApprovalAccuracy ||
      a.metrics.reviewCount - b.metrics.reviewCount,
  )[0];
  const balanced = [...viable].sort(
    (a, b) => balancedScore(a.metrics) - balancedScore(b.metrics),
  )[0];
  const automationFirst = [...pool].sort(
    (a, b) =>
      a.metrics.reviewCount - b.metrics.reviewCount ||
      a.metrics.moderateMiss - b.metrics.moderateMiss ||
      b.metrics.autoApprovalAccuracy - a.metrics.autoApprovalAccuracy,
  )[0];
  return { safetyFirst, balanced, automationFirst };
}
export function searchPolicies(
  cases: AttributeEvaluationCase[],
  attributes: string[],
  stableKeys?: Set<string>,
  beamSize = 4000,
) {
  let partial: AttributeRiskPolicy[][] = [[]];
  let evaluated = 0;
  for (const attribute of attributes) {
    const next: PolicyCandidate[] = [];
    for (const p of partial)
      for (const option of policyOptions(attribute)) {
        const policies = [...p, option];
        const scoped = cases.filter((c) =>
          policies.some((x) => x.attributeId === c.attribute),
        );
        next.push({
          policies,
          metrics: evaluatePolicy(scoped, policies, stableKeys),
          stabilityAware: !!stableKeys,
          signature: sig(policies),
        });
        evaluated++;
      }
    const ranked = [...next].sort(
      (a, b) =>
        balancedScore(a.metrics) - balancedScore(b.metrics) ||
        a.metrics.reviewCount - b.metrics.reviewCount,
    );
    partial = [
      ...new Map(
        ranked.slice(0, beamSize).map((x) => [x.signature, x.policies]),
      ).values(),
    ];
  }
  const candidates = partial.map((p) => ({
    policies: p,
    metrics: evaluatePolicy(cases, p, stableKeys),
    stabilityAware: !!stableKeys,
    signature: sig(p),
  }));
  return {
    evaluated,
    candidates,
    frontier: paretoFrontier(candidates),
    presets: selectPresets(candidates),
  };
}
export function globalCandidates(
  cases: AttributeEvaluationCase[],
  attributes: string[],
) {
  return GLOBAL_THRESHOLDS.map((t) => {
    const policies = attributes.map((attributeId) => ({
      attributeId,
      automationSuitability: "HUMAN_REVIEW_RECOMMENDED",
      reviewMode: "CONFIDENCE_REVIEW" as ReviewMode,
      minimumConfidence: t,
      provisional: true as const,
    })) as AttributeRiskPolicy[];
    return { threshold: t, policies, metrics: evaluatePolicy(cases, policies) };
  });
}
export function riskReductionPerReview(
  baseline: PolicyMetrics,
  target: PolicyMetrics,
) {
  const reduced = baseline.moderateMiss - target.moderateMiss;
  const added = target.reviewCount - baseline.reviewCount;
  return added > 0
    ? reduced / added
    : reduced > 0
      ? Number.POSITIVE_INFINITY
      : 0;
}
export function sharedMetrics(luna: PolicyMetrics, terra: PolicyMetrics) {
  return {
    worstCritical: Math.max(luna.criticalMiss, terra.criticalMiss),
    worstSevere: Math.max(luna.severeMiss, terra.severeMiss),
    worstModerate: Math.max(luna.moderateMiss, terra.moderateMiss),
    worstAccuracy: Math.min(
      luna.autoApprovalAccuracy,
      terra.autoApprovalAccuracy,
    ),
    totalReviews: luna.reviewCount + terra.reviewCount,
  };
}
export function policyEvidence(
  records: GroundTruthStressRecord[],
  policy: AttributeRiskPolicy,
) {
  const xs = records.filter((r) => r.attributeId === policy.attributeId);
  return xs.length < 20
    ? ("LOW" as const)
    : xs.filter((x) => x.status === "STABLE").length / xs.length >= 0.7
      ? ("MEDIUM" as const)
      : ("LOW" as const);
}
