import { megaMgcRawStore } from "../data/megaMgcRawStore";
import { loadStoreData } from "../data/storeLoader";
import type { RawStoreData } from "../types/store";
import { MockAttributeProvider } from "./MockAttributeProvider";
import { REVIEW_THRESHOLD, applyOwnerOverride, confirmOwnerEstimate, enrichStoreData, reenrichStoreData, toFinalStoreData } from "./enrichment";
import { getReviewQueue, getReviewRequiredAttributes } from "./review";
import { getReviewChoices } from "../owner/reviewControls";
import { validateFinalStore } from "../owner/validation";
import { clearOwnerReview, hydrateOwnerReview, ownerReviewStorageKey, saveOwnerReview } from "../owner/persistence";
import { chunkMenus, mergePartialWithFallback, validateBatchResponse } from "./batch";
import { createServerAttributeProvider } from "../../server/providerFactory";

function check(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Enrichment assertion failed: ${message}`); }

export async function runEnrichmentTests(): Promise<void> {
  console.log("\n[Attribute enrichment]");
  const provider = new MockAttributeProvider();
  const baseSchema: RawStoreData["attributes"] = [
    { key: "temperature", label: "온도", type: "category", options: [{ value: "hot", label: "따뜻함" }, { value: "cold", label: "차가움" }, { value: "both", label: "둘 다" }] },
    ...["coffee", "sweetness", "milk", "caffeine", "refreshing", "creamy", "fruity"].map((key) => ({ key, label: key, type: "number" as const })),
    { key: "aroma", label: "향", type: "number" },
  ];
  const simple: RawStoreData = { storeId: "simple", storeName: "Simple", attributes: baseSchema, menus: [
    { id: "name-only", name: "바닐라라떼", price: 4000 },
    { id: "described", name: "저당 바닐라라떼", price: 4200, description: "일반 바닐라라떼보다 시럽을 절반만 사용한 덜 단 메뉴" },
    { id: "owner", name: "점주 지정 음료", price: 3000, attributes: { sweetness: 0.12 } },
  ] };
  const enriched = await enrichStoreData(simple, provider);
  const nameOnly = enriched.menus.find((menu) => menu.id === "name-only")!;
  const described = enriched.menus.find((menu) => menu.id === "described")!;
  const owner = enriched.menus.find((menu) => menu.id === "owner")!;
  check(nameOnly.attributeMetadata.sweetness.source === "AI_FROM_NAME", "name-only source");
  check(Number(described.attributes.sweetness) < Number(nameOnly.attributes.sweetness), "description lowers sweetness");
  check(described.attributeMetadata.sweetness.source === "OWNER_DESCRIPTION" && described.attributeMetadata.sweetness.confidence > nameOnly.attributeMetadata.sweetness.confidence, "description source and confidence");
  check(owner.attributes.sweetness === 0.12 && owner.attributeMetadata.sweetness.source === "OWNER_EXPLICIT" && owner.attributeMetadata.sweetness.confidence === 1, "owner explicit priority");
  check(owner.attributeMetadata.aroma.needsReview && owner.attributeMetadata.aroma.confidence < REVIEW_THRESHOLD, "review threshold");
  check(typeof nameOnly.attributeMetadata.sweetness.relative?.percentile === "number", "relative percentile");
  check(getReviewRequiredAttributes(enriched).some((item) => item.menuId === "owner"), "review query");

  const overridden = applyOwnerOverride(enriched, "name-only", "sweetness", 0.2);
  const overriddenMenu = overridden.menus.find((menu) => menu.id === "name-only")!;
  check(overriddenMenu.attributes.sweetness === 0.2 && overriddenMenu.attributeMetadata.sweetness.source === "OWNER_EXPLICIT", "owner override");
  const finalized = loadStoreData(toFinalStoreData(overridden));
  check(finalized.questions.length > 0, "question generator connection");

  const snackRaw: RawStoreData = { storeId: "custom-snack", storeName: "Custom Snack", attributes: [
    { key: "spiciness", label: "매운맛", type: "number" }, { key: "fried", label: "튀김", type: "number" }, { key: "hearty", label: "든든함", type: "number" }, { key: "broth", label: "국물", type: "number" },
  ], menus: [
    { id: "hot-tteokbokki", name: "매운 떡볶이", price: 4500 }, { id: "fried", name: "모둠튀김", price: 5000 }, { id: "ramyeon", name: "라면", price: 4500 }, { id: "gimbap", name: "김밥", price: 3500 },
  ] };
  const snack = await enrichStoreData(snackRaw, provider);
  check(Number(snack.menus[0].attributes.spiciness) >= 0.9, "custom spiciness");
  check(Number(snack.menus[1].attributes.fried) >= 0.9, "custom fried");
  check(Number(snack.menus[2].attributes.broth) >= 0.9, "custom broth");
  check(Object.keys(snack.menus[0].attributes).every((key) => snackRaw.attributes.some((definition) => definition.key === key)), "schema-only output");

  const mega = await enrichStoreData(megaMgcRawStore, provider);
  const megaBatch = await provider.inferStoreAttributes!({ storeName: megaMgcRawStore.storeName, menus: megaMgcRawStore.menus, schema: megaMgcRawStore.attributes });
  check(megaBatch.diagnostics.menuCount === 20 && megaBatch.diagnostics.batchCount === 1, "Mega batch inference");
  check(chunkMenus(Array.from({ length: 50 }, (_, index) => ({ id: `menu-${index}`, name: `Menu ${index}`, price: 1000 }))).length === 2, "batch chunking");
  const menu = (id: string) => mega.menus.find((item) => item.id === id)!;
  check(Number(menu("americano").attributes.coffee) >= 0.9 && Number(menu("americano").attributes.sweetness) <= 0.1 && Number(menu("americano").attributes.milk) <= 0.1, "americano profile");
  check(Number(menu("vanilla-latte").attributes.coffee) >= 0.6 && Number(menu("vanilla-latte").attributes.milk) >= 0.8 && Number(menu("vanilla-latte").attributes.creamy) >= 0.8 && Number(menu("vanilla-latte").attributes.sweetness) >= 0.7, "vanilla latte profile");
  check(Number(menu("lemonade").attributes.coffee) <= 0.1 && Number(menu("lemonade").attributes.milk) <= 0.1 && Number(menu("lemonade").attributes.refreshing) >= 0.8 && Number(menu("lemonade").attributes.fruity) >= 0.8, "lemonade profile");
  check(Number(menu("sweet-potato-latte").attributes.coffee) <= 0.1 && Number(menu("sweet-potato-latte").attributes.milk) >= 0.8 && Number(menu("sweet-potato-latte").attributes.creamy) >= 0.8 && Number(menu("sweet-potato-latte").attributes.sweetness) >= 0.7, "sweet potato latte profile");
  check(Number(menu("low-sugar-vanilla-latte").attributes.sweetness) < Number(menu("vanilla-latte").attributes.sweetness), "low-sugar description comparison");
  check(loadStoreData(toFinalStoreData(mega)).questions.length > 0, "Mega question generation");
  const megaQueue = getReviewQueue(mega);
  check(megaQueue.length > 0 && megaQueue.some((entry) => entry.menu.id === "signature-blend"), "Mega needsReview queue");
  const firstReview = megaQueue[0].items[0];
  const confirmed = confirmOwnerEstimate(mega, firstReview.menuId, firstReview.attribute);
  const confirmedMetadata = confirmed.menus.find((item) => item.id === firstReview.menuId)!.attributeMetadata[firstReview.attribute];
  check(confirmedMetadata.confirmedByOwner && confirmedMetadata.confidence === 1 && !confirmedMetadata.needsReview, "owner confirm");
  const validation = validateFinalStore(mega);
  check(validation.valid && validation.unresolvedCount > 0 && validation.warnings.length > 0, "unresolved export warning");
  check(validation.questionCount > 0, "final store recommendation connection");
  let fullyReviewed = mega;
  for (const item of getReviewRequiredAttributes(fullyReviewed)) fullyReviewed = confirmOwnerEstimate(fullyReviewed, item.menuId, item.attribute);
  check(getReviewRequiredAttributes(fullyReviewed).length === 0 && validateFinalStore(fullyReviewed).unresolvedCount === 0, "review completion state");
  const spicyDefinition = snackRaw.attributes.find((item) => item.key === "spiciness")!;
  spicyDefinition.reviewChoices = [{ label: "안 매움", value: 0 }, { label: "매우 매움", value: 1 }];
  check(getReviewChoices(spicyDefinition).map((choice) => choice.label).join(",") === "안 매움,매우 매움", "custom schema controls");
  const persisted = new Map<string, string>();
  const memoryStorage = { getItem: (key: string) => persisted.get(key) ?? null, setItem: (key: string, value: string) => { persisted.set(key, value); }, removeItem: (key: string) => { persisted.delete(key); } };
  check(saveOwnerReview(memoryStorage, confirmed), "persistence save");
  check(hydrateOwnerReview(memoryStorage, confirmed.storeId)?.menus.length === confirmed.menus.length, "persistence hydrate");
  persisted.set(ownerReviewStorageKey(confirmed.storeId), "{broken-json");
  check(hydrateOwnerReview(memoryStorage, confirmed.storeId) === null, "corrupt persistence ignored");
  check(clearOwnerReview(memoryStorage, confirmed.storeId), "persistence clear");

  const overriddenBeforeRerun = applyOwnerOverride(mega, "signature-blend", "sweetness", 0.2);
  const rerun = await reenrichStoreData(megaMgcRawStore, overriddenBeforeRerun, provider);
  const rerunSweetness = rerun.menus.find((item) => item.id === "signature-blend")!;
  check(rerunSweetness.attributes.sweetness === 0.2 && rerunSweetness.attributeMetadata.sweetness.source === "OWNER_EXPLICIT", "owner explicit preserved on rerun");

  const rawPartial = { menus: [{ menuId: "a", attributes: { score: { value: 0.8, confidence: 0.9, evidence: "valid" } } }, { menuId: "b", attributes: { score: { value: 2, confidence: 0.9, evidence: "invalid range" } } }] };
  const partialMenus = [{ id: "a", name: "A", price: 1 }, { id: "b", name: "B", price: 1 }];
  const partialSchema = [{ key: "score", label: "Score", type: "number" as const }];
  const checkedPartial = validateBatchResponse(rawPartial, partialMenus, partialSchema);
  check(checkedPartial.valid.a.estimates.score.value === 0.8 && checkedPartial.invalid.some((item) => item.menuId === "b"), "partial runtime validation");
  const fallbackResult = await provider.inferStoreAttributes!({ storeName: "partial", menus: partialMenus, schema: partialSchema });
  const merged = mergePartialWithFallback({ results: checkedPartial.valid, diagnostics: { provider: "production", menuCount: 2, batchCount: 1, latencyMs: 1, retryCount: 0 } }, fallbackResult, partialMenus, partialSchema);
  check(merged.results.a.estimates.score.value === 0.8 && merged.results.b.estimates.score.confidence <= 0.55, "partial fallback");
  check(createServerAttributeProvider({ ATTRIBUTE_PROVIDER: "mock" }).id === provider.id, "provider factory default mock");
  check(createServerAttributeProvider({ ATTRIBUTE_PROVIDER: "openai", OPENAI_API_KEY: "test", OPENAI_ATTRIBUTE_MODEL: "test-model" }).id.includes("fallback"), "provider factory production selection");
  console.log(`- persistence/batch/partial fallback/factory/OWNER_EXPLICIT 보존/메가 ${mega.menus.length}개 메뉴 통과`);
}
