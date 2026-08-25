import {
  koreanSnackGroundTruth,
  koreanSnackRawStore,
  KOREAN_SNACK_DATASET_VERSION,
} from "../evaluation/koreanSnackDataset";
import { snackAttributeSemantics } from "../evaluation/attributeAudit";
import type {
  AgreementLevel,
  AgreementMetrics,
  FinalDecision,
  RaterAssessment,
  ReviewItem,
  ValueRange,
} from "./types";

export const ANCHORS = [0, 0.25, 0.5, 0.75, 1] as const;
export const CONFIDENCE_WEIGHT = { HIGH: 1, MEDIUM: 0.7, LOW: 0.4 } as const;
export const AGREEMENT_THRESHOLDS = { high: 0.25, medium: 0.5 } as const;
export const TIER_C_ATTRIBUTES = ["hearty", "sweetness", "chewy"] as const;
const conflictData: Array<[string, string, string, number, number]> = [
  ["tteokbokki", "broth", "MODEL_DISAGREEMENT", 0, 0.5],
  ["spicy-tteokbokki", "broth", "MODEL_DISAGREEMENT", 0, 0.5],
  ["spicy-tteokbokki", "sweetness", "MODEL_DISAGREEMENT", 0.5, 0],
  ["rose-tteokbokki", "spiciness", "MODEL_DISAGREEMENT", 0.5, 0],
  ["rose-tteokbokki", "broth", "MODEL_DISAGREEMENT", 0, 0.5],
  [
    "rose-tteokbokki",
    "hearty",
    "MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT",
    0.5,
    0.5,
  ],
  ["rose-tteokbokki", "sweetness", "MODEL_DISAGREEMENT", 0.5, 0],
  ["rose-tteokbokki", "cheesy", "MODEL_DISAGREEMENT", 0.5, 0],
  ["cheese-tteokbokki", "broth", "MODEL_DISAGREEMENT", 0, 0.5],
  [
    "cheese-tteokbokki",
    "hearty",
    "MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT",
    0.5,
    0.5,
  ],
  ["cheese-tteokbokki", "sweetness", "MODEL_DISAGREEMENT", 0.5, 0],
  ["rabokki", "sweetness", "MODEL_DISAGREEMENT", 0.5, 0],
  ["gimbap", "hearty", "MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT", 0.5, 0.5],
  [
    "cheese-gimbap",
    "hearty",
    "MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT",
    0.5,
    0.5,
  ],
  ["cheese-gimbap", "sweetness", "MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT", 0, 0],
  ["sundae", "hearty", "MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT", 0.5, 0.5],
  [
    "vegetable-fried",
    "sweetness",
    "MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT",
    0,
    0,
  ],
  ["jjolmyeon", "hearty", "MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT", 0.5, 0.5],
  ["jjolmyeon", "sweetness", "MODEL_DISAGREEMENT", 0.5, 0],
  [
    "fried-dumplings",
    "sweetness",
    "MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT",
    0,
    0,
  ],
];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const reviewKey = (menuId: string, attributeId: string) =>
  `${menuId}::${attributeId}`;
export function buildReviewQueue(): ReviewItem[] {
  const map = new Map<string, ReviewItem>();
  const menus = new Map(koreanSnackRawStore.menus.map((m) => [m.id, m]));
  const truth = new Map(koreanSnackGroundTruth.map((g) => [g.menuId, g]));
  const add = (
    menuId: string,
    attributeId: string,
    type?: string,
    luna?: number,
    terra?: number,
  ) => {
    const menu = menus.get(menuId);
    const raw = truth.get(menuId)?.numeric[attributeId];
    if (!menu || !raw) return;
    const key = reviewKey(menuId, attributeId);
    const prior = map.get(key);
    if (prior) {
      if (type && !prior.conflictTypes.includes(type))
        prior.conflictTypes.push(type);
      if (luna !== undefined) prior.luna = luna;
      if (terra !== undefined) prior.terra = terra;
      return;
    }
    map.set(key, {
      menuId,
      menuName: menu.name,
      description: menu.description ?? "",
      attributeId,
      conflictTypes: type ? [type] : [],
      existingRange: { min: raw[0], max: raw[1] },
      luna,
      terra,
    });
  };
  for (const menu of koreanSnackRawStore.menus)
    for (const attr of TIER_C_ATTRIBUTES) add(menu.id, attr);
  for (const [m, a, t, l, u] of conflictData) add(m, a, t, l, u);
  return [...map.values()].sort(
    (a, b) =>
      b.conflictTypes.length - a.conflictTypes.length ||
      a.attributeId.localeCompare(b.attributeId) ||
      a.menuId.localeCompare(b.menuId),
  );
}
export const REVIEW_QUEUE = buildReviewQueue();
export function validateAssessment(value: unknown): value is RaterAssessment {
  if (!value || typeof value !== "object") return false;
  const a = value as RaterAssessment;
  return (
    a.datasetVersion === KOREAN_SNACK_DATASET_VERSION &&
    ["A", "B", "C"].includes(a.raterId) &&
    koreanSnackGroundTruth.some((g) => g.menuId === a.menuId && !!g.numeric[a.attributeId]) &&
    ANCHORS.includes(a.valueMin as never) &&
    ANCHORS.includes(a.valueMax as never) &&
    a.valueMin <= a.valueMax &&
    a.valueMax - a.valueMin <= 0.25 &&
    CONFIDENCE_WEIGHT[a.confidenceLevel] === a.confidence
  );
}
const midpoint = (a: RaterAssessment) => (a.valueMin + a.valueMax) / 2;
export function calculateAgreement(
  items: RaterAssessment[],
): AgreementMetrics | null {
  if (items.length !== 3) return null;
  const values = items.map(midpoint).sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / 3;
  const spread =
    Math.max(...items.map((a) => a.valueMax)) -
    Math.min(...items.map((a) => a.valueMin));
  const level: AgreementLevel =
    spread <= AGREEMENT_THRESHOLDS.high
      ? "HIGH"
      : spread <= AGREEMENT_THRESHOLDS.medium
        ? "MEDIUM"
        : "LOW";
  const weight = items.reduce((s, a) => s + a.confidence, 0);
  return {
    absoluteRange: {
      min: Math.min(...items.map((a) => a.valueMin)),
      max: Math.max(...items.map((a) => a.valueMax)),
    },
    spread,
    mean,
    median: values[1],
    standardDeviation: Math.sqrt(
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / 3,
    ),
    weightedMean:
      items.reduce((s, a) => s + midpoint(a) * a.confidence, 0) / weight,
    level,
  };
}
export function proposeRange(metrics: AgreementMetrics): ValueRange {
  if (metrics.spread === 0)
    return {
      min: clamp(Number((metrics.median - 0.1).toFixed(2))),
      max: clamp(Number((metrics.median + 0.1).toFixed(2))),
    };
  return metrics.absoluteRange;
}
export function statusFor(
  assessments: RaterAssessment[],
  decision?: FinalDecision,
) {
  if (decision) return "FINALIZED" as const;
  const agreement = calculateAgreement(assessments);
  if (!agreement) return "UNREVIEWED" as const;
  return agreement.level === "HIGH"
    ? ("AGREED" as const)
    : agreement.level === "MEDIUM"
      ? ("DISAGREEMENT" as const)
      : ("NEEDS_ADJUDICATION" as const);
}
export function semanticsFor(attributeId: string) {
  return snackAttributeSemantics[attributeId];
}
