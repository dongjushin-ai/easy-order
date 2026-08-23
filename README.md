# EasyOrder

> **질문 몇 번으로 원하는 메뉴까지.**  
> 기존 키오스크의 복잡한 메뉴 탐색 방식을, 사용자 의도 중심의 동적 질문 흐름으로 바꾸는 범용 키오스크 추천 SDK/프로토타입.

## 1. 프로젝트 개요

EasyOrder는 디지털 기기 사용에 익숙하지 않은 고령층을 포함해, 복잡한 키오스크 메뉴 구조에서 원하는 메뉴를 찾기 어려운 사용자를 위한 **접근성 중심 주문 보조 시스템**이다.

프로젝트의 출발점은 단순했다. 사용자가 “아이스 아메리카노를 마시고 싶다”는 명확한 목적을 가지고 매장에 들어왔는데도, 기존 키오스크에서는 카테고리 → 하위 카테고리 → 메뉴 → 옵션을 직접 탐색해야 한다. 메뉴 수가 많고 UI가 복잡할수록 이 과정은 불필요한 인지 부담이 된다.

EasyOrder는 이를 ‘메뉴판을 잘 탐색하는 문제’가 아니라 **사용자의 의도를 몇 번의 명확한 질문으로 좁히는 문제**로 재정의했다. 아키네이터의 스무고개 방식에서 착안해, 현재 메뉴 후보를 가장 잘 구분하는 질문을 동적으로 선택하고 사용자의 답변을 누적해 최종 후보를 3~5개 수준으로 줄인다.

핵심 목표는 특정 카페용 앱을 만드는 것이 아니라, **카페·분식점·패스트푸드점 등 어떤 매장이든 메뉴 데이터만 연결하면 사용할 수 있는 Store-agnostic 엔진/SDK 구조**를 만드는 것이다.

---

## 2. 문제 정의

기존 키오스크의 주요 문제를 다음과 같이 정의했다.

- 사용자가 메뉴 구조를 이해하고 직접 탐색해야 한다.
- 카테고리 분류가 매장 중심이며 사용자 의도 중심이 아니다.
- 한 번 잘못 누르면 탐색 경로가 크게 틀어지거나 처음부터 다시 찾아야 한다.
- 메뉴명만으로 맛, 카페인, 포만감, 맵기 등 실제 선택 기준을 파악하기 어렵다.
- 고령층이나 인지적 부담이 큰 사용자에게 작은 글씨, 많은 선택지, 복잡한 화면 전환이 부담이 된다.
- 점주 입장에서는 추천 시스템을 도입하기 위해 모든 메뉴 속성을 직접 데이터화하는 작업도 부담이다.

따라서 EasyOrder는 다음 원칙을 채택했다.

1. **한 화면에 하나의 명확한 질문**
2. **Hard Filtering 대신 오답 허용형 Soft Scoring**
3. **현재 후보를 가장 잘 구분하는 동적 질문 선택**
4. **‘잘 모르겠어요’, 이전으로, 처음으로, 직원 도움 제공**
5. **메뉴가 정해진 사용자는 검색/직접 선택으로 우회**
6. **AI는 최종 주문 판단자가 아니라 점주 데이터 입력을 보조하는 계층으로 사용**
7. **최종 추천 과정은 검증 가능한 deterministic engine으로 유지**

---

## 3. 핵심 사용자 흐름

### 고객용 키오스크

`시작 → 직접 검색 또는 추천받기 → 동적 질문 → 추천 결과 → 메뉴 옵션 → 장바구니 → 결제 방식 → 결제 시뮬레이션 → 주문 완료`

추천 흐름에서는 사용자의 답변을 이용해 메뉴 점수를 갱신하고, 매 단계마다 정보량이 높은 다음 질문을 선택한다. 후보가 충분히 좁혀지면 상위 메뉴를 보여준다.

### 점주용 온보딩

`원본 메뉴 입력 → AI Attribute Enrichment → confidence/needsReview → Owner Review → 확정 Store JSON → Question Generator → 키오스크 엔진`

