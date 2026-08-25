import type { EvaluationDataset } from "./dataset";
import { megaMgcEvaluationDataset } from "./dataset";
import { koreanSnackStoreDataset } from "./koreanSnackDataset";
import { fastFoodStoreDataset } from "./fastFoodDataset";

export const evaluationDatasets: EvaluationDataset[] = [megaMgcEvaluationDataset, koreanSnackStoreDataset, fastFoodStoreDataset];
export function getEvaluationDataset(versionOrId: string): EvaluationDataset | undefined { return evaluationDatasets.find((dataset) => dataset.version === versionOrId || dataset.id === versionOrId); }
