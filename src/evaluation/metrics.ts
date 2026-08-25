import type { EnrichedStoreData } from "../types/enrichment";
import type { MenuGroundTruth } from "./megaMgcGroundTruth";

export const REVIEW_THRESHOLDS = [.4, .5, .6, .7, .8] as const;
export const DANGEROUS_ERROR_DISTANCE = .2;
export const SEVERE_ERROR_DISTANCE = .35;
export const CRITICAL_ERROR_DISTANCE = .5;

export interface AttributeEvaluationCase { menuId: string; attribute: string; predictedValue: number; expectedMin: number; expectedMax: number; confidence: number; providerNeedsReview: boolean; correct: boolean; rangeDistance: number; midpointError: number; }
export interface AttributeMetrics { attribute: string; sampleCount: number; correctCount: number; rangeAccuracy: number; meanRangeError: number; meanConfidence: number; }
export interface DangerousMiss extends AttributeEvaluationCase { severity: "moderate" | "severe" | "critical"; simulatedNeedsReview: boolean; }
export interface ThresholdMetrics { threshold: number; reviewCount: number; errorReviewRecall: number; dangerousErrorReviewRecall: number; unnecessaryReviewRate: number; autoApprovalRate: number; autoApprovalAccuracy: number; moderateDangerousMisses: number; severeDangerousMisses: number; criticalDangerousMisses: number; dangerousMisses: DangerousMiss[]; }
export interface EvaluationMetrics {
  evaluatedAttributes: number; rangeAccuracy: number; meanRangeError: number; midpointMae: number; strictProfileAccuracy: number; profileSuccessAt80: number; meanProfileAttributeAccuracy: number;
  /** @deprecated Alias retained for historical report readers. */ menuProfileAccuracy: number;
  temperatureAccuracy: number; averageConfidence: number; expectedCalibrationError: number; attributeMetrics: AttributeMetrics[]; thresholds: ThresholdMetrics[];
  calibration: Array<{ bucket: string; count: number; accuracy: number; meanConfidence: number; overconfidenceGap: number }>;
  largestErrors: AttributeEvaluationCase[]; highConfidenceErrors: AttributeEvaluationCase[]; cases: AttributeEvaluationCase[];
}

const ratio = (a: number, b: number) => b ? a / b : 0;
const round = (value: number) => Number(value.toFixed(4));
export function isWithinRange(value: unknown, min: number, max: number): value is number { return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max; }
export function rangeAwareError(value: unknown, min: number, max: number): number { if (typeof value !== "number" || !Number.isFinite(value)) return 1; return value < min ? min - value : value > max ? value - max : 0; }