점주는 메뉴명과 가격, 선택적으로 메뉴 설명만 입력해도 된다. AI가 메뉴 속성을 추정하고, 불확실한 값만 점주 검토 화면으로 보낸다. 점주가 확정한 값은 `OWNER_EXPLICIT`로 보호되어 이후 재분석에서도 AI가 덮어쓰지 않는다.

---

## 4. 핵심 기술 설계

### 4.1 범용 Attribute Vector

초기에는 카페 메뉴의 `coffee`, `sweetness`, `milk`, `caffeine`, `refreshing` 등을 사용했지만, 특정 업종에 종속되지 않도록 범용 Attribute Vector로 일반화했다.

예를 들어 분식점은 `spiciness`, `fried`, `hearty`, `broth` 같은 자체 속성을 추가할 수 있다. 매장별 Attribute Schema가 숫자형/범주형 속성과 허용 범위를 정의하며, 동일한 scoring·question selection 엔진이 이를 처리한다.

### 4.2 Soft Scoring

답변과 맞지 않는 메뉴를 즉시 삭제하지 않는다. 각 답변이 메뉴별 점수에 가중치로 반영된다.

이 방식의 목적은 사용자가 한두 번 잘못 누르거나 애매하게 답해도 원하는 메뉴가 후보군에서 영구적으로 사라지지 않게 하는 것이다. 답변 이력은 reducer에서 관리되며 ‘이전으로’를 선택하면 해당 답변의 영향을 정확히 롤백한다.

### 4.3 Dynamic Question Selection

질문 순서를 하드코딩하지 않는다. 현재 후보군을 각 질문의 선택지별로 나누었을 때 얼마나 효과적으로 후보를 구분하는지 평가하고, Information Gain/Entropy 및 분할 품질을 기반으로 다음 질문을 선택한다.

후보가 3~5개 수준으로 좁혀졌거나 더 이상 유효한 질문이 없으면 질문을 종료하고 추천 결과를 보여준다.

### 4.4 Dynamic Question Generator

매장마다 질문 목록을 직접 작성하지 않아도 되도록 메뉴 속성 분포를 분석해 변별력이 있는 속성만 질문 후보로 생성한다. 속성값이 모든 메뉴에서 거의 동일하다면 해당 질문은 의미가 없으므로 제외한다.

질문 표현은 schema와 review choice/template 계층을 통해 데이터 기반으로 구성하며, React 코드에 카페 전용 속성을 하드코딩하지 않는다.

### 4.5 AI Attribute Enrichment

점주가 모든 메뉴를 직접 수치화해야 하는 문제를 줄이기 위해 AI Attribute Enrichment Layer를 추가했다.

입력:
- 메뉴명
- 가격
- 선택적 메뉴 설명
- 같은 매장의 다른 메뉴 문맥
- Attribute Schema

출력:
- 속성값
- confidence
- evidence/source
- needsReview

실제 OpenAI 연결은 서버에서만 수행되며 브라우저에는 API key가 노출되지 않는다. Responses API의 strict JSON Schema Structured Outputs와 runtime validation을 사용한다.

네트워크 오류, 429/5xx, timeout, invalid JSON, schema mismatch, 일부 메뉴 누락 등에 대비해 retry·partial fallback 구조를 두었고, 정상 결과는 유지하면서 문제가 있는 항목만 fallback/review 대상으로 보낸다.

### 4.6 Human-in-the-loop Owner Review

AI가 추정한 결과를 그대로 운영 데이터로 사용하지 않는다.

Owner Review Dashboard는 낮은 confidence, 이름 기반 추정, 낮은 변별력/모호성 등을 기준으로 Review Queue를 만든다. 점주는 숫자형 속성을 단계형 선택 UI로, 범주형 속성을 schema 기반 옵션으로 검토할 수 있다.

점주가 승인하거나 수정하면 해당 값은 confidence 1.0 및 `OWNER_EXPLICIT` 상태로 확정된다.

### 4.7 주문/결제 상태 관리

