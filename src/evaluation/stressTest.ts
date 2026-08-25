import type { EvaluationDataset } from "./dataset";
import { rangeAwareError, type AttributeEvaluationCase } from "./metrics";
import { snackAttributeSemantics } from "./attributeAudit";

export type StabilityStatus = "STABLE" | "QUESTIONABLE" | "UNRESOLVED";
export type StressReason =
  | "MODEL_CONSENSUS_WITH_GT"
  | "MODEL_CONSENSUS_AGAINST_GT"
  | "MODEL_DISAGREEMENT"
  | "LOW_ATTRIBUTE_RELIABILITY"
  | "HIGH_ATTRIBUTE_RELIABILITY"
  | "HIGH_PREDICTION_SPREAD"
  | "DESCRIPTION_VARIANCE"
  | "INPUT_VARIANCE"
  | "INSUFFICIENT_EVIDENCE";
export type AttributeTier = "A" | "B" | "C";
export interface StoredPredictionExperiment {
  model: string;
  dataset: string;
  inputMode: string;
  contextMode: string;
  metrics: {
    rangeAccuracy: number;
    cases?: AttributeEvaluationCase[];
    expectedCalibrationError?: number;
    thresholds?: Array<{ threshold: number; moderateDangerousMisses: number }>;
  };
}
export interface PredictionObservation {
  model: string;
  inputMode: string;
  contextMode: string;
  value: number;
  confidence: number;
}
export interface DistributionStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
  spread: number;
}
export interface GroundTruthStressRecord {
  datasetId: string;
  datasetVersion: string;
  menuId: string;
  attributeId: string;
  groundTruthRange: { min: number; max: number };
  attributeTier: AttributeTier;
  attributeReliability: number;
  predictions: PredictionObservation[];
  consensus: DistributionStats;
  modelCenters: Record<string, number>;
  modelDifference: number;
  modelAgreement: "HIGH" | "MEDIUM" | "LOW";
  inputRobustness: number;
  gtHitRate: number;
  medianGtDistance: number;
  meanGtDistance: number;
  averageRangeDistance: number;
  stabilityScore: number;
  status: StabilityStatus;
  reasons: StressReason[];
}
export interface StabilityConfig {
  weights: {
    predictionConsistency: number;
    modelAgreement: number;
    inputRobustness: number;
    gtAgreement: number;
    attributeReliability: number;
  };
  highModelAgreement: number;
  mediumModelAgreement: number;
  maxStableSpread: number;
  minimumGtHitRate: number;
  stableScoreThreshold: number;
  questionableScoreThreshold: number;
  consensusConflictMaxHitRate: number;
  descriptionSensitivity: number;
  inputSensitivity: number;
}
export const STABILITY_CONFIG: StabilityConfig = {
  weights: {
    predictionConsistency: 0.25,
    modelAgreement: 0.2,
    inputRobustness: 0.2,
    gtAgreement: 0.2,
    attributeReliability: 0.15,
  },
  highModelAgreement: 0.15,
  mediumModelAgreement: 0.3,
  maxStableSpread: 0.25,
  minimumGtHitRate: 0.67,
  stableScoreThreshold: 0.72,
  questionableScoreThreshold: 0.48,
  consensusConflictMaxHitRate: 0.34,
  descriptionSensitivity: 0.3,
  inputSensitivity: 0.4,
};
const round = (n: number) => Number(n.toFixed(4));
const ratio = (a: number, b: number) => (b ? a / b : 0);
const center = (xs: number[]) => distribution(xs).median;
export function distribution(values: number[]): DistributionStats {
  if (!values.length)
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      standardDeviation: 0,
      spread: 0,
    };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    mean: round(mean),
    median: round(median),
    min: sorted[0],
    max: sorted.at(-1)!,
    standardDeviation: round(
      Math.sqrt(
        values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length,
      ),
    ),
    spread: round(sorted.at(-1)! - sorted[0]),
  };
}
export function modelAgreement(diff: number, c = STABILITY_CONFIG) {
  return diff <= c.highModelAgreement
    ? ("HIGH" as const)
    : diff <= c.mediumModelAgreement
      ? ("MEDIUM" as const)
      : ("LOW" as const);
}
export function attributeTier(
  dataset: EvaluationDataset,
  attribute: string,
): AttributeTier {
  if (dataset.provisionalAttributeReliability?.[attribute])
    return dataset.provisionalAttributeReliability[attribute];
  if (dataset.version === "snack20-v1")
    return snackAttributeSemantics[attribute]?.aiSuitability ?? "C";
  return "B";
}
const reliability = (tier: AttributeTier) =>
  tier === "A" ? 1 : tier === "B" ? 0.7 : 0.4;
