import type { AttributeDefinition, RawStoreData, RawStoreMenu } from "../types/store";
import type { EvaluationDataset } from "./dataset";
import type { MenuGroundTruth } from "./megaMgcGroundTruth";

export const KOREAN_SNACK_DATASET_VERSION = "snack20-v1";
export const KOREAN_SNACK_CORE_ATTRIBUTES = ["spiciness", "fried", "broth", "hearty", "sweetness", "cheesy", "chewy", "crispy"] as const;
type Profile = Record<(typeof KOREAN_SNACK_CORE_ATTRIBUTES)[number], number>;

const choices = (labels: string[]) => labels.map((label, index) => ({ label, value: labels.length === 1 ? 0 : index / (labels.length - 1) }));
export const koreanSnackAttributeSchema: AttributeDefinition[] = [
  { key: "spiciness", label: "매운맛", type: "number", question: "매운 음식이 좋으세요?", lowLabel: "순한 메뉴", highLabel: "매운 메뉴", reviewChoices: choices(["안 매움", "조금 매움", "보통", "매움", "매우 매움"]) },
  { key: "fried", label: "튀김 성격", type: "number", question: "튀긴 음식이 좋으세요?", lowLabel: "튀기지 않은 메뉴", highLabel: "튀김 중심", reviewChoices: choices(["튀김 아님", "조금 튀김", "튀김 중심"]) },
  { key: "broth", label: "국물", type: "number", question: "국물이 있는 메뉴가 좋으세요?", lowLabel: "국물 없이", highLabel: "국물 중심", reviewChoices: choices(["국물 없음", "조금 있음", "국물 있음"]) },
  { key: "hearty", label: "든든함", type: "number", question: "든든한 메뉴가 좋으세요?", lowLabel: "가벼운 간식", highLabel: "한 끼로 든든하게", reviewChoices: choices(["가벼움", "보통", "든든함"]) },
  { key: "sweetness", label: "단맛", type: "number", question: "단맛이 있는 메뉴가 좋으세요?", lowLabel: "달지 않게", highLabel: "달콤하게", reviewChoices: choices(["거의 안 달음", "보통", "달콤함"]) },
  { key: "cheesy", label: "치즈 풍미", type: "number", question: "치즈가 들어간 메뉴가 좋으세요?", lowLabel: "치즈 없이", highLabel: "치즈 풍미 강하게", reviewChoices: choices(["없음", "조금", "많음"]) },
  { key: "chewy", label: "쫄깃함", type: "number", question: "쫄깃한 식감을 좋아하세요?", lowLabel: "부드러운 식감", highLabel: "쫄깃한 식감", reviewChoices: choices(["부드러움", "보통", "매우 쫄깃함"]) },
  { key: "crispy", label: "바삭함", type: "number", question: "바삭한 식감을 좋아하세요?", lowLabel: "바삭하지 않게", highLabel: "매우 바삭하게", reviewChoices: choices(["바삭하지 않음", "보통", "매우 바삭함"]) },
];

