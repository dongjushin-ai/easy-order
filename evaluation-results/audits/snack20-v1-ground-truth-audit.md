# snack20-v1 Ground Truth & Attribute Audit

- Source baseline: snack20-2026-08-23-v1
- API calls: none
- Ground Truth mutation: none
- Proposed next version: snack20-v2 only after human review

## 1. Attribute operational definitions

### spiciness

- Definition: 조리된 기본 메뉴 자체에서 느껴지는 고추·매운 양념의 체감 강도
- Ambiguity: SEMI_SUBJECTIVE
- Ground Truth reliability: MEDIUM
- AI suitability: Tier B
- 0 / 0.25 / 0.5 / 0.75 / 1.0: 전혀 맵지 않음 / 약한 매운 요소 / 일반적인 중간 매운맛 / 대부분 맵다고 인식 / 매운맛이 핵심인 매우 매운 메뉴
- Valid evidence: 고추·매운 소스, 맵기 단계, 조리법과 기본 레시피
- Do not use as evidence: 개인 내성, 추가 소스 선택, 메뉴 이름만의 홍보 표현

### fried

- Definition: 메뉴 주재료가 기름에 튀겨진 정도와 튀김 조리법의 중심성
- Ambiguity: OBJECTIVE
- Ground Truth reliability: HIGH
- AI suitability: Tier A
- 0 / 0.25 / 0.5 / 0.75 / 1.0: 튀기지 않음 / 일부 토핑만 튀김 / 튀김 요소와 비튀김 요소가 혼합 / 대부분 튀김 / 메뉴 전체가 튀김 중심
- Valid evidence: 조리법, 튀김옷, 메뉴 구성
- Do not use as evidence: 바삭하다는 표현만 사용, 기름진 맛의 주관적 인상

### broth

- Definition: 완성 메뉴에서 액체 국물이 차지하는 비중과 식사의 중심성
- Ambiguity: OBJECTIVE
- Ground Truth reliability: HIGH
- AI suitability: Tier A
- 0 / 0.25 / 0.5 / 0.75 / 1.0: 국물 없음 / 소스·자작한 수분 / 건더기와 국물이 비슷 / 국물이 주요 구성 / 국물 중심 메뉴
- Valid evidence: 제공 형태, 국물 양, 탕·국·면 조리법
- Do not use as evidence: 소스가 있다는 사실만으로 국물로 판단, 수분감에 대한 추측

### hearty

- Definition: 일반적인 성인 1인 기준으로 주식 역할, 통상 제공량, 탄수화물·단백질 구성에 근거한 한 끼 대체 가능성
- Ambiguity: SUBJECTIVE
- Ground Truth reliability: LOW
- AI suitability: Tier C
- 0 / 0.25 / 0.5 / 0.75 / 1.0: 작은 곁들임 / 가벼운 간식 / 보통 간식 또는 작은 식사 / 대체로 한 끼 가능 / 충분한 한 끼 또는 큰 식사
- Valid evidence: 표준 제공량, 주식 포함 여부, 메뉴 구성과 1인분 기준
- Do not use as evidence: 개인 식사량, 가격만으로 추정, 맛이 진하다는 이유

### sweetness

- Definition: 기본 레시피의 설탕·시럽·단맛 소스와 일반적인 완성 메뉴에서 체감되는 단맛 강도
- Ambiguity: SUBJECTIVE
- Ground Truth reliability: LOW
- AI suitability: Tier C
- 0 / 0.25 / 0.5 / 0.75 / 1.0: 거의 단맛 없음 / 약한 단맛 / 분명하지만 지배적이지 않은 단맛 / 강한 단맛 / 단맛이 핵심인 매우 단 메뉴
- Valid evidence: 설탕·시럽, 달콤한 소스, 레시피 또는 영양 정보
- Do not use as evidence: 탄수화물 함량, 감칠맛, 개인 취향만으로 판단

### cheesy

- Definition: 치즈의 실제 포함 여부와 완성 메뉴에서 치즈 풍미가 차지하는 비중
- Ambiguity: OBJECTIVE
- Ground Truth reliability: HIGH
- AI suitability: Tier A
- 0 / 0.25 / 0.5 / 0.75 / 1.0: 치즈 없음 / 소량 토핑 / 치즈가 인지되나 보조적 / 치즈 풍미가 강함 / 치즈가 메뉴의 핵심
- Valid evidence: 재료 목록, 치즈 양, 메뉴 옵션
- Do not use as evidence: 크리미하다는 표현만으로 판단, 유제품 일반

### chewy

