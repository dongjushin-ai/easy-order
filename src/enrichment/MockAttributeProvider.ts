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
