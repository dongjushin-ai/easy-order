import { megaMgcRawStore } from "../data/megaMgcRawStore";
import type { RawStoreData } from "../types/store";
import { MEGA_MGC_CORE_ATTRIBUTES, MEGA_MGC_DATASET_VERSION, megaMgcGroundTruth, type MenuGroundTruth } from "./megaMgcGroundTruth";

export interface EvaluationDataset { id: string; version: string; store: RawStoreData; groundTruth: MenuGroundTruth[]; coreAttributes: readonly string[]; smokeMenuIds?: readonly string[]; provisionalAttributeReliability?: Record<string, "A" | "B" | "C">; }
export interface DatasetValidationResult { valid: boolean; errors: string[]; }

export function validateEvaluationDataset(dataset: EvaluationDataset): DatasetValidationResult {
  const errors: string[] = []; const storeIds = new Set(dataset.store.menus.map((menu) => menu.id));
  const schema = new Map(dataset.store.attributes.map((attribute) => [attribute.key, attribute])); const seen = new Set<string>();
  for (const item of dataset.groundTruth) {
    if (seen.has(item.menuId)) errors.push(`Duplicate ground truth menuId: ${item.menuId}`); seen.add(item.menuId);
    if (!storeIds.has(item.menuId)) errors.push(`Unknown ground truth menuId: ${item.menuId}`);
    for (const attribute of dataset.coreAttributes) {
      const range = item.numeric[attribute];
      if (!range) { errors.push(`Missing range: ${item.menuId}.${attribute}`); continue; }
      const [min, max] = range;
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 1 || min > max) errors.push(`Invalid range: ${item.menuId}.${attribute}`);
      if (schema.get(attribute)?.type !== "number") errors.push(`Unknown numeric attribute: ${attribute}`);
    }
    for (const attribute of Object.keys(item.numeric)) if (!dataset.coreAttributes.includes(attribute)) errors.push(`Unexpected evaluated attribute: ${item.menuId}.${attribute}`);
  }
  for (const menuId of storeIds) if (!seen.has(menuId)) errors.push(`Missing ground truth menuId: ${menuId}`);
  return { valid: errors.length === 0, errors };
}

export const megaMgcEvaluationDataset: EvaluationDataset = { id: "mega-mgc-20", version: MEGA_MGC_DATASET_VERSION, store: megaMgcRawStore, groundTruth: megaMgcGroundTruth, coreAttributes: MEGA_MGC_CORE_ATTRIBUTES };
