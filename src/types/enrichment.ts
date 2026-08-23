import type { AttributeValue, AttributeVector } from "./menu";
import type { AttributeDefinition, RawStoreData, RawStoreMenu } from "./store";

export type AttributeEstimateSource =
  | "OWNER_EXPLICIT"
  | "OWNER_DESCRIPTION"
  | "MENU_METADATA"
  | "AI_FROM_DESCRIPTION"
  | "AI_FROM_NAME"
  | "RELATIVE_NORMALIZATION"
  | "DEFAULT";

export interface RelativeAttributeMetadata {
  percentile: number;
  relativeRank: number;
  storeMedian: number;
}

export interface AttributeEstimateMetadata {
  confidence: number;
  source: AttributeEstimateSource;
  supportingSources: AttributeEstimateSource[];
  needsReview: boolean;
  evidence?: string;
  relative?: RelativeAttributeMetadata;
  confirmedByOwner?: boolean;
}

export interface EnrichedStoreMenu extends Omit<RawStoreMenu, "attributes"> {
  attributes: AttributeVector;
  attributeMetadata: Record<string, AttributeEstimateMetadata>;
}

export interface EnrichedStoreData extends Omit<RawStoreData, "menus"> {
  menus: EnrichedStoreMenu[];
}

export interface ProviderAttributeEstimate {
  value: AttributeValue;
  confidence: number;
  source: Extract<AttributeEstimateSource, "OWNER_DESCRIPTION" | "MENU_METADATA" | "AI_FROM_DESCRIPTION" | "AI_FROM_NAME" | "DEFAULT">;
  evidence?: string;
}

export interface AttributeInferenceInput {
  menu: RawStoreMenu;
  schema: AttributeDefinition[];
}

export interface AttributeInferenceResult {
  estimates: Record<string, ProviderAttributeEstimate>;
}

export interface StoreInferenceInput {
  storeName: string;
  menus: RawStoreMenu[];
  schema: AttributeDefinition[];
}

export interface ProviderDiagnostics {
  provider: string;
  model?: string;
  menuCount: number;
  batchCount: number;
  latencyMs: number;
  retryCount: number;
  inputTokens?: number;
  outputTokens?: number;
  fallbackMenuCount?: number;
  validationErrorCount?: number;
}

export interface StoreInferenceResult {
  results: Record<string, AttributeInferenceResult>;
  diagnostics: ProviderDiagnostics;
}

export interface AttributeEnrichmentProvider {
  readonly id: string;
  inferMenuAttributes(input: AttributeInferenceInput): Promise<AttributeInferenceResult>;
  inferStoreAttributes?(input: StoreInferenceInput): Promise<StoreInferenceResult>;
}
