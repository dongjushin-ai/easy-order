import { createInitialState, kioskReducer } from "../app/kioskReducer";
import {
  calculateConfiguredUnitPrice,
  isOptionGroupVisible,
  selectedOrderOptions,
} from "../app/orderOptions";
import { ownerDemoStores } from "../data/ownerDemoStores";
import { loadStoreData } from "../data/storeLoader";
import { stores } from "../data/stores";
import { calculateScore, type PreferenceVector } from "../engine/scoring";
import { selectNextQuestion } from "../engine/selector";
import { enrichStoreData } from "../enrichment/enrichment";
import { MockAttributeProvider } from "../enrichment/MockAttributeProvider";
import type { StoreMenu } from "../types/menu";
import { validateEvaluationDataset } from "./dataset";
import { evaluateEnrichment } from "./metrics";
import { evaluationDatasets, getEvaluationDataset } from "./registry";
import {
  FAST_FOOD_CORE_ATTRIBUTES,
  fastFoodRawStore,
  fastFoodStoreDataset,
} from "./fastFoodDataset";
function check(x: unknown, m: string): asserts x {
  if (!x) throw new Error(`FastFood dataset: ${m}`);
}
const top3 = (menus: StoreMenu[], p: PreferenceVector) =>
  [...menus]
    .sort((a, b) => calculateScore(b, p) - calculateScore(a, p))
    .slice(0, 3)
    .map((x) => x.id);