React + `useReducer` 기반으로 추천뿐 아니라 실제 키오스크 주문 흐름까지 연결했다.

- 메뉴별 옵션 및 수량
- 옵션이 다른 동일 메뉴를 별도 장바구니 항목으로 관리
- 수량 증감/삭제 확인
- 빈 장바구니 결제 방지
- 카드/간편결제 선택
- 결제 성공/카드 인식 실패/승인 실패/사용자 취소
- 실패 후 장바구니 유지 및 재시도
- 중복 터치/중복 결제 방지
- 주문 완료 후 자동 초기화

---

## 5. 접근성 및 UX

EasyOrder는 ‘노인용 UI’라는 별도 제품보다는 **누구에게나 쉬운 Universal Design**을 지향한다.

구현된 주요 원칙:

- 한 화면 한 질문
- 큰 글씨와 최소 48~56px 터치 영역
- `글자 크게 보기` Large Text Mode
- 색상만으로 선택 상태를 표현하지 않고 테두리와 `✓ 선택됨` 문구 병행
- 항상 접근 가능한 이전/처음/잘 모르겠어요/직원 도움
- 주문 진행 1~4단계 표시
- 삭제 확인 모달
- `aria-live`, dialog semantics
- 결제 실패 시 상태 보존과 복구 경로
- 세로형 9:16 키오스크 레이아웃 대응

남은 접근성 QA 항목은 실제 세로형 터치 장치에서 Large Text overflow, 완전한 focus trap, modal 종료 후 focus 복원 등이다.

---

## 6. 기술 스택

| 영역 | 기술 |
|---|---|
| Language | TypeScript |
| Frontend | React, Vite |
| State | React `useReducer` |
| Styling | CSS / 터치 키오스크 전용 반응형 레이아웃 |
| Recommendation | Soft Scoring, Information Gain / Entropy |
| Data Model | Store-agnostic Attribute Schema / Vector |
| AI Integration | OpenAI Responses API, Structured Outputs |
| AI Architecture | Provider pattern, batch inference, retry, timeout, fallback |
| Server | Lightweight Node API endpoint |
| Persistence | LocalStorage (Owner Review 임시 저장) |
| Validation | TypeScript + runtime validation |
| Testing | deterministic unit/regression tests, AI integration/evaluation tests |
| Tooling | VS Code, Codex, npm, tsx |

---

## 7. 프로젝트 구조

```text
src/
  app/
    kioskReducer.ts
  data/
    stores.ts
    storeLoader.ts
    ownerDemoStores.ts
  engine/
    scoring.ts
    selector.ts
    questionGenerator.ts
  enrichment/
    batch.ts
    prompt.ts
    ...
  evaluation/
    megaMgcGroundTruth.ts
    metrics.ts
    evaluation.test.ts
  input/
    textParser.ts
  owner/
    OwnerReviewDashboard.tsx
    ownerReviewReducer.ts
    reviewControls.ts
    validation.ts
  types/
    menu.ts
    question.ts
    store.ts
    order.ts
    input.ts
  ui/
    QuestionScreen.tsx
    RecommendationScreen.tsx
    SearchScreen.tsx
    MenuDetailScreen.tsx
    CartScreen.tsx
    PaymentScreen.tsx
    PaymentProcessingScreen.tsx
    PaymentFailureScreen.tsx
    OrderCompleteScreen.tsx
    OrderProgress.tsx

server/
  OpenAIAttributeProvider.ts
  evaluation/
    runAiEvaluation.ts

evaluation-results/
  latest.json
  latest.md
```

실제 파일 구성은 개발 과정에 따라 일부 달라질 수 있다.

---

## 8. 테스트 및 안정성

현재까지 다음 검증 흐름을 구축했다.

- 추천 엔진 회귀 테스트
- Multi-store 테스트
- Custom Attribute 테스트
- Question Generator 테스트
- 장바구니 수량/삭제/중복 방지 테스트
- 결제 실패 및 재시도 테스트
- Store reset/전환 테스트
- AI batch chunking
- partial fallback
- OWNER_EXPLICIT 보존
- AI 출력 순서 변경에 대한 `menuId` 매핑
- duplicate/missing/unknown ID 방어
- invalid JSON/timeout failure injection
- 실제 OpenAI smoke/integration evaluation

