import { ownerDemoStores } from "../data/ownerDemoStores";
import { loadStoreData } from "../data/storeLoader";
import { stores } from "../data/stores";
import { calculateScore, type PreferenceVector } from "../engine/scoring";
import { selectNextQuestion } from "../engine/selector";
import { enrichStoreData } from "../enrichment/enrichment";
import { MockAttributeProvider } from "../enrichment/MockAttributeProvider";
import type { StoreMenu } from "../types/menu";
import { evaluateEnrichment } from "./metrics";
import { evaluationDatasets, getEvaluationDataset } from "./registry";
import { koreanSnackFinalStore, koreanSnackStoreDataset } from "./koreanSnackDataset";
import { validateEvaluationDataset } from "./dataset";

function check(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Snack dataset assertion failed: ${message}`); }
const top3 = (menus: StoreMenu[], preferences: PreferenceVector) => [...menus].sort((a, b) => calculateScore(b, preferences) - calculateScore(a, preferences)).slice(0, 3).map((menu) => menu.id);

export async function runKoreanSnackDatasetTests(): Promise<void> {
  console.log("\n[Korean snack store-agnostic dataset]");
  const validation = validateEvaluationDataset(koreanSnackStoreDataset);
  check(validation.valid, validation.errors.join(", "));
  check(koreanSnackStoreDataset.store.menus.length === 20 && koreanSnackStoreDataset.coreAttributes.length === 8, "20 menus and 8 custom attributes");
  check(koreanSnackStoreDataset.store.attributes.every((attribute) => (attribute.reviewChoices?.length ?? 0) >= 3), "schema-driven review choices");
  const catalog = loadStoreData(koreanSnackFinalStore);
  check(catalog.questions.length >= 5 && catalog.questions.some((question) => question.id === "attribute:spiciness") && catalog.questions.some((question) => question.id === "attribute:cheesy"), "schema-driven questions");

  const scenarios: Array<[string, PreferenceVector, string[]]> = [
    ["spicy-chewy-hearty", { spiciness: 1, chewy: 1, hearty: 1 }, ["spicy-tteokbokki", "tteokbokki", "rabokki", "jjolmyeon"]],
    ["mild-crispy", { spiciness: -1, fried: 1, crispy: 1 }, ["fried-set", "gimmari", "squid-fried", "vegetable-fried"]],
    ["broth-mild", { broth: 1, spiciness: -1 }, ["fishcake", "fishcake-soup", "udon"]],
    ["cheesy-hearty", { cheesy: 1, hearty: 1 }, ["cheese-tteokbokki", "cheese-gimbap"]],
    ["light-nonfried", { hearty: -1, fried: -1, broth: -1, chewy: -.5 }, ["rice-ball", "gimbap"]],
  ];
  for (const [name, preferences, expected] of scenarios) { const ranked = top3(catalog.menus, preferences); check(ranked.some((id) => expected.includes(id)), `${name}: ${ranked.join(",")}`); console.log(`- ${name}: ${ranked.join(", ")}`); }
  const contradictory = top3(catalog.menus, { spiciness: 1, cheesy: 1, hearty: 1, broth: -1 });
  check(contradictory.includes("cheese-tteokbokki"), "contradictory preference keeps target in top 3");

  const first = selectNextQuestion(catalog.menus, catalog.questions, { answers: [] });
  check(first && first.informationGain > 0, "dynamic first question");
  const option = first.question.options.find((item) => item.id !== "neutral")!;
  const branch = first.branches.get(option.id)!;
  const second = selectNextQuestion(branch, catalog.questions, { answers: [{ questionId: first.question.id, optionId: option.id }] });
  check(!second || second.question.id !== first.question.id, "question order responds to state");

  const enriched = await enrichStoreData(koreanSnackStoreDataset.store, new MockAttributeProvider());
  const metrics = evaluateEnrichment(enriched, koreanSnackStoreDataset.groundTruth);
  check(metrics.evaluatedAttributes === 160 && metrics.attributeMetrics.length === 8 && metrics.thresholds.length === 5, "offline metric pipeline");
  check(evaluationDatasets.length >= 2 && getEvaluationDataset("snack20-v1") === koreanSnackStoreDataset, "dataset registry");
  check(ownerDemoStores.some((store) => store.storeId === koreanSnackStoreDataset.id), "owner review integration");
  check(stores.some((store) => store.storeId === koreanSnackStoreDataset.id && store.menus.length === 20), "kiosk integration");
  console.log(`- questions=${catalog.questions.length}, first=${first.question.id}, second=${second?.question.id ?? "stop"}, offline range accuracy=${metrics.rangeAccuracy}`);
}
