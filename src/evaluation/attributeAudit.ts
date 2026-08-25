import type { AttributeEvaluationCase } from "./metrics";

export type AttributeAmbiguity = "OBJECTIVE" | "SEMI_SUBJECTIVE" | "SUBJECTIVE";
export type GroundTruthReliability = "HIGH" | "MEDIUM" | "LOW";
export type AuditAction = "KEEP" | "WIDEN_RANGE" | "SHIFT_RANGE" | "ATTRIBUTE_DEFINITION_REVIEW";
export interface AttributeSemantics {
  key: string; definition: string; ambiguity: AttributeAmbiguity; reliability: GroundTruthReliability;
  anchors: Record<"0" | "0.25" | "0.5" | "0.75" | "1", string>;
  validEvidence: string[]; invalidEvidence: string[]; aiSuitability: "A" | "B" | "C";
}

const anchors = (zero: string, quarter: string, half: string, threeQuarter: string, one: string) => ({ "0": zero, "0.25": quarter, "0.5": half, "0.75": threeQuarter, "1": one });
export const snackAttributeSemantics: Record<string, AttributeSemantics> = {
  spiciness: { key:"spiciness", definition:"조리된 기본 메뉴 자체에서 느껴지는 고추·매운 양념의 체감 강도", ambiguity:"SEMI_SUBJECTIVE", reliability:"MEDIUM", anchors:anchors("전혀 맵지 않음","약한 매운 요소","일반적인 중간 매운맛","대부분 맵다고 인식","매운맛이 핵심인 매우 매운 메뉴"), validEvidence:["고추·매운 소스","맵기 단계","조리법과 기본 레시피"], invalidEvidence:["개인 내성","추가 소스 선택","메뉴 이름만의 홍보 표현"], aiSuitability:"B" },
  fried: { key:"fried", definition:"메뉴 주재료가 기름에 튀겨진 정도와 튀김 조리법의 중심성", ambiguity:"OBJECTIVE", reliability:"HIGH", anchors:anchors("튀기지 않음","일부 토핑만 튀김","튀김 요소와 비튀김 요소가 혼합","대부분 튀김","메뉴 전체가 튀김 중심"), validEvidence:["조리법","튀김옷","메뉴 구성"], invalidEvidence:["바삭하다는 표현만 사용","기름진 맛의 주관적 인상"], aiSuitability:"A" },
  broth: { key:"broth", definition:"완성 메뉴에서 액체 국물이 차지하는 비중과 식사의 중심성", ambiguity:"OBJECTIVE", reliability:"HIGH", anchors:anchors("국물 없음","소스·자작한 수분","건더기와 국물이 비슷","국물이 주요 구성","국물 중심 메뉴"), validEvidence:["제공 형태","국물 양","탕·국·면 조리법"], invalidEvidence:["소스가 있다는 사실만으로 국물로 판단","수분감에 대한 추측"], aiSuitability:"A" },
  hearty: { key:"hearty", definition:"일반적인 성인 1인 기준으로 주식 역할, 통상 제공량, 탄수화물·단백질 구성에 근거한 한 끼 대체 가능성", ambiguity:"SUBJECTIVE", reliability:"LOW", anchors:anchors("작은 곁들임","가벼운 간식","보통 간식 또는 작은 식사","대체로 한 끼 가능","충분한 한 끼 또는 큰 식사"), validEvidence:["표준 제공량","주식 포함 여부","메뉴 구성과 1인분 기준"], invalidEvidence:["개인 식사량","가격만으로 추정","맛이 진하다는 이유"], aiSuitability:"C" },
  sweetness: { key:"sweetness", definition:"기본 레시피의 설탕·시럽·단맛 소스와 일반적인 완성 메뉴에서 체감되는 단맛 강도", ambiguity:"SUBJECTIVE", reliability:"LOW", anchors:anchors("거의 단맛 없음","약한 단맛","분명하지만 지배적이지 않은 단맛","강한 단맛","단맛이 핵심인 매우 단 메뉴"), validEvidence:["설탕·시럽","달콤한 소스","레시피 또는 영양 정보"], invalidEvidence:["탄수화물 함량","감칠맛","개인 취향만으로 판단"], aiSuitability:"C" },
  cheesy: { key:"cheesy", definition:"치즈의 실제 포함 여부와 완성 메뉴에서 치즈 풍미가 차지하는 비중", ambiguity:"OBJECTIVE", reliability:"HIGH", anchors:anchors("치즈 없음","소량 토핑","치즈가 인지되나 보조적","치즈 풍미가 강함","치즈가 메뉴의 핵심"), validEvidence:["재료 목록","치즈 양","메뉴 옵션"], invalidEvidence:["크리미하다는 표현만으로 판단","유제품 일반"], aiSuitability:"A" },
  chewy: { key:"chewy", definition:"씹을 때의 탄성, 저항, 반복 저작 필요도를 합친 완성 메뉴 주재료의 식감", ambiguity:"SUBJECTIVE", reliability:"LOW", anchors:anchors("거의 씹는 저항 없음","부드럽고 약한 저항","보통의 씹힘","뚜렷한 탄성과 저항","매우 높은 탄성과 반복 저작 필요"), validEvidence:["주재료 물성","조리 후 식감","쫄깃·탄력 표현"], invalidEvidence:["질기다는 부정 표현과 동일시","재료 이름만으로 절대값 확정"], aiSuitability:"C" },
  crispy: { key:"crispy", definition:"완성 직후 씹을 때 발생하는 표면 파쇄감과 바삭한 식감의 비중", ambiguity:"SEMI_SUBJECTIVE", reliability:"MEDIUM", anchors:anchors("바삭함 없음","일부 표면만 약함","바삭함과 부드러움 혼합","뚜렷하게 바삭함","전체적으로 매우 바삭함"), validEvidence:["튀김옷·굽기","표면 식감","제공 직후 조리 상태"], invalidEvidence:["fried 값과 자동 동일시","보관 후 상태를 기본값으로 사용"], aiSuitability:"B" },
};