기본 품질 게이트:

```bash
npm test
npm run typecheck
npm run build
```

AI 연결 확인:

```bash
npm run test:ai
npm run evaluate:ai
```

---

## 9. 실제 AI Evaluation

MegaMGC 대표 메뉴 20개에 사람이 정의한 Ground Truth range를 구성하고 실제 모델 평가 harness를 만들었다.

측정 항목:
- Range Accuracy
- Range-aware Error
- Profile Accuracy
- Temperature Accuracy
- Review Recall
- Unnecessary Review Rate
- Auto Approval Rate
- Confidence Calibration
- Dangerous Miss
- Name-only vs Description
- Single vs Batch Context
- 모델별 latency/token usage

### 2026-08-23 평가 결과

| Model / Input / Context | Range Accuracy | Profile Accuracy | Dangerous Miss |
|---|---:|---:|---:|
| GPT-5.6 Luna / Description / Batch | 93.6% | 55.0% | 1 |
| GPT-5.6 Luna / Name-only / Batch | 89.3% | 55.0% | 0 |
| GPT-5.6 Luna / Description / Single | 89.3% | 55.0% | 최대 1 |
| GPT-5.6 Terra / Description / Batch | 90.7% | 75.0% | 0 |
| GPT-5.6 Terra / Name-only / Batch | 93.6% | 85.0% | 0 |
| GPT-5.6 Terra / Description / Single | 76.4% | 40.0% | threshold에 따라 최대 2 |

현재 결과에서는 **Batch inference가 Single inference보다 정확도와 latency 모두 유리**했다. 특히 Terra는 Description/Batch 90.7%에서 Description/Single 76.4%로 크게 하락했다.

또한 Terra의 Description/Batch는 threshold 0.4에서:
- Review Recall: 92.3%
- Auto Approval: 80.0%
- Dangerous Miss: 0

을 기록해 Human-in-the-loop 구조와 잘 맞는 후보로 나타났다.

다만 현재 평가는 20개 메뉴 기반이므로 production model과 threshold는 아직 영구 확정하지 않았다. 특히 `Largest errors` 표기 의미, Profile Accuracy 정의, Description이 일부 실험에서 Name-only보다 낮게 나온 원인은 추가 감사가 필요하다.

---

## 10. 설계에서 중요하게 본 점

### AI가 추천 엔진 자체가 아니다

이 프로젝트에서 AI는 메뉴를 직접 최종 추천하는 역할이 아니다. AI의 역할은 점주가 제공한 비정형 메뉴 정보를 **추천 엔진이 사용할 수 있는 구조화 데이터로 변환하는 것**이다.

최종 사용자 추천은 검토·확정된 Attribute를 사용하는 deterministic scoring/question engine이 담당한다.

이 분리는 다음 장점이 있다.

- AI hallucination이 주문 결과를 직접 지배하지 않음
- AI Provider 교체 가능
- AI 장애 시 fallback 가능
- 점주가 데이터에 최종 책임을 가질 수 있음
- 추천 결과를 테스트하고 재현하기 쉬움

### 오답 허용이 핵심이다

접근성 시스템에서 사용자가 항상 정확하게 입력한다고 가정하면 안 된다. 따라서 한 번의 잘못된 답변으로 메뉴를 제거하는 Hard Filter보다 점수를 누적하는 Soft Scoring을 사용했다.

### 매장 독립성을 우선했다

카페 전용 기능을 빠르게 만드는 것보다, Attribute Schema와 Store Loader를 먼저 일반화했다. 그 결과 분식점의 `spiciness`, `fried`, `hearty`, `broth` 같은 완전히 다른 속성도 동일 엔진에서 동작한다.

---

## 11. 현재 완성된 범위

### 구현 완료

