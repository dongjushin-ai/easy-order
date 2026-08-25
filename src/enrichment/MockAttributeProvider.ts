import type { AttributeDefinition } from "../types/store";
import type { AttributeEnrichmentProvider, AttributeInferenceInput, AttributeInferenceResult, ProviderAttributeEstimate, StoreInferenceInput, StoreInferenceResult } from "../types/enrichment";
import { chunkMenus } from "./batch";

function includesAny(text: string, words: string[]): boolean { return words.some((word) => text.includes(word)); }

function defaultEstimate(definition: AttributeDefinition): ProviderAttributeEstimate {
  return definition.type === "number"
    ? { value: 0.5, confidence: 0.25, source: "DEFAULT", evidence: "판단할 정보가 없어 중간값을 사용함" }
    : { value: definition.options?.[0]?.value ?? "unknown", confidence: 0.2, source: "DEFAULT", evidence: "판단할 정보가 없어 첫 범주를 사용함" };
}

export class MockAttributeProvider implements AttributeEnrichmentProvider {
  readonly id = "deterministic-keyword-mock-v1";

  async inferMenuAttributes({ menu, schema }: AttributeInferenceInput): Promise<AttributeInferenceResult> {
    const estimates = Object.fromEntries(schema.map((definition) => [definition.key, defaultEstimate(definition)]));
    const name = menu.name.toLowerCase();
    const description = menu.description?.toLowerCase() ?? "";
    const category = menu.category?.toLowerCase() ?? "";
    const options = menu.options?.join(" ").toLowerCase() ?? "";
    const nameSource = category ? "MENU_METADATA" as const : "AI_FROM_NAME" as const;
    const nameConfidence = category ? 0.88 : 0.8;

    const set = (key: string, value: number | string, confidence: number = nameConfidence, source: ProviderAttributeEstimate["source"] = nameSource, evidence = `메뉴명/카테고리: ${menu.name}`) => {
      if (schema.some((definition) => definition.key === key)) estimates[key] = { value, confidence, source, evidence };
    };

    const nonCoffeeLatte = includesAny(name, ["딸기라떼", "고구마라떼", "녹차라떼", "초코라떼"]);
    const coffee = includesAny(name + category, ["아메리카노", "카페라떼", "카페모카", "마끼아또", "콜드브루"]) || (name.includes("라떼") && !nonCoffeeLatte);
    if (coffee) { set("coffee", name.includes("아메리카노") || name.includes("콜드브루") ? 1 : 0.7); set("caffeine", 0.85); }
    else { set("coffee", 0.05, 0.78); set("caffeine", includesAny(name, ["녹차", "아이스티"]) ? 0.3 : 0.05, 0.72); }

    if (name.includes("아메리카노")) { set("sweetness", includesAny(name, ["꿀", "바닐라"]) ? 0.72 : 0.05); set("milk", 0.02); set("creamy", 0.05); }
    if (includesAny(name, ["바닐라", "카라멜", "모카", "초코", "요거트", "고구마"])) set("sweetness", name.includes("카라멜") ? 0.9 : 0.78);
    if (includesAny(name, ["라떼", "요거트", "스무디", "프라페"])) { set("milk", 0.9); set("creamy", 0.88); }
    else { set("milk", 0.05, 0.75); set("creamy", 0.1, 0.7); }
    if (includesAny(name, ["에이드", "아이스티", "스무디", "콜드브루"])) set("refreshing", 0.9);
    else set("refreshing", 0.35, 0.65);
    if (includesAny(name, ["딸기", "복숭아", "레몬", "자몽", "바나나"])) set("fruity", 0.92);
    else set("fruity", 0.08, 0.72);

    if (includesAny(name + description, ["매운", "떡볶이", "매콤"])) set("spiciness", 0.9);
    else set("spiciness", 0.1, 0.68);
    if (includesAny(name + category, ["튀김", "후라이드"])) set("fried", 0.95);
    else set("fried", 0.05, 0.7);
    if (includesAny(name, ["김밥", "라면", "떡볶이", "순대", "덮밥"])) set("hearty", 0.82);
    if (includesAny(name, ["라면", "탕", "국", "찌개"])) set("broth", 0.9);
    else set("broth", 0.08, 0.65);

    // Deterministic test-only rules for the Korean snack evaluation dataset.
    const snackText = `${name} ${description} ${category}`;
    if (schema.some((definition) => definition.key === "crispy")) {
      if (includesAny(snackText, ["매운", "매콤", "얼큰", "떡볶이", "라볶이", "쫄면"])) set("spiciness", includesAny(snackText, ["강한 매운", "매운 떡볶이"]) ? .95 : .68);
      if (includesAny(snackText, ["튀김", "튀긴", "김말이", "비빔만두"])) { set("fried", .95); set("crispy", .92); }
      else set("crispy", .08, .7);
      if (includesAny(snackText, ["국물", "탕", "라면", "우동", "어묵"])) set("broth", .92);
      if (includesAny(snackText, ["치즈", "로제"])) set("cheesy", name.includes("치즈") ? .95 : .4);
      else set("cheesy", .02, .8);
      if (includesAny(snackText, ["떡", "순대", "쫄면", "우동", "오징어"])) set("chewy", .88);
      else set("chewy", .3, .7);
      if (includesAny(snackText, ["달콤", "달달"])) set("sweetness", .62);
      else if (estimates.sweetness?.source === "DEFAULT") set("sweetness", .18, .65);
      if (includesAny(snackText, ["든든", "라볶이", "김밥", "라면", "우동"])) set("hearty", .85);
    }

    // Deterministic test-only rules for generic fast-food schemas.
    if (schema.some((definition) => definition.key === "meaty")) {
      const fastFoodText = `${name} ${description} ${category}`;
      if (includesAny(fastFoodText, ["매운", "spicy"])) set("spiciness", .92);
      if (includesAny(fastFoodText, ["튀김", "후라이드", "텐더", "너겟", "어니언링", "치즈스틱", "새우버거"])) { set("fried", .95); set("crispy", .9); }
      else { set("fried", .08, .72); set("crispy", .2, .68); }
      if (includesAny(fastFoodText, ["치즈"])) set("cheesy", .95); else set("cheesy", .05, .78);
      if (includesAny(fastFoodText, ["치킨", "패티", "버거", "핫도그", "너겟", "베이컨"])) set("meaty", includesAny(fastFoodText, ["더블", "베이컨"]) ? .98 : .78); else set("meaty", .05, .75);
      if (includesAny(fastFoodText, ["더블", "세트"])) set("hearty", .95); else if (includesAny(fastFoodText, ["버거", "치킨"])) set("hearty", .75);
      if (includesAny(fastFoodText, ["샐러드", "채소", "양상추"])) { set("fresh", .95); set("greasy", .12); } else { set("fresh", .08, .7); if (includesAny(fastFoodText, ["튀김", "치즈", "베이컨"])) set("greasy", .82); }
    }

    if (schema.some((definition) => definition.key === "temperature")) {
      const hasHot = includesAny(name + options, ["hot", "핫", "따뜻", "뜨거"]);
      const hasCold = includesAny(name + options, ["ice", "아이스", "cold", "콜드", "차가", "시원", "에이드", "스무디", "프라페"]);
      set("temperature", hasHot && hasCold ? "both" : hasCold ? "cold" : "hot", options ? 0.92 : 0.78, options ? "MENU_METADATA" : "AI_FROM_NAME", options || menu.name);
    }

    if (description) {
      if (includesAny(description, ["시럽을 절반", "덜 단", "덜 달", "저당"])) {
        set("sweetness", 0.32, 0.95, "OWNER_DESCRIPTION", description);
      } else if (includesAny(description, ["달콤", "달달", "풍부한 단맛"])) {
        set("sweetness", 0.85, 0.9, "AI_FROM_DESCRIPTION", description);
      }
      if (includesAny(description, ["우유 없이", "논밀크"])) set("milk", 0.05, 0.94, "OWNER_DESCRIPTION", description);
      if (includesAny(description, ["카페인 없음", "디카페인"])) set("caffeine", 0.05, 0.96, "OWNER_DESCRIPTION", description);
      if (includesAny(description, ["매우 매운", "강한 매운맛"])) set("spiciness", 1, 0.94, "OWNER_DESCRIPTION", description);
    }

    return { estimates };
  }

  async inferStoreAttributes(input: StoreInferenceInput): Promise<StoreInferenceResult> {
    const started = Date.now();
    const batches = chunkMenus(input.menus);
    const results: Record<string, AttributeInferenceResult> = {};
    for (const batch of batches) for (const menu of batch) results[menu.id] = await this.inferMenuAttributes({ menu, schema: input.schema });
    return { results, diagnostics: { provider: this.id, model: "rules-v1", menuCount: input.menus.length, batchCount: batches.length, latencyMs: Date.now() - started, retryCount: 0 } };
  }
}
