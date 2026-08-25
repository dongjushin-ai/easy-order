export const RATER_IDS = ["A", "B", "C"] as const;
export type RaterId = (typeof RATER_IDS)[number];
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type AgreementLevel = "HIGH" | "MEDIUM" | "LOW";
export type AdjudicationStatus = "UNREVIEWED" | "AGREED" | "DISAGREEMENT" | "NEEDS_ADJUDICATION" | "FINALIZED";
export type FinalReason = "HUMAN_CONSENSUS" | "DEFINITION_REFINEMENT" | "SOURCE_VERIFICATION" | "RANGE_TOO_NARROW" | "OTHER";
export interface ValueRange { min: number; max: number }
export interface GroundTruthRater { id: RaterId; displayName: string }
export interface RaterAssessment { datasetVersion: string; menuId: string; attributeId: string; raterId: RaterId; valueMin: number; valueMax: number; confidenceLevel: ConfidenceLevel; confidence: number; note?: string; updatedAt: string }
export interface AgreementMetrics { absoluteRange: ValueRange; spread: number; mean: number; median: number; standardDeviation: number; weightedMean: number; level: AgreementLevel }
export interface ReviewItem { menuId: string; menuName: string; description: string; attributeId: string; conflictTypes: string[]; existingRange: ValueRange; luna?: number; terra?: number }
export interface FinalDecision { menuId: string; attributeId: string; mode: "RETAIN" | "APPLY_PROPOSED" | "CUSTOM"; range: ValueRange; reason: FinalReason; note?: string; decidedAt: string }
export interface AdjudicationResult { item: ReviewItem; assessments: RaterAssessment[]; agreement: AgreementMetrics | null; proposedRange: ValueRange | null; status: AdjudicationStatus; decision?: FinalDecision }