export const reliabilityWeights: Record<GroundTruthReliability, number> = { HIGH: 1, MEDIUM: .7, LOW: .4 };
export function reliabilityWeightedAccuracy(cases: AttributeEvaluationCase[]): number { let correct=0,total=0; for(const item of cases){const w=reliabilityWeights[snackAttributeSemantics[item.attribute]?.reliability ?? "LOW"]; total+=w; if(item.correct)correct+=w;} return total ? correct/total : 0; }

export interface RaterRange { min: number; max: number; }
export function aggregateRaterRanges(ranges: RaterRange[]) {
  if (!ranges.length) return null; const mins=ranges.map(r=>r.min).sort((a,b)=>a-b); const maxs=ranges.map(r=>r.max).sort((a,b)=>a-b); const mid=Math.floor(ranges.length/2);
  return { median:{min:mins[mid],max:maxs[mid]}, intersection:{min:Math.max(...mins),max:Math.min(...maxs)}, union:{min:Math.min(...mins),max:Math.max(...maxs)}, disagreement:Math.max(...maxs)-Math.min(...mins) };
}

export function classifyModelRelation(first: AttributeEvaluationCase, second: AttributeEvaluationCase): "MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT" | "MODEL_DISAGREEMENT" | "NONE" {
  const disagreement=Math.abs(first.predictedValue-second.predictedValue);
  if(!first.correct&&!second.correct&&first.rangeDistance>=.1&&second.rangeDistance>=.1&&disagreement<=.1)return "MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT";
  if(disagreement>=.35)return "MODEL_DISAGREEMENT";
  return "NONE";
}

export const snackRiskPolicy: Record<string, number> = { fried:.6, broth:.9, cheesy:.8, spiciness:.85, crispy:.85, hearty:Number.POSITIVE_INFINITY, sweetness:Number.POSITIVE_INFINITY, chewy:Number.POSITIVE_INFINITY };
export function simulateReviewPolicy(cases: AttributeEvaluationCase[], thresholdFor: (attribute:string)=>number) { const reviewed=cases.filter(c=>c.confidence<thresholdFor(c.attribute)); const auto=cases.filter(c=>c.confidence>=thresholdFor(c.attribute)); const dangerous=auto.filter(c=>c.rangeDistance>=.2); return { reviewCount:reviewed.length, autoApprovalRate:auto.length/cases.length, autoApprovalAccuracy:auto.length?auto.filter(c=>c.correct).length/auto.length:0, dangerousMissCount:dangerous.length, moderate:dangerous.length, severe:dangerous.filter(c=>c.rangeDistance>=.35).length, critical:dangerous.filter(c=>c.rangeDistance>=.5).length }; }
