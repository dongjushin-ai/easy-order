import type { EnrichedStoreData } from "../types/enrichment";
import { validateFinalStore } from "./validation";

export const OWNER_REVIEW_STORAGE_VERSION = 1;
export const ownerReviewStorageKey = (storeId: string) => `easy-order-owner-review-v${OWNER_REVIEW_STORAGE_VERSION}:${storeId}`;

interface PersistedOwnerReview { version: number; storeId: string; savedAt: string; store: EnrichedStoreData; }

export function saveOwnerReview(storage: Pick<Storage, "setItem">, store: EnrichedStoreData): boolean {
  try { storage.setItem(ownerReviewStorageKey(store.storeId), JSON.stringify({ version: OWNER_REVIEW_STORAGE_VERSION, storeId: store.storeId, savedAt: new Date().toISOString(), store } satisfies PersistedOwnerReview)); return true; }
  catch { return false; }
}

export function hydrateOwnerReview(storage: Pick<Storage, "getItem">, storeId: string): EnrichedStoreData | null {
  try {
    const serialized = storage.getItem(ownerReviewStorageKey(storeId));
    if (!serialized) return null;
    const parsed = JSON.parse(serialized) as Partial<PersistedOwnerReview>;
    if (parsed.version !== OWNER_REVIEW_STORAGE_VERSION || parsed.storeId !== storeId || !parsed.store || parsed.store.storeId !== storeId) return null;
    return validateFinalStore(parsed.store).valid ? parsed.store : null;
  } catch { return null; }
}

export function clearOwnerReview(storage: Pick<Storage, "removeItem">, storeId: string): boolean {
  try { storage.removeItem(ownerReviewStorageKey(storeId)); return true; }
  catch { return false; }
}