const menu = (id: string, name: string, price: number, category: string, description: string, profile: Profile, options: string[] = []): RawStoreMenu & { profile: Profile } => ({ id, name, price, category, description, options, profile });
const menuProfiles = [
  menu("tteokbokki", "기본 떡볶이", 4500, "떡볶이", "달콤하고 매콤한 소스와 쫄깃한 떡", { spiciness:.6,fried:.05,broth:.35,hearty:.7,sweetness:.6,cheesy:0,chewy:.9,crispy:.05 }, ["순한맛", "보통맛", "매운맛"]),
  menu("spicy-tteokbokki", "매운 떡볶이", 5000, "떡볶이", "강한 매운맛의 쫄깃한 떡볶이", { spiciness:.95,fried:.05,broth:.35,hearty:.7,sweetness:.35,cheesy:0,chewy:.9,crispy:.05 }),
  menu("rose-tteokbokki", "로제 떡볶이", 6000, "떡볶이", "부드러운 로제 소스의 떡볶이", { spiciness:.35,fried:.05,broth:.45,hearty:.8,sweetness:.55,cheesy:.35,chewy:.85,crispy:.05 }),
  menu("cheese-tteokbokki", "치즈 떡볶이", 6000, "떡볶이", "치즈를 듬뿍 올린 매콤한 떡볶이", { spiciness:.5,fried:.05,broth:.35,hearty:.85,sweetness:.55,cheesy:.95,chewy:.85,crispy:.05 }),
  menu("rabokki", "라볶이", 6000, "떡볶이", "떡과 라면을 함께 즐기는 매콤한 메뉴", { spiciness:.65,fried:.05,broth:.55,hearty:.95,sweetness:.5,cheesy:0,chewy:.75,crispy:.05 }),
  menu("gimbap", "김밥", 3500, "김밥", "채소와 밥을 넣어 말아낸 기본 김밥", { spiciness:.05,fried:.05,broth:0,hearty:.75,sweetness:.2,cheesy:0,chewy:.35,crispy:.15 }),
  menu("tuna-gimbap", "참치김밥", 4500, "김밥", "참치와 채소가 들어간 든든한 김밥", { spiciness:.05,fried:.05,broth:0,hearty:.9,sweetness:.2,cheesy:0,chewy:.35,crispy:.15 }),
  menu("cheese-gimbap", "치즈김밥", 4500, "김밥", "고소한 치즈가 들어간 김밥", { spiciness:.05,fried:.05,broth:0,hearty:.85,sweetness:.25,cheesy:.9,chewy:.35,crispy:.15 }),
  menu("sundae", "순대", 5000, "순대", "부드럽고 쫄깃한 찹쌀 순대", { spiciness:.05,fried:.05,broth:.05,hearty:.75,sweetness:.1,cheesy:0,chewy:.9,crispy:.05 }),
  menu("fried-set", "튀김 모둠", 5500, "튀김", "여러 재료를 바삭하게 튀긴 모둠", { spiciness:.05,fried:.98,broth:0,hearty:.55,sweetness:.15,cheesy:0,chewy:.3,crispy:.95 }),
  menu("gimmari", "김말이", 3000, "튀김", "당면을 김에 말아 바삭하게 튀긴 메뉴", { spiciness:.05,fried:.95,broth:0,hearty:.4,sweetness:.15,cheesy:0,chewy:.6,crispy:.9 }),
  menu("squid-fried", "오징어튀김", 4000, "튀김", "오징어를 바삭하게 튀긴 메뉴", { spiciness:.05,fried:.98,broth:0,hearty:.5,sweetness:.1,cheesy:0,chewy:.65,crispy:.95 }),
  menu("vegetable-fried", "야채튀김", 3500, "튀김", "채소를 큼직하게 넣은 바삭한 튀김", { spiciness:.05,fried:.98,broth:0,hearty:.5,sweetness:.25,cheesy:0,chewy:.25,crispy:.95 }),
  menu("fishcake", "어묵", 1500, "국물", "따뜻한 어묵 국물과 함께 먹는 꼬치 어묵", { spiciness:.05,fried:.05,broth:.95,hearty:.45,sweetness:.2,cheesy:0,chewy:.65,crispy:.05 }),
  menu("fishcake-soup", "어묵탕", 5500, "국물", "여러 어묵이 들어간 따뜻하고 넉넉한 국물", { spiciness:.1,fried:.05,broth:1,hearty:.75,sweetness:.2,cheesy:0,chewy:.65,crispy:.05 }),
  menu("ramyeon", "라면", 4500, "면", "얼큰한 국물의 든든한 라면", { spiciness:.65,fried:.05,broth:.9,hearty:.85,sweetness:.1,cheesy:0,chewy:.55,crispy:.05 }),
  menu("udon", "우동", 5000, "면", "순하고 따뜻한 국물의 굵은 면", { spiciness:.05,fried:.05,broth:.95,hearty:.8,sweetness:.15,cheesy:0,chewy:.7,crispy:.05 }),
  menu("jjolmyeon", "쫄면", 5500, "면", "매콤한 양념과 매우 쫄깃한 면", { spiciness:.7,fried:.05,broth:.05,hearty:.75,sweetness:.4,cheesy:0,chewy:1,crispy:.15 }),
  menu("fried-dumplings", "비빔만두", 5500, "만두", "바삭한 만두와 매콤한 채소무침", { spiciness:.55,fried:.9,broth:0,hearty:.65,sweetness:.35,cheesy:0,chewy:.3,crispy:.85 }),
  menu("rice-ball", "주먹밥", 3500, "밥", "김가루와 밥을 뭉친 가벼운 메뉴", { spiciness:.05,fried:.05,broth:0,hearty:.65,sweetness:.15,cheesy:0,chewy:.3,crispy:.1 }),
] as const;

const range = (value: number): readonly [number, number] => [Math.max(0, Number((value - .12).toFixed(2))), Math.min(1, Number((value + .12).toFixed(2)))];
export const koreanSnackGroundTruth: MenuGroundTruth[] = menuProfiles.map(({ id, profile }) => ({ menuId: id, temperature: [], numeric: Object.fromEntries(KOREAN_SNACK_CORE_ATTRIBUTES.map((key) => [key, range(profile[key])])) }));
export const koreanSnackRawStore: RawStoreData = { storeId: "korean-snack-store", storeName: "한국 분식점", attributes: koreanSnackAttributeSchema, menus: menuProfiles.map(({ profile: _profile, ...item }) => item) };
export const koreanSnackFinalStore: RawStoreData = { ...koreanSnackRawStore, defaultOptionGroupIds: ["dining"], orderOptionGroups: [{ id: "dining", label: "이용 방법", required: true, choices: [{ id: "here", label: "매장에서 먹기", priceDelta: 0 }, { id: "takeout", label: "포장하기", priceDelta: 0 }] }], menus: menuProfiles.map(({ profile, ...item }) => ({ ...item, attributes: profile })) };
export const koreanSnackStoreDataset: EvaluationDataset = { id: "korean-snack-store", version: KOREAN_SNACK_DATASET_VERSION, store: koreanSnackRawStore, groundTruth: koreanSnackGroundTruth, coreAttributes: KOREAN_SNACK_CORE_ATTRIBUTES, smokeMenuIds: ["tteokbokki", "cheese-tteokbokki", "fried-set", "fishcake-soup", "gimbap"] };