export async function runFastFoodDatasetTests() {
  console.log("\n[Fast food cross-domain dataset]");
  const validation = validateEvaluationDataset(fastFoodStoreDataset);
  check(validation.valid, validation.errors.join(", "));
  check(
    fastFoodStoreDataset.store.menus.length === 20 &&
      fastFoodStoreDataset.groundTruth.length === 20 &&
      FAST_FOOD_CORE_ATTRIBUTES.length === 8,
    "20x8 dataset",
  );
  const catalog = loadStoreData(fastFoodRawStore);
  check(
    catalog.questions.length >= 6 &&
      !catalog.questions.some(
        (q) =>
          q.attributes.includes("coffee") || q.attributes.includes("sweetness"),
      ),
    "schema-driven questions without leakage",
  );
  const scenarios: Array<[string, PreferenceVector, string[]]> = [
    [
      "meaty-cheesy-hearty",
      { meaty: 1, cheesy: 1, hearty: 1 },
      ["double-cheese-burger"],
    ],
    [
      "spicy-crispy",
      { spiciness: 1, crispy: 1 },
      ["spicy-chicken-burger", "spicy-chicken"],
    ],
    [
      "light-fresh",
      { hearty: -1, fresh: 1, greasy: -1 },
      ["garden-salad", "chicken-salad"],
    ],
    [
      "fried-crispy-light",
      { fried: 1, crispy: 1, hearty: -1 },
      ["fries", "onion-rings"],
    ],
    [
      "meaty-mild-less-greasy",
      { meaty: 1, spiciness: -1, greasy: -1 },
      ["classic-burger", "bulgogi-burger"],
    ],
    [
      "cheesy-fried",
      { cheesy: 1, fried: 1 },
      ["cheese-fries", "cheese-sticks"],
    ],
  ];
  for (const [name, p, expected] of scenarios) {
    const ranked = top3(catalog.menus, p);
    check(
      ranked.some((x) => expected.includes(x)),
      `${name}: ${ranked}`,
    );
    console.log(`- ${name}: ${ranked.join(", ")}`);
  }
  const wrong: Array<[PreferenceVector, string[]]> = [
    [{ meaty: 1, cheesy: 1, hearty: 1, fresh: 1 }, ["double-cheese-burger"]],
    [
      { spiciness: 1, crispy: 1, fried: -0.4 },
      ["spicy-chicken-burger", "spicy-chicken"],
    ],
    [
      { fresh: 1, hearty: -1, greasy: -1, meaty: 1 },
      ["garden-salad", "chicken-salad"],
    ],
  ];
  for (const [p, target] of wrong)
    check(
      top3(catalog.menus, p).some((x) => target.includes(x)),
      "wrong-answer tolerance",
    );
  const first = selectNextQuestion(catalog.menus, catalog.questions, {
    answers: [],
  });
  check(first, "dynamic first question");
  const answer = first.question.options.find((x) => x.id !== "neutral")!;
  const second = selectNextQuestion(
    first.branches.get(answer.id)!,
    catalog.questions,
    { answers: [{ questionId: first.question.id, optionId: answer.id }] },
  );
  check(
    !second || second.question.id !== first.question.id,
    "dynamic order updates",
  );
  const groups = catalog.orderOptionGroups;
  const side = groups.find((x) => x.id === "side")!;
  check(
    !isOptionGroupVisible(side, { meal: "single" }) &&
      isOptionGroupVisible(side, { meal: "set" }),
    "conditional options",
  );
  const burger = catalog.menus.find((x) => x.id === "classic-burger")!;
  const opts = selectedOrderOptions(
    groups.filter((g) => burger.optionGroupIds?.includes(g.id)),
    {
      meal: "set",
      side: "fries",
      drink: "zero-cola",
      "extra-cheese": "add",
      "extra-patty": "add",
      dining: "here",
    },
  );
  check(
    calculateConfiguredUnitPrice(burger.price, opts) === 9500,
    "5000 + 2500 + 500 + 1500 pricing",
  );
  let state = kioskReducer(createInitialState(catalog.storeId), {
    type: "SELECT_MENU",
    menuId: burger.id,
  });
  state = kioskReducer(state, {
    type: "ADD_TO_CART",
    item: {
      id: "single",
      menuId: burger.id,
      name: burger.name,
      basePrice: burger.price,
      quantity: 1,
      options: [],
      unitPrice: burger.price,
    },
  });
  state = kioskReducer(state, { type: "SELECT_MENU", menuId: burger.id });
  state = kioskReducer(state, {
    type: "ADD_TO_CART",
    item: {
      id: "set",
      menuId: burger.id,
      name: burger.name,
      basePrice: burger.price,
      quantity: 1,
      options: opts,
      unitPrice: 9500,
    },
  });
  check(state.cart.length === 2, "same menu different options remain separate");
  const enriched = await enrichStoreData(
    fastFoodRawStore,
    new MockAttributeProvider(),
  );
  const metrics = evaluateEnrichment(
    enriched,
    fastFoodStoreDataset.groundTruth,
  );
  check(
    metrics.evaluatedAttributes === 160 &&
      metrics.attributeMetrics.length === 8,
    "offline metric pipeline",
  );
  check(
    ownerDemoStores.some((s) => s.storeId === "fast-food-store") &&
      stores.some((s) => s.storeId === "fast-food-store"),
    "owner/kiosk integration",
  );
  check(
    evaluationDatasets.length === 3 &&
      getEvaluationDataset("fastfood20-v1") === fastFoodStoreDataset,
    "registry",
  );
  for (const dataset of evaluationDatasets) check(validateEvaluationDataset(dataset).valid, `${dataset.version} registry validation`);
  for (const loaded of stores) {
    check(loaded.questions.length > 0 && selectNextQuestion(loaded.menus, loaded.questions, { answers: [] }), `${loaded.storeId} common flow`);
    const schema = new Set(loaded.attributeDefinitions.map((a) => a.key));
    check(loaded.questions.every((q) => q.attributes.every((a) => schema.has(a))), `${loaded.storeId} schema leakage`);
    if (loaded.storeId !== "cafe") check(!schema.has("coffee"), `${loaded.storeId} must not inherit cafe attributes`);
  }
  console.log(
    `- questions=${catalog.questions.length}, first=${first.question.id}, second=${second?.question.id ?? "stop"}, mock accuracy=${metrics.rangeAccuracy}`,
  );
}
