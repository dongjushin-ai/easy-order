import { menus } from "./data/menus";
import { questions } from "./data/questions";
import { loadStoreData } from "./data/storeLoader";
import { stores } from "./data/stores";
import { createInitialState, kioskReducer } from "./app/kioskReducer";
import { replayAnswers } from "./app/kioskFlow";
import { runEnrichmentTests } from "./enrichment/enrichment.test";
import { runEvaluationTests } from "./evaluation/evaluation.test";
import { runKoreanSnackDatasetTests } from "./evaluation/koreanSnackDataset.test";
import { runAdjudicationTests } from "./adjudication/adjudication.test";
import { runStressTests } from "./evaluation/stressTest.test";
import { runRiskPolicyTests } from "./evaluation/riskPolicy.test";
import { runPolicyOptimizerTests } from "./evaluation/policyOptimizer.test";
import { runFastFoodDatasetTests } from "./evaluation/fastFoodDataset.test";
import { runOnboardingTests } from "./onboarding/onboarding.test";
import { applyNormalizedAnswer, calculateScore, type PreferenceVector } from "./engine/scoring";
import { partitionCandidates, selectNextQuestion } from "./engine/selector";
import { adaptTouchAnswer, parseTextAnswer, parseVoiceAnswer } from "./input";
import type { StoreMenu } from "./types/menu";
import type { NormalizedUserAnswer } from "./types/input";
import type { Question, UserState } from "./types/question";
import type { RawStoreData } from "./types/store";