- 범용 Store/Menu/Attribute Schema
- Soft Scoring
- Dynamic Question Selector
- Dynamic Question Generator
- 텍스트 입력 Parser
- 카페/분식점 Multi-store
- 고객용 React 키오스크 UI
- 검색 및 추천 투트랙 진입
- 메뉴 옵션/수량
- 장바구니
- 결제 성공/실패/재시도 시뮬레이션
- 중복 터치 방어
- Large Text Mode
- 접근성 기본 처리
- AI Attribute Enrichment
- OpenAI Provider
- batch/retry/timeout/partial fallback
- Owner Review Dashboard
- LocalStorage persistence
- Store JSON export
- AI Evaluation Harness
- 실제 OpenAI smoke 및 20-menu evaluation

### 아직 남은 부분

- 실제 키오스크 하드웨어에서 터치/스크롤 QA
- focus trap 및 focus restoration 강화
- 장바구니 항목의 옵션 직접 수정
- 점주 로그인/계정
- 서버 DB persistence
- 실제 POS/PG 연동
- 메뉴 품절/재고 실시간 연동
- 더 큰 다업종 evaluation dataset
- AI evaluation metric/report 감사
- production model/threshold 최종 확정

---

## 12. 향후 로드맵

1. **Evaluation Harness 감사**
   - Largest Error 표기 명확화
   - Profile Accuracy 정의 검증
   - Dangerous Miss 계산 재검증

2. **다업종 데이터셋 확대**
   - 카페 50~100개 이상
   - 분식
   - 패스트푸드
   - 샌드위치/샐러드 등

3. **Production AI 설정 확정**
   - primary/fallback model
   - review threshold
   - batch size

4. **점주 SaaS화**
   - 로그인
   - 매장 생성
   - 메뉴 업로드/수정
   - 서버 저장
   - 배포/버전 관리

5. **실매장 연동**
   - POS adapter
   - 결제 adapter
   - 재고/품절
   - 실제 키오스크 디바이스 QA

---

## 13. 프로젝트의 차별점

EasyOrder의 핵심은 단순히 “AI가 메뉴를 추천하는 키오스크”가 아니다.

**접근성 UX + 정보이론 기반 질문 선택 + 오답 허용 추천 + 범용 매장 스키마 + AI 데이터 온보딩 + Human-in-the-loop 검수 + 실제 주문 상태 머신**을 하나의 흐름으로 연결한 것이 핵심이다.

특히 AI를 사용자-facing 추천의 단일 판단자로 두지 않고, 불확실성을 confidence로 노출하고 점주 검토를 거친 뒤 deterministic engine이 추천하도록 설계했다는 점이 프로젝트의 중요한 기술적 방향이다.

---

## 14. 개발 동기 요약

이 프로젝트는 고령층이 키오스크 주문이나 택시 호출 등 일상적인 디지털 서비스에서 어려움을 겪는 사례를 보고 시작했다.

기존 키오스크를 단순히 “글씨를 크게 만든 버전”으로 바꾸는 것만으로는 충분하지 않다고 판단했다. 문제는 화면 크기뿐 아니라 **사용자가 복잡한 정보 구조를 직접 이해하고 탐색해야 한다는 것**에 있다고 보았다.

그래서 사용자가 메뉴 구조를 배우는 대신, 시스템이 사용자의 의도를 이해하기 쉬운 질문으로 좁혀가도록 방향을 바꾸었다.

그 결과 EasyOrder는 접근성 문제에서 시작해, 범용 추천 엔진·AI-assisted onboarding·Human-in-the-loop 데이터 품질 관리까지 확장된 프로젝트가 되었다.

---

## 15. Status

**Current stage: Functional MVP + AI onboarding/evaluation prototype**

핵심 추천부터 주문 완료까지 전체 사용자 흐름이 구현되어 있으며, 점주용 데이터 생성·검토 흐름과 실제 AI evaluation까지 연결된 상태다. 다음 목표는 다업종 데이터로 일반화 성능을 검증하고 실제 키오스크/POS 환경으로 확장하는 것이다.