- Definition: 씹을 때의 탄성, 저항, 반복 저작 필요도를 합친 완성 메뉴 주재료의 식감
- Ambiguity: SUBJECTIVE
- Ground Truth reliability: LOW
- AI suitability: Tier C
- 0 / 0.25 / 0.5 / 0.75 / 1.0: 거의 씹는 저항 없음 / 부드럽고 약한 저항 / 보통의 씹힘 / 뚜렷한 탄성과 저항 / 매우 높은 탄성과 반복 저작 필요
- Valid evidence: 주재료 물성, 조리 후 식감, 쫄깃·탄력 표현
- Do not use as evidence: 질기다는 부정 표현과 동일시, 재료 이름만으로 절대값 확정

### crispy

- Definition: 완성 직후 씹을 때 발생하는 표면 파쇄감과 바삭한 식감의 비중
- Ambiguity: SEMI_SUBJECTIVE
- Ground Truth reliability: MEDIUM
- AI suitability: Tier B
- 0 / 0.25 / 0.5 / 0.75 / 1.0: 바삭함 없음 / 일부 표면만 약함 / 바삭함과 부드러움 혼합 / 뚜렷하게 바삭함 / 전체적으로 매우 바삭함
- Valid evidence: 튀김옷·굽기, 표면 식감, 제공 직후 조리 상태
- Do not use as evidence: fried 값과 자동 동일시, 보관 후 상태를 기본값으로 사용

## 2. Ambiguity classification

- Objective / observable: fried, broth, cheesy
- Semi-subjective: spiciness, crispy
- Highly subjective / context-dependent: hearty, sweetness, chewy

The weakest attributes combine multiple latent concepts: hearty mixes portion, meal-likeness, and satiety; chewy mixes elasticity, resistance, and texture density. Keep the v1 schema for baseline compatibility, but review renaming or splitting before v2.

## 3. Model conflicts

| Type | Menu | Attribute | Expected | Luna (conf) | Terra (conf) | Disagreement | Suggested action |
|---|---|---|---|---:|---:|---:|---|
| MODEL_DISAGREEMENT | tteokbokki | broth | 0.23~0.47 | 0.00 (0.85) | 0.50 (0.45) | 0.50 | KEEP |
| MODEL_DISAGREEMENT | spicy-tteokbokki | broth | 0.23~0.47 | 0.00 (0.85) | 0.50 (0.45) | 0.50 | KEEP |
| MODEL_DISAGREEMENT | spicy-tteokbokki | sweetness | 0.23~0.47 | 0.50 (0.35) | 0.00 (0.30) | 0.50 | KEEP |
| MODEL_DISAGREEMENT | rose-tteokbokki | spiciness | 0.23~0.47 | 0.50 (0.40) | 0.00 (0.35) | 0.50 | KEEP |
| MODEL_DISAGREEMENT | rose-tteokbokki | broth | 0.33~0.57 | 0.00 (0.85) | 0.50 (0.45) | 0.50 | KEEP |
| MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT | rose-tteokbokki | hearty | 0.68~0.92 | 0.50 (0.55) | 0.50 (0.65) | 0.00 | ATTRIBUTE_DEFINITION_REVIEW |
| MODEL_DISAGREEMENT | rose-tteokbokki | sweetness | 0.43~0.67 | 0.50 (0.35) | 0.00 (0.30) | 0.50 | KEEP |
| MODEL_DISAGREEMENT | rose-tteokbokki | cheesy | 0.23~0.47 | 0.50 (0.45) | 0.00 (0.30) | 0.50 | KEEP |
| MODEL_DISAGREEMENT | cheese-tteokbokki | broth | 0.23~0.47 | 0.00 (0.85) | 0.50 (0.45) | 0.50 | KEEP |
| MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT | cheese-tteokbokki | hearty | 0.73~0.97 | 0.50 (0.55) | 0.50 (0.65) | 0.00 | ATTRIBUTE_DEFINITION_REVIEW |
| MODEL_DISAGREEMENT | cheese-tteokbokki | sweetness | 0.43~0.67 | 0.50 (0.35) | 0.00 (0.30) | 0.50 | KEEP |
| MODEL_DISAGREEMENT | rabokki | sweetness | 0.38~0.62 | 0.50 (0.35) | 0.00 (0.30) | 0.50 | KEEP |
| MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT | gimbap | hearty | 0.63~0.87 | 0.50 (0.70) | 0.50 (0.60) | 0.00 | ATTRIBUTE_DEFINITION_REVIEW |
| MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT | cheese-gimbap | hearty | 0.73~0.97 | 0.50 (0.65) | 0.50 (0.60) | 0.00 | ATTRIBUTE_DEFINITION_REVIEW |
| MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT | cheese-gimbap | sweetness | 0.13~0.37 | 0.00 (0.50) | 0.00 (0.35) | 0.00 | ATTRIBUTE_DEFINITION_REVIEW |
| MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT | sundae | hearty | 0.63~0.87 | 0.50 (0.60) | 0.50 (0.60) | 0.00 | ATTRIBUTE_DEFINITION_REVIEW |
| MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT | vegetable-fried | sweetness | 0.13~0.37 | 0.00 (0.50) | 0.00 (0.35) | 0.00 | ATTRIBUTE_DEFINITION_REVIEW |
| MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT | jjolmyeon | hearty | 0.63~0.87 | 0.50 (0.65) | 0.50 (0.65) | 0.00 | ATTRIBUTE_DEFINITION_REVIEW |
| MODEL_DISAGREEMENT | jjolmyeon | sweetness | 0.28~0.52 | 0.50 (0.35) | 0.00 (0.35) | 0.50 | KEEP |
| MODEL_CONSENSUS_GROUND_TRUTH_CONFLICT | fried-dumplings | sweetness | 0.23~0.47 | 0.00 (0.45) | 0.00 (0.35) | 0.00 | ATTRIBUTE_DEFINITION_REVIEW |