export function buildStressRecords(
  dataset: EvaluationDataset,
  experiments: StoredPredictionExperiment[],
  config = STABILITY_CONFIG,
): GroundTruthStressRecord[] {
  const full = experiments.filter(
    (x) => x.dataset === "full-20" && Array.isArray(x.metrics.cases),
  );
  const observations = new Map<string, PredictionObservation[]>();
  for (const e of full)
    for (const x of e.metrics.cases!) {
      const key = `${x.menuId}::${x.attribute}`;
      observations.set(key, [
        ...(observations.get(key) ?? []),
        {
          model: e.model,
          inputMode: e.inputMode,
          contextMode: e.contextMode,
          value: x.predictedValue,
          confidence: x.confidence,
        },
      ]);
    }
  const records: GroundTruthStressRecord[] = [];
  for (const gt of dataset.groundTruth)
    for (const attributeId of dataset.coreAttributes) {
      const range = gt.numeric[attributeId];
      if (!range) continue;
      const predictions =
        observations.get(`${gt.menuId}::${attributeId}`) ?? [];
      const values = predictions.map((x) => x.value).filter(Number.isFinite);
      const stats = distribution(values);
      const models = [...new Set(predictions.map((x) => x.model))];
      const modelCenters = Object.fromEntries(
        models.map((m) => [
          m,
          center(predictions.filter((x) => x.model === m).map((x) => x.value)),
        ]),
      );
      const centers = Object.values(modelCenters);
      const modelDifference =
        centers.length >= 2 ? Math.max(...centers) - Math.min(...centers) : 1;
      const agreement = modelAgreement(modelDifference, config);
      const perModelSpread = models.map(
        (m) =>
          distribution(
            predictions.filter((x) => x.model === m).map((x) => x.value),
          ).spread,
      );
      const inputRobustness = round(
        Math.max(
          0,
          1 -
            (perModelSpread.length
              ? perModelSpread.reduce((a, b) => a + b, 0) /
                perModelSpread.length
              : 1),
        ),
      );
      const hit = ratio(
        values.filter((v) => rangeAwareError(v, range[0], range[1]) === 0)
          .length,
        values.length,
      );
      const tier = attributeTier(dataset, attributeId);
      const consistency = Math.max(0, 1 - stats.spread);
      const agreementScore =
        agreement === "HIGH" ? 1 : agreement === "MEDIUM" ? 0.5 : 0;
      const score = round(
        config.weights.predictionConsistency * consistency +
          config.weights.modelAgreement * agreementScore +
          config.weights.inputRobustness * inputRobustness +
          config.weights.gtAgreement * hit +
          config.weights.attributeReliability * reliability(tier),
      );
      const reasons: StressReason[] = [];
      const sufficient = predictions.length >= 6;
      if (!sufficient) reasons.push("INSUFFICIENT_EVIDENCE");
      if (sufficient && agreement === "LOW") reasons.push("MODEL_DISAGREEMENT");
      if (sufficient && stats.spread > config.maxStableSpread)
        reasons.push("HIGH_PREDICTION_SPREAD");
      if (sufficient && inputRobustness < 1 - config.inputSensitivity)
        reasons.push("INPUT_VARIANCE");
      for (const m of models) {
        const n = predictions.find(
          (x) =>
            x.model === m &&
            x.inputMode === "name-only" &&
            x.contextMode === "batch",
        );
        const d = predictions.find(
          (x) =>
            x.model === m &&
            x.inputMode === "description" &&
            x.contextMode === "batch",
        );
        if (
          n &&
          d &&
          Math.abs(n.value - d.value) >= config.descriptionSensitivity
        ) {
          reasons.push("DESCRIPTION_VARIANCE");
          break;
        }
      }
      if (tier === "C") reasons.push("LOW_ATTRIBUTE_RELIABILITY");
      if (tier === "A") reasons.push("HIGH_ATTRIBUTE_RELIABILITY");
      if (agreement === "HIGH" && hit >= config.minimumGtHitRate)
        reasons.push("MODEL_CONSENSUS_WITH_GT");
      if (
        agreement === "HIGH" &&
        stats.spread <= config.maxStableSpread &&
        hit <= config.consensusConflictMaxHitRate
      )
        reasons.push("MODEL_CONSENSUS_AGAINST_GT");
      let status: StabilityStatus =
        score >= config.stableScoreThreshold &&
        tier !== "C" &&
        hit >= config.minimumGtHitRate &&
        stats.spread <= config.maxStableSpread
          ? "STABLE"
          : score >= config.questionableScoreThreshold &&
              !(
                tier === "C" &&
                (agreement === "LOW" ||
                  inputRobustness < 1 - config.inputSensitivity ||
                  hit <= config.consensusConflictMaxHitRate)
              )
            ? "QUESTIONABLE"
            : "UNRESOLVED";
      if (predictions.length < 6) status = "UNRESOLVED";
      records.push({
        datasetId: dataset.id,
        datasetVersion: dataset.version,
        menuId: gt.menuId,
        attributeId,
        groundTruthRange: { min: range[0], max: range[1] },
        attributeTier: tier,
        attributeReliability: reliability(tier),
        predictions,
        consensus: stats,
        modelCenters,
        modelDifference: round(modelDifference),
        modelAgreement: agreement,
        inputRobustness,
        gtHitRate: round(hit),
        medianGtDistance: round(
          rangeAwareError(stats.median, range[0], range[1]),
        ),
        meanGtDistance: round(rangeAwareError(stats.mean, range[0], range[1])),
        averageRangeDistance: round(
          ratio(
            values.reduce(
              (s, v) => s + rangeAwareError(v, range[0], range[1]),
              0,
            ),
            values.length,
          ),
        ),
        stabilityScore: score,
        status,
        reasons: [...new Set(reasons)],
      });
    }
  return records;
}
export function summarizeStress(
  records: GroundTruthStressRecord[],
  experiments: StoredPredictionExperiment[],
  config = STABILITY_CONFIG,
) {
  const count = (s: StabilityStatus) =>
    records.filter((r) => r.status === s).length;
  const baseline = experiments.filter(
    (e) =>
      e.dataset === "full-20" &&
      e.inputMode === "description" &&
      e.contextMode === "batch" &&
      e.metrics.cases,
  );
  const modelMetrics = baseline.map((e) => {
    const stableKeys = new Set(
      records
        .filter((r) => r.status === "STABLE")
        .map((r) => `${r.menuId}::${r.attributeId}`),
    );
    const cases = e.metrics.cases!;
    const stable = cases.filter((c) =>
      stableKeys.has(`${c.menuId}::${c.attribute}`),
    );
    const statusAccuracy = Object.fromEntries(
      (["STABLE", "QUESTIONABLE", "UNRESOLVED"] as const).map((s) => {
        const keys = new Set(
          records
            .filter((r) => r.status === s)
            .map((r) => `${r.menuId}::${r.attributeId}`),
        );
        const xs = cases.filter((c) => keys.has(`${c.menuId}::${c.attribute}`));
        return [s, ratio(xs.filter((x) => x.correct).length, xs.length)];
      }),
    );
    return {
      model: e.model,
      allAccuracy: ratio(cases.filter((x) => x.correct).length, cases.length),
      stableAccuracy: ratio(
        stable.filter((x) => x.correct).length,
        stable.length,
      ),
      statusAccuracy,
    };
  });
  const attributes = Object.fromEntries(
    [...new Set(records.map((r) => r.attributeId))].map((a) => {
      const xs = records.filter((r) => r.attributeId === a),
        stable = xs.filter((r) => r.status === "STABLE");
      return [
        a,
        {
          tier: xs[0].attributeTier,
          stable: stable.length,
          questionable: xs.filter((r) => r.status === "QUESTIONABLE").length,
          unresolved: xs.filter((r) => r.status === "UNRESOLVED").length,
          coverage: ratio(stable.length, xs.length),
          stableAccuracy: ratio(
            stable.reduce((s, r) => s + r.gtHitRate, 0),
            stable.length,
          ),
          automationSuitability:
            xs[0].attributeTier === "A" && stable.length / xs.length >= 0.7
              ? "AUTOMATION_READY"
              : xs[0].attributeTier !== "C" && stable.length / xs.length >= 0.35
                ? "HUMAN_REVIEW_RECOMMENDED"
                : "NOT_READY",
        },
      ];
    }),
  );
  const tradeoff = [0.5, 0.6, 0.7, 0.8, 0.9].map((threshold) => {
    const xs = records.filter((r) => r.stabilityScore >= threshold);
    return {
      threshold,
      coverage: ratio(xs.length, records.length),
      gtHitRate: ratio(
        xs.reduce((s, r) => s + r.gtHitRate, 0),
        xs.length,
      ),
    };
  });
  return {
    total: records.length,
    classification: {
      stable: count("STABLE"),
      questionable: count("QUESTIONABLE"),
      unresolved: count("UNRESOLVED"),
    },
    stableCoverage: ratio(count("STABLE"), records.length),
    modelMetrics,
    attributes,
    tradeoff,
    consensusGtConflicts: records.filter((r) =>
      r.reasons.includes("MODEL_CONSENSUS_AGAINST_GT"),
    ),
    modelDisagreements: records.filter((r) =>
      r.reasons.includes("MODEL_DISAGREEMENT"),
    ),
    inputSensitive: records.filter((r) => r.reasons.includes("INPUT_VARIANCE")),
    descriptionSensitive: records.filter((r) =>
      r.reasons.includes("DESCRIPTION_VARIANCE"),
    ),
    humanReviewQueue: records
      .filter((r) => r.status !== "STABLE")
      .map((r) => ({
        menuId: r.menuId,
        attributeId: r.attributeId,
        status: r.status,
        reasons: r.reasons,
      })),
    config,
    limitation:
      "Provisionally Stable / Automatically Stress-tested / Pending Human Validation",
  };
}