export function evaluateEnrichment(store: EnrichedStoreData, truth: MenuGroundTruth[]): EvaluationMetrics {
  const cases: AttributeEvaluationCase[] = []; const profileRates: number[] = []; let temperatureCorrect = 0; let temperatureTotal = 0;
  for (const expected of truth) {
    const menu = store.menus.find((item) => item.id === expected.menuId); if (!menu) continue; let profileCorrect = 0;
    for (const [attribute, [min, max]] of Object.entries(expected.numeric)) {
      const rawValue = menu.attributes[attribute]; const value = typeof rawValue === "number" ? rawValue : Number.NaN; const correct = isWithinRange(value, min, max); if (correct) profileCorrect += 1;
      cases.push({ menuId: expected.menuId, attribute, predictedValue: value, expectedMin: min, expectedMax: max, confidence: menu.attributeMetadata[attribute]?.confidence ?? 0, providerNeedsReview: menu.attributeMetadata[attribute]?.needsReview ?? true, correct, rangeDistance: rangeAwareError(value, min, max), midpointError: Number.isFinite(value) ? Math.abs(value - (min + max) / 2) : 1 });
    }
    profileRates.push(ratio(profileCorrect, Object.keys(expected.numeric).length));
    if (expected.temperature.length > 0) { temperatureTotal += 1; if (expected.temperature.includes(String(menu.attributes.temperature))) temperatureCorrect += 1; }
  }
  const incorrect = cases.filter((item) => !item.correct); const dangerous = cases.filter((item) => item.rangeDistance >= DANGEROUS_ERROR_DISTANCE);
  const thresholds = REVIEW_THRESHOLDS.map((threshold): ThresholdMetrics => {
    const reviewed = cases.filter((item) => item.confidence < threshold); const auto = cases.filter((item) => item.confidence >= threshold);
    const misses: DangerousMiss[] = dangerous.filter((item) => item.confidence >= threshold).map((item) => ({ ...item, simulatedNeedsReview: false, severity: item.rangeDistance >= CRITICAL_ERROR_DISTANCE ? "critical" : item.rangeDistance >= SEVERE_ERROR_DISTANCE ? "severe" : "moderate" }));
    return { threshold, reviewCount: reviewed.length, errorReviewRecall: round(ratio(reviewed.filter((item) => !item.correct).length, incorrect.length)), dangerousErrorReviewRecall: round(ratio(reviewed.filter((item) => item.rangeDistance >= DANGEROUS_ERROR_DISTANCE).length, dangerous.length)), unnecessaryReviewRate: round(ratio(reviewed.filter((item) => item.correct).length, reviewed.length)), autoApprovalRate: round(ratio(auto.length, cases.length)), autoApprovalAccuracy: round(ratio(auto.filter((item) => item.correct).length, auto.length)), moderateDangerousMisses: misses.length, severeDangerousMisses: misses.filter((item) => item.rangeDistance >= SEVERE_ERROR_DISTANCE).length, criticalDangerousMisses: misses.filter((item) => item.rangeDistance >= CRITICAL_ERROR_DISTANCE).length, dangerousMisses: misses };
  });
  const bucketRanges = [[0, .4], [.4, .6], [.6, .8], [.8, 1.000001]] as const;
  const calibration = bucketRanges.map(([min, max]) => { const values = cases.filter((item) => item.confidence >= min && item.confidence < max); const accuracy = ratio(values.filter((item) => item.correct).length, values.length); const meanConfidence = ratio(values.reduce((sum, item) => sum + item.confidence, 0), values.length); return { bucket: `[${min},${max > 1 ? 1 : max})`, count: values.length, accuracy: round(accuracy), meanConfidence: round(meanConfidence), overconfidenceGap: round(meanConfidence - accuracy) }; });
  const attributeMetrics = [...new Set(cases.map((item) => item.attribute))].map((attribute) => { const values = cases.filter((item) => item.attribute === attribute); return { attribute, sampleCount: values.length, correctCount: values.filter((item) => item.correct).length, rangeAccuracy: round(ratio(values.filter((item) => item.correct).length, values.length)), meanRangeError: round(ratio(values.reduce((sum, item) => sum + item.rangeDistance, 0), values.length)), meanConfidence: round(ratio(values.reduce((sum, item) => sum + item.confidence, 0), values.length)) }; });
  const strict = round(ratio(profileRates.filter((rate) => rate === 1).length, profileRates.length));
  return { evaluatedAttributes: cases.length, rangeAccuracy: round(ratio(cases.filter((item) => item.correct).length, cases.length)), meanRangeError: round(ratio(cases.reduce((sum, item) => sum + item.rangeDistance, 0), cases.length)), midpointMae: round(ratio(cases.reduce((sum, item) => sum + item.midpointError, 0), cases.length)), strictProfileAccuracy: strict, profileSuccessAt80: round(ratio(profileRates.filter((rate) => rate >= .8).length, profileRates.length)), meanProfileAttributeAccuracy: round(ratio(profileRates.reduce((sum, rate) => sum + rate, 0), profileRates.length)), menuProfileAccuracy: strict, temperatureAccuracy: round(ratio(temperatureCorrect, temperatureTotal)), averageConfidence: round(ratio(cases.reduce((sum, item) => sum + item.confidence, 0), cases.length)), expectedCalibrationError: round(calibration.reduce((sum, bucket) => sum + Math.abs(bucket.overconfidenceGap) * ratio(bucket.count, cases.length), 0)), attributeMetrics, thresholds, calibration, largestErrors: [...incorrect].sort((a, b) => b.rangeDistance - a.rangeDistance).slice(0, 10), highConfidenceErrors: incorrect.filter((item) => item.confidence >= .8).sort((a, b) => b.confidence - a.confidence || b.rangeDistance - a.rangeDistance).slice(0, 10), cases };
}