## 4. Description quality

| Menu | Quality | Attribute signals | Description |
|---|---|---|---|
| 기본 떡볶이 | GOOD | spiciness, sweetness, chewy | 달콤하고 매콤한 소스와 쫄깃한 떡 |
| 매운 떡볶이 | PARTIAL | spiciness, chewy | 강한 매운맛의 쫄깃한 떡볶이 |
| 로제 떡볶이 | PARTIAL | cheesy | 부드러운 로제 소스의 떡볶이 |
| 치즈 떡볶이 | PARTIAL | spiciness, cheesy | 치즈를 듬뿍 올린 매콤한 떡볶이 |
| 라볶이 | PARTIAL | spiciness | 떡과 라면을 함께 즐기는 매콤한 메뉴 |
| 김밥 | POOR | none | 채소와 밥을 넣어 말아낸 기본 김밥 |
| 참치김밥 | PARTIAL | hearty | 참치와 채소가 들어간 든든한 김밥 |
| 치즈김밥 | PARTIAL | cheesy | 고소한 치즈가 들어간 김밥 |
| 순대 | PARTIAL | chewy | 부드럽고 쫄깃한 찹쌀 순대 |
| 튀김 모둠 | PARTIAL | fried, crispy | 여러 재료를 바삭하게 튀긴 모둠 |
| 김말이 | PARTIAL | fried, crispy | 당면을 김에 말아 바삭하게 튀긴 메뉴 |
| 오징어튀김 | PARTIAL | fried, crispy | 오징어를 바삭하게 튀긴 메뉴 |
| 야채튀김 | PARTIAL | fried, crispy | 채소를 큼직하게 넣은 바삭한 튀김 |
| 어묵 | PARTIAL | broth | 따뜻한 어묵 국물과 함께 먹는 꼬치 어묵 |
| 어묵탕 | PARTIAL | broth, hearty | 여러 어묵이 들어간 따뜻하고 넉넉한 국물 |
| 라면 | GOOD | spiciness, broth, hearty | 얼큰한 국물의 든든한 라면 |
| 우동 | PARTIAL | broth | 순하고 따뜻한 국물의 굵은 면 |
| 쫄면 | PARTIAL | spiciness, chewy | 매콤한 양념과 매우 쫄깃한 면 |
| 비빔만두 | PARTIAL | spiciness, crispy | 바삭한 만두와 매콤한 채소무침 |
| 주먹밥 | POOR | none | 김가루와 밥을 뭉친 가벼운 메뉴 |

## 5. Description regression cases

