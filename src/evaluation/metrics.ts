import type { EnrichedStoreData } from "../types/enrichment";
import type { MenuGroundTruth } from "./megaMgcGroundTruth";

export const REVIEW_THRESHOLDS = [.4, .5, .6, .7, .8] as const;
export const DANGEROUS_ERROR_DISTANCE = .2;

interface AttributeCase { menuId: string; attribute: string; value: number; confidence: number; correct: boolean; rangeError: number; midpointError: number; }
export interface ThresholdMetrics { threshold: number; reviewCount: number; reviewRecall: number; unnecessaryReviewRate: number; autoApprovalRate: number; dangerousMisses: number; }
export interface EvaluationMetrics {
  evaluatedAttributes: number; rangeAccuracy: number; meanRangeError: number; midpointMae: number; menuProfileAccuracy: number;
  temperatureAccuracy: number; thresholds: ThresholdMetrics[];
  calibration: Array<{ bucket: string; count: number; accuracy: number; meanConfidence: number }>;
  largestErrors: AttributeCase[]; highConfidenceErrors: AttributeCase[];
}

const ratio = (a: number, b: number) => b ? a / b : 0;
const round = (value: number) => Number(value.toFixed(4));

export function evaluateEnrichment(store: EnrichedStoreData, truth: MenuGroundTruth[]): EvaluationMetrics {
  const cases: AttributeCase[] = [];
  let correctProfiles = 0; let temperatureCorrect = 0; let temperatureTotal = 0;
  for (const expected of truth) {
    const menu = store.menus.find((item) => item.id === expected.menuId);
    if (!menu) continue;
    let profileCorrect = true;
    for (const [attribute, [min, max]] of Object.entries(expected.numeric)) {
      const value = Number(menu.attributes[attribute]); const confidence = menu.attributeMetadata[attribute]?.confidence ?? 0;
      const rangeError = value < min ? min - value : value > max ? value - max : 0;
      const entry = { menuId: expected.menuId, attribute, value, confidence, correct: rangeError === 0, rangeError, midpointError: Math.abs(value - (min + max) / 2) };
      cases.push(entry); if (!entry.correct) profileCorrect = false;
    }
    if (profileCorrect) correctProfiles += 1;
    const temperature = String(menu.attributes.temperature);
    temperatureTotal += 1; if (expected.temperature.includes(temperature)) temperatureCorrect += 1;
  }
  const incorrect = cases.filter((item) => !item.correct);
  const thresholds = REVIEW_THRESHOLDS.map((threshold) => {
    const reviewed = cases.filter((item) => item.confidence < threshold);
    const caught = reviewed.filter((item) => !item.correct).length;
    return { threshold, reviewCount: reviewed.length, reviewRecall: round(ratio(caught, incorrect.length)), unnecessaryReviewRate: round(ratio(reviewed.length - caught, reviewed.length)), autoApprovalRate: round(ratio(cases.length - reviewed.length, cases.length)), dangerousMisses: cases.filter((item) => item.rangeError >= DANGEROUS_ERROR_DISTANCE && item.confidence >= threshold).length };
  });
  const buckets = [[0, .4], [.4, .6], [.6, .8], [.8, 1.000001]] as const;
  return {
    evaluatedAttributes: cases.length,
    rangeAccuracy: round(ratio(cases.filter((item) => item.correct).length, cases.length)),
    meanRangeError: round(ratio(cases.reduce((sum, item) => sum + item.rangeError, 0), cases.length)),
    midpointMae: round(ratio(cases.reduce((sum, item) => sum + item.midpointError, 0), cases.length)),
    menuProfileAccuracy: round(ratio(correctProfiles, truth.length)), temperatureAccuracy: round(ratio(temperatureCorrect, temperatureTotal)), thresholds,
    calibration: buckets.map(([min, max]) => { const values = cases.filter((item) => item.confidence >= min && item.confidence < max); return { bucket: `[${min},${max > 1 ? 1 : max})`, count: values.length, accuracy: round(ratio(values.filter((item) => item.correct).length, values.length)), meanConfidence: round(ratio(values.reduce((sum, item) => sum + item.confidence, 0), values.length)) }; }),
    largestErrors: [...cases].sort((a, b) => b.rangeError - a.rangeError).slice(0, 10),
    highConfidenceErrors: incorrect.filter((item) => item.confidence >= .7).sort((a, b) => b.confidence - a.confidence || b.rangeError - a.rangeError).slice(0, 10),
  };
}