function getQuestion(id: string): Question {
  const question = questions.find((item) => item.id === id);
  if (!question) throw new Error(`Missing question: ${id}`);
  return question;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const parserCases: Array<[string, string, string | null, boolean]> = [
  ["temperature", "아이스로 주세요", "cold", false],
  ["temperature", "시원한 거", "cold", false],
  ["temperature", "따뜻하게 주세요", "hot", false],
  ["temperature", "아무거나 괜찮아요", "neutral", false],
  ["sweetness", "달달한 거", "high", false],
  ["sweetness", "안 단 걸로", "low", false],
  ["sweetness", "조금만 달게", "medium", false],
  ["sweetness", "상관없어요", "neutral", false],
  ["coffee", "커피 먹고 싶어요", "high", false],
  ["coffee", "커피 말고 다른 거", "low", false],
  ["coffee", "잘 모르겠어요", "neutral", false],
  ["coffee", "음...", null, true],
  ["coffee", "글쎄요", "neutral", false],
  ["coffee", "오늘 날씨가 좋네요", null, true],
  ["sweetness", "조금 달면서 안 달았으면 좋겠어요", null, true],
  ["temperature", "따뜻해도 되고 차가워도 돼요", "neutral", false],
];

console.log("[Parser tests]");
for (const [questionId, rawInput, expectedOption, expectedClarification] of parserCases) {
  const parsed = parseTextAnswer(getQuestion(questionId), rawInput);
  assert(parsed.optionId === expectedOption, `${rawInput}: expected ${expectedOption}, got ${parsed.optionId}`);
  assert(parsed.needsClarification === expectedClarification, `${rawInput}: clarification mismatch`);
  assert(parsed.rawInput === rawInput, `${rawInput}: rawInput was not preserved`);
  console.log(`- "${rawInput}" -> ${parsed.optionId ?? "unknown"}, confidence=${parsed.confidence.toFixed(2)}, clarification=${parsed.needsClarification}`);
}

const touch = adaptTouchAnswer(getQuestion("temperature"), "cold");
assert(touch.confidence === 1 && touch.source === "touch", "touch adapter must be explicit");
const voice = parseVoiceAnswer(getQuestion("sweetness"), "달달한 거");
assert(voice.optionId === "high" && voice.source === "voice", "voice must reuse text parsing");

console.log("\n[Dynamic selector regression]");
const initialSelection = selectNextQuestion(menus, questions, { answers: [] });
assert(initialSelection !== null, "selector should choose a question");
console.log(`- selected: ${initialSelection.question.id}, informationGain=${initialSelection.informationGain.toFixed(3)}`);

console.log("\n[Natural-language integration]");
let candidates: StoreMenu[] = [...menus];
let preferences: PreferenceVector = {};
const userState: UserState = { answers: [] };

function acceptAnswer(answer: NormalizedUserAnswer): void {
  console.log(`사용자(${answer.source}): "${answer.rawInput ?? answer.optionId}"`);
  console.log(`Parser: ${answer.optionId ?? "unknown"} (${answer.confidence.toFixed(2)})`);
  if (answer.needsClarification || answer.optionId === null) {
    console.log("확인 질문 필요: 후보와 점수를 변경하지 않음");
    return;
  }

  preferences = applyNormalizedAnswer(preferences, answer);
  userState.answers.push({ questionId: answer.questionId, optionId: answer.optionId });
  const question = getQuestion(answer.questionId);
  const branch = partitionCandidates(candidates, question).get(answer.optionId);
  if (branch && branch.length > 0) candidates = branch;
  console.log("남은 후보:", candidates.map((menu) => menu.name).join(", "));
}

const temperatureQuestion = getQuestion("temperature");
console.log(`시스템: ${temperatureQuestion.text}`);
acceptAnswer(parseTextAnswer(temperatureQuestion, "아이스로 주세요"));

const sweetnessQuestion = getQuestion("sweetness");
console.log(`시스템: ${sweetnessQuestion.text}`);
acceptAnswer(parseTextAnswer(sweetnessQuestion, "달달한 거"));

const next = selectNextQuestion(candidates, questions, userState);
console.log("다음 동적 질문:", next?.question.text ?? "종료 조건 충족");

const recommendations = candidates
  .map((menu) => ({ menu, score: calculateScore(menu, preferences) }))
  .sort((a, b) => b.score - a.score);
console.log("최종 추천:", recommendations.map(({ menu, score }) => `${menu.name}(${score.toFixed(2)})`).join(", "));

console.log("\n[Multi-store: 분식점 JSON]");
const snackStoreJson = {
  storeId: "seoul-snack-01",
  storeName: "서울분식",
  attributes: [
    { key: "spiciness", label: "매운맛", type: "number", question: "매운 음식을 선호하시나요?", lowLabel: "순한 맛", highLabel: "매운 맛" },
    { key: "fried", label: "튀김", type: "number", question: "바삭하게 튀긴 메뉴를 원하시나요?", lowLabel: "튀기지 않은 메뉴", highLabel: "튀긴 메뉴" },
    { key: "hearty", label: "든든함", type: "number", question: "든든한 메뉴를 원하시나요?" },
    {
      key: "temperature",
      label: "온도",
      type: "category",
      question: "따뜻한 메뉴와 차가운 메뉴 중 어느 쪽이 좋으세요?",
      options: [
        { value: "hot", label: "따뜻하게", aliases: ["따뜻한", "뜨거운"] },
        { value: "cold", label: "차갑게", aliases: ["차가운", "시원한"] },
      ],
    },
  ],
  menus: [
    { id: "tteokbokki", name: "떡볶이", price: 4500, attributes: { spiciness: 1, fried: 0, hearty: 0.8, temperature: "hot" } },
    { id: "gimbap", name: "김밥", price: 3500, attributes: { spiciness: 0.1, fried: 0, hearty: 0.8, temperature: "cold" } },
    { id: "sundae", name: "순대", price: 5000, attributes: { spiciness: 0.2, fried: 0, hearty: 0.7, temperature: "hot" } },
    { id: "fried-set", name: "모둠튀김", price: 5500, attributes: { spiciness: 0, fried: 1.2, hearty: 0.5, temperature: "hot" } },
    { id: "ramyeon", name: "라면", price: 4500, attributes: { spiciness: 0.7, fried: 0, hearty: 0.9, temperature: "hot" } },
    { id: "cold-noodles", name: "쫄면", price: 5500, attributes: { spiciness: 0.6, fried: 0, hearty: 0.7, temperature: "cold" } },
  ],
} satisfies RawStoreData;

const snackStore = loadStoreData(snackStoreJson);
assert(snackStore.menus.length === 6, "store loader must load every snack menu");
assert(snackStore.menus.find((menu) => menu.id === "fried-set")?.attributes.fried === 1, "numeric attributes must be clamped to 0..1");
assert(snackStore.questions.length > 0, "questions must be generated from menu distributions");
console.log("자동 생성 질문:", snackStore.questions.map((question) => question.text).join(" / "));

let snackCandidates: StoreMenu[] = [...snackStore.menus];
const snackState: UserState = { answers: [] };
const targetMenuId = "tteokbokki";
while (true) {
  const selected = selectNextQuestion(snackCandidates, snackStore.questions, snackState, { targetCandidateCount: 2 });
  if (!selected) break;
  const targetBranch = [...selected.branches.entries()].find(([, branch]) =>
    branch.some((menu) => menu.id === targetMenuId),
  );
  assert(targetBranch, "target menu must belong to a generated branch");
  const [optionId, branch] = targetBranch;
  snackState.answers.push({ questionId: selected.question.id, optionId });
  snackCandidates = branch;
  console.log(`- ${selected.question.text} -> ${optionId} -> ${snackCandidates.map((menu) => menu.name).join(", ")}`);
}

const snackPreference: PreferenceVector = { spiciness: 1, fried: 0, hearty: 0.8 };
const snackRecommendations = snackCandidates
  .map((menu) => ({ menu, score: calculateScore(menu, snackPreference) }))
  .sort((a, b) => b.score - a.score);
assert(snackRecommendations.length > 0, "generic scoring must return snack recommendations");
console.log("분식점 최종 추천:", snackRecommendations.map(({ menu, score }) => `${menu.name}(${score.toFixed(2)})`).join(", "));

console.log("\n[Kiosk state regression]");
for (const demoStore of stores) {
  const first = replayAnswers(demoStore, []).nextQuestion;
  assert(first, `${demoStore.storeName}: UI flow needs a first question`);
  const answerable = first.question.options.find((option) => option.id !== "neutral") ?? first.question.options[0];
  const initialState = { ...createInitialState(demoStore.storeId), screen: "questions" as const };
  const answered = kioskReducer(initialState, { type: "ANSWER", questionId: first.question.id, optionId: answerable.id, finished: false });
  assert(answered.history.length === 1, `${demoStore.storeName}: answer history must be recorded`);
  const rolledBack = kioskReducer(answered, { type: "BACK" });
  assert(rolledBack.history.length === 0 && rolledBack.screen === "questions", `${demoStore.storeName}: back must rollback one answer`);
  const reset = kioskReducer(answered, { type: "RESET" });
  assert(reset.history.length === 0 && reset.screen === "start", `${demoStore.storeName}: reset must clear session`);
  console.log(`- ${demoStore.storeName}: 질문 ${demoStore.questions.length}개, rollback/reset 통과`);
}

console.log("\n[Checkout reducer regression]");
const checkoutStore = stores[0];
const checkoutMenu = checkoutStore.menus[0];
let checkoutState = kioskReducer(createInitialState(checkoutStore.storeId), { type: "SELECT_MENU", menuId: checkoutMenu.id });
assert(checkoutState.screen === "detail" && checkoutState.selectedMenuId === checkoutMenu.id, "menu selection must open detail");
checkoutState = kioskReducer(checkoutState, { type: "ADD_TO_CART", item: { id: "test-cart-item", menuId: checkoutMenu.id, name: checkoutMenu.name, basePrice: checkoutMenu.price, quantity: 1, options: [], unitPrice: checkoutMenu.price } });
assert(checkoutState.screen === "cart" && checkoutState.cart.length === 1, "cart item must be stored");
const afterDuplicateAdd = kioskReducer(checkoutState, { type: "ADD_TO_CART", item: checkoutState.cart[0] });
assert(afterDuplicateAdd.cart.length === 1, "repeated add action outside detail must be ignored");
checkoutState = kioskReducer(checkoutState, { type: "SET_QUANTITY", itemId: "test-cart-item", quantity: 3 });
checkoutState = kioskReducer(checkoutState, { type: "SET_QUANTITY", itemId: "test-cart-item", quantity: 2 });
assert(checkoutState.cart[0].quantity === 2, "cart quantity must update without reaching zero");
checkoutState = kioskReducer(checkoutState, { type: "SELECT_MENU", menuId: checkoutMenu.id });
checkoutState = kioskReducer(checkoutState, { type: "ADD_TO_CART", item: { id: "same-menu-other-options", menuId: checkoutMenu.id, name: checkoutMenu.name, basePrice: checkoutMenu.price, quantity: 1, options: [{ groupId: "size", choiceId: "large", label: "크기: 큰 사이즈", priceDelta: 700 }], unitPrice: checkoutMenu.price + 700 } });
assert(checkoutState.cart.length === 2, "same menu with different options must remain separate cart items");
checkoutState = kioskReducer(checkoutState, { type: "REMOVE_CART_ITEM", itemId: "same-menu-other-options" });
assert(checkoutState.cart.length === 1, "confirmed cart removal must remove only the selected item");
checkoutState = kioskReducer(checkoutState, { type: "GO", screen: "payment" });
checkoutState = kioskReducer(checkoutState, { type: "START_PAYMENT", method: "card" });
assert(checkoutState.screen === "processing" && checkoutState.paymentMethod === "card", "payment must enter processing");
const afterDuplicatePayment = kioskReducer(checkoutState, { type: "START_PAYMENT", method: "card" });
assert(afterDuplicatePayment === checkoutState, "repeated payment action while processing must be ignored");
checkoutState = kioskReducer(checkoutState, { type: "PAYMENT_RESULT", outcome: "card-read-failed" });
assert(checkoutState.screen === "payment-failed" && checkoutState.cart.length === 1, "payment failure must preserve cart");
checkoutState = kioskReducer(checkoutState, { type: "RETRY_PAYMENT" });
assert(checkoutState.screen === "processing" && checkoutState.demoPaymentOutcome === "success", "retry must return to processing in demo mode");
checkoutState = kioskReducer(checkoutState, { type: "PAYMENT_RESULT", outcome: "success", orderNumber: 321 });
assert(checkoutState.screen === "complete" && checkoutState.orderNumber === 321, "payment must complete with an order number");
const largeTextState = kioskReducer(checkoutState, { type: "TOGGLE_LARGE_TEXT" });
const changedStore = kioskReducer(largeTextState, { type: "SET_STORE", storeId: stores[1].storeId });
assert(changedStore.cart.length === 0 && changedStore.largeText, "store change must clear order and preserve accessibility preference");
checkoutState = kioskReducer(checkoutState, { type: "RESET" });
assert(checkoutState.screen === "start" && checkoutState.cart.length === 0, "completed order reset must clear cart");
let emptyCartState = kioskReducer(createInitialState(checkoutStore.storeId), { type: "GO", screen: "payment" });
assert(emptyCartState.screen === "start", "empty cart must not enter payment");
emptyCartState = kioskReducer(emptyCartState, { type: "HELP", open: true });
assert(emptyCartState.helpOpen && emptyCartState.cart.length === 0, "help overlay must not alter order state");
console.log("- 수량/중복 방지/결제 실패/재시도/Store 초기화/Large Text 통과");
console.log("\n모든 parser, 카페 및 멀티 스토어 통합 테스트 통과");
await runEnrichmentTests();
await runEvaluationTests();
await runKoreanSnackDatasetTests();
runAdjudicationTests();
runStressTests();
runRiskPolicyTests();
runPolicyOptimizerTests();
await runFastFoodDatasetTests();
await runOnboardingTests();