| Model | Menu | Attribute | Name-only | Description | Expected | Cause |
|---|---|---|---:|---:|---:|---|
| gpt-5.6-luna | tteokbokki | spiciness | 0.50 | 0.75 | 0.48~0.72 | GROUND_TRUTH_TOO_NARROW |
| gpt-5.6-luna | tteokbokki | sweetness | 0.50 | 0.75 | 0.48~0.72 | ATTRIBUTE_AMBIGUOUS |
| gpt-5.6-luna | rose-tteokbokki | broth | 0.50 | 0.00 | 0.33~0.57 | DESCRIPTION_CAUSED_CONFUSION |
| gpt-5.6-luna | cheese-tteokbokki | spiciness | 0.50 | 0.75 | 0.38~0.62 | DESCRIPTION_CAUSED_CONFUSION |
| gpt-5.6-luna | rabokki | broth | 0.50 | 0.25 | 0.43~0.67 | DESCRIPTION_CAUSED_CONFUSION |
| gpt-5.6-luna | rabokki | hearty | 1.00 | 0.75 | 0.83~1.00 | ATTRIBUTE_AMBIGUOUS |
| gpt-5.6-luna | gimbap | hearty | 0.75 | 0.50 | 0.63~0.87 | ATTRIBUTE_AMBIGUOUS |
| gpt-5.6-luna | cheese-gimbap | hearty | 0.75 | 0.50 | 0.73~0.97 | ATTRIBUTE_AMBIGUOUS |
| gpt-5.6-luna | cheese-gimbap | cheesy | 1.00 | 0.75 | 0.78~1.00 | GROUND_TRUTH_TOO_NARROW |
| gpt-5.6-luna | sundae | hearty | 0.75 | 0.50 | 0.63~0.87 | ATTRIBUTE_AMBIGUOUS |
| gpt-5.6-luna | fishcake | sweetness | 0.25 | 0.00 | 0.08~0.32 | ATTRIBUTE_AMBIGUOUS |
| gpt-5.6-luna | fishcake-soup | sweetness | 0.25 | 0.00 | 0.08~0.32 | ATTRIBUTE_AMBIGUOUS |
| gpt-5.6-luna | udon | sweetness | 0.25 | 0.00 | 0.03~0.27 | ATTRIBUTE_AMBIGUOUS |
| gpt-5.6-luna | fried-dumplings | spiciness | 0.50 | 0.75 | 0.43~0.67 | GROUND_TRUTH_TOO_NARROW |
| gpt-5.6-luna | fried-dumplings | crispy | 0.75 | 1.00 | 0.73~0.97 | GROUND_TRUTH_TOO_NARROW |
| gpt-5.6-terra | rose-tteokbokki | sweetness | 0.50 | 0.00 | 0.43~0.67 | ATTRIBUTE_AMBIGUOUS |
| gpt-5.6-terra | cheese-tteokbokki | sweetness | 0.50 | 0.00 | 0.43~0.67 | ATTRIBUTE_AMBIGUOUS |
| gpt-5.6-terra | rabokki | sweetness | 0.50 | 0.00 | 0.38~0.62 | ATTRIBUTE_AMBIGUOUS |
| gpt-5.6-terra | cheese-gimbap | cheesy | 1.00 | 0.50 | 0.78~1.00 | DESCRIPTION_CAUSED_CONFUSION |
| gpt-5.6-terra | jjolmyeon | sweetness | 0.50 | 0.00 | 0.28~0.52 | ATTRIBUTE_AMBIGUOUS |

## 6. Reliability-weighted metric

- Luna ordinary accuracy: 66.3%
- Luna reliability-weighted accuracy: 74.6%
- Terra ordinary accuracy: 63.7%
- Terra reliability-weighted accuracy: 74.2%

This is supplemental and does not replace Range Accuracy.

## 7. Risk-aware review simulation

| Model | Policy | Review count | Auto approval | Auto accuracy | Moderate | Severe | Critical |
|---|---|---:|---:|---:|---:|---:|---:|
| gpt-5.6-luna | Global 0.8 | 60 | 62.5% | 80.0% | 5 | 0 | 0 |
| gpt-5.6-luna | Attribute-specific | 78 | 51.2% | 89.0% | 0 | 0 | 0 |
| gpt-5.6-terra | Global 0.8 | 70 | 56.3% | 88.9% | 2 | 1 | 1 |
| gpt-5.6-terra | Attribute-specific | 89 | 44.4% | 95.8% | 1 | 0 | 0 |

Attribute-specific candidate: fried 0.6; broth 0.9; cheesy 0.8; spiciness/crispy 0.85; hearty/sweetness/chewy always owner review. This is simulation only.

## 8. Suggested v2 review list

- KEEP HIGH-reliability ranges unless menu facts prove them wrong.
- Review hearty definition first; consider separating meal-likeness from portion/satiety.
- Review sweetness ranges against recipes or a human panel, not model consensus alone.
- Review chewy anchors with explicit texture examples before changing ranges.
- Consider WIDEN_RANGE/SHIFT_RANGE only for the conflict rows above after human adjudication.
- Preserve snack20-v1 and publish changes only as snack20-v2.

## 9. Inter-rater preparation

Raters may submit numeric min/max independently. The helper computes median range, intersection, union, and disagreement. Empty intersections must be adjudicated rather than silently averaged.
