# EasyOrder

> **복잡한 메뉴판 대신, 몇 가지 쉬운 질문으로 원하는 메뉴를 찾는 접근성 중심 키오스크**

EasyOrder는 사용자가 수많은 메뉴를 직접 탐색하는 대신, 몇 가지 간단한 질문에 답하면 취향에 맞는 메뉴를 추천받을 수 있도록 설계한 **접근성 중심 메뉴 추천 키오스크 MVP**입니다.

핵심은 단순히 AI에게 “메뉴를 추천해 달라”고 맡기는 것이 아닙니다.

**AI-assisted Menu Analysis → Owner Review → Deterministic Recommendation Engine**

구조를 사용해 AI는 점주의 메뉴 데이터를 추천 엔진이 이해할 수 있는 형태로 정리하는 보조 역할을 수행하고, 실제 고객 추천은 점주가 확인한 데이터를 기반으로 **재현 가능한 Dynamic Question + Soft Scoring Engine**이 담당합니다.

---

## Live Demo

| Page | Link |
|---|---|
| **Live Demo** | https://easy-order-gamma.vercel.app/ |
| **For Business** | https://easy-order-gamma.vercel.app/business |
| **Customer Demo** | https://easy-order-gamma.vercel.app/kiosk?store=cafe |
| **Owner Demo** | https://easy-order-gamma.vercel.app/owner/new?demo=1 |

현재 공개 버전은 포트폴리오용 **Mock AI Demo**입니다. 실제 OpenAI API를 호출하지 않으므로 API Key 없이 고객 키오스크와 점주 온보딩의 핵심 흐름을 체험할 수 있습니다.

---

# Why EasyOrder?

키오스크의 메뉴가 많아질수록 선택지는 늘어나지만, 모든 사용자에게 메뉴 선택이 쉬워지는 것은 아닙니다.

특히 다음과 같은 문제가 있습니다.

- 많은 메뉴를 직접 탐색해야 하는 인지적 부담
- 디지털 환경에 익숙하지 않은 사용자의 키오스크 사용 어려움
- 메뉴 이름만 보고 자신의 취향과 맞는지 판단해야 하는 문제
- 신메뉴나 익숙하지 않은 메뉴가 메뉴판 안에서 쉽게 묻히는 문제
- 직원이 반복적으로 고객의 취향을 듣고 메뉴 추천을 도와야 하는 상황
- 매장마다 별도의 추천 시스템을 구축해야 하는 개발 부담

EasyOrder는 이 문제를 **“더 많은 메뉴를 보여주는 것”이 아니라 “사용자가 원하는 메뉴에 더 쉽게 도달하게 하는 것”**으로 접근했습니다.

---

# Existing Kiosk vs EasyOrder

```mermaid
flowchart LR
    subgraph OLD["일반적인 메뉴 탐색"]
        A1[전체 메뉴 노출] --> A2[카테고리 탐색]
        A2 --> A3[메뉴 비교]
        A3 --> A4[상세 정보 확인]
        A4 --> A5[고객이 직접 결정]
    end

    subgraph EASY["EasyOrder"]
        B1[쉬운 질문] --> B2[취향 좁히기]
        B2 --> B3[Soft Scoring]
        B3 --> B4[추천 후보]
        B4 --> B5[메뉴 선택 및 주문]
    end
```

한 번의 잘못된 답변으로 메뉴를 제거하지 않으며, 여러 답변을 종합해 후보의 상대 점수를 조정합니다.

---

# Customer Experience

고객은 메뉴의 세부 속성을 직접 이해할 필요가 없습니다.

예를 들어 다음과 같은 질문에 답합니다.

> 달콤한 메뉴가 좋으신가요?

> 바삭한 메뉴가 좋으신가요?

> 든든하게 먹고 싶으신가요?

답변이 들어올 때마다 후보 메뉴의 점수가 갱신되고, 현재 후보를 가장 잘 구분할 수 있는 다음 질문이 동적으로 선택됩니다.

지원 기능:

- 한 화면 한 질문
- 큰 터치 영역
- Large Text Mode
- 이전 단계 이동
- 처음부터 다시 시작
- 잘 모르겠어요
- 직원 도움
- 오답 허용
- 결제 실패 후 복구
- 키보드 탐색
- 세로형 키오스크 화면 대응

---

# Core Architecture

```mermaid
flowchart TD
    O[Owner] --> M[Menu Import]
    M --> S[Attribute Schema]
    S --> AI[AI Attribute Enrichment]
    AI --> C[Confidence / Evidence]
    C --> R[Owner Review]
    R --> F[Final Store Data]

    F --> Q[Dynamic Question Generator]
    Q --> SS[Soft Scoring]
    SS --> REC[Recommendation]
    REC --> OPT[Menu Options]
    OPT --> CART[Cart]
    CART --> PAY[Checkout]

    F --> PREVIEW[Store Preview]
```

---

# AI and Recommendation Responsibilities

```mermaid
flowchart LR
    A[Menu Name / Description] --> B[AI-assisted Enrichment]
    B --> C[Attributes + Confidence + Evidence]
    C --> D[Owner Review]
    D --> E[Confirmed Store Data]
    E --> F[Deterministic Recommendation Engine]
    F --> G[Customer Recommendation]
```

### AI가 담당하는 것

- 메뉴 이름/설명 해석
- Attribute 초안 생성
- Confidence 생성
- Evidence 생성
- 점주의 초기 데이터 입력 부담 감소

### Recommendation Engine이 담당하는 것

- 사용자 답변 누적
- 후보 메뉴 점수 계산
- 다음 질문 선택
- 추천 후보 생성

즉 **AI는 데이터를 준비하는 일을 돕고, 고객에게 무엇을 추천할지는 재현 가능한 엔진이 결정합니다.**

---

# Dynamic Question Generation

질문 순서는 고정되어 있지 않습니다.

현재 남아 있는 후보 메뉴들의 Attribute 분포를 분석하고, **Information Gain**을 기준으로 후보를 가장 효율적으로 구분할 수 있는 질문을 선택합니다.

```text
Current Candidates
       ↓
Attribute Distribution
       ↓
Information Gain
       ↓
Next Question
```

---

# Soft Scoring

EasyOrder는 답변과 맞지 않는 메뉴를 즉시 제거하는 Hard Filtering을 사용하지 않습니다.

```text
Hard Filtering

Answer mismatch
      ↓
Menu removed
```

대신 각 답변이 후보 메뉴의 상대 점수를 조정합니다.

```text
Soft Scoring

Answer
  ↓
Score adjustment
  ↓
Candidate ranking changes
  ↓
Menu remains recoverable
```

따라서 사용자가 한 질문에 실수하거나 다소 모순된 답변을 하더라도 좋은 후보가 즉시 사라지지 않습니다.

---

# Store-Agnostic Recommendation Engine

EasyOrder는 특정 카페 메뉴에 종속된 추천기를 만드는 대신, **Store Schema를 바꾸면 같은 추천 코어가 다른 업종에서도 동작하도록** 설계했습니다.

```mermaid
flowchart LR
    CAFE["Cafe Schema<br/>coffee / milk / sweetness / refreshing"] --> CORE[Generic Recommendation Core]
    SNACK["Korean Snack Schema<br/>spiciness / broth / chewy / crispy"] --> CORE
    FAST["Fast Food Schema<br/>fried / cheesy / meaty / fresh"] --> CORE

    CORE --> Q[Dynamic Questions]
    Q --> S[Soft Scoring]
    S --> R[Recommendation]
```

현재 서로 다른 3개 도메인에서 동일 구조의 동작을 검증했습니다.

| Domain | Example Attributes |
|---|---|
| Cafe | sweetness, coffee, milk, refreshing, fruity |
| Korean Snack | spiciness, fried, broth, hearty, chewy, crispy |
| Fast Food | spiciness, fried, cheesy, meaty, greasy, fresh |

---

# Owner Experience

EasyOrder는 점주가 코드 파일을 수정하지 않고 Store를 만들 수 있도록 Owner Onboarding Wizard를 제공합니다.

```mermaid
flowchart LR
    A[매장 정보] --> B[CSV / JSON / 직접 메뉴 입력]
    B --> C[추천 기준 선택]
    C --> D[AI 메뉴 분석 보조]
    D --> E[점주 확인]
    E --> F[Kiosk Preview]
    F --> G[Store Ready]
```

지원 기능:

- 직접 메뉴 입력
- CSV Import
- JSON Import
- 기존 Store JSON 복원
- Cafe / Snack / Fast Food Schema Preset
- Custom Attribute 생성
- 자동 저장
- 설정 이어하기
- 매장 복제
- 매장 삭제
- JSON Backup
- Kiosk Preview

---

# Human-in-the-Loop Owner Review

```mermaid
flowchart TD
    A[AI Attribute Estimate] --> B{확인이 필요한가?}
    B -->|아니오| C[Store Candidate]
    B -->|예| D[Owner Review]
    D --> E[Owner Confirm / Override]
    E --> F[Confirmed Store Data]
    C --> F
    F --> G[Recommendation Engine]
```

점주가 직접 확인한 값은 이후 AI 재분석이 덮어쓰지 않도록 보호됩니다.

---

# Product vs Research

## Product

- Customer Kiosk
- Dynamic Question Generator
- Soft Scoring
- Recommendation
- Menu Options
- Cart
- Checkout
- Owner Dashboard
- Owner Wizard
- AI-assisted Enrichment
- Owner Review
- Store Import / Export
- Business Page

## Research

- AI Evaluation Harness
- Multi-model Evaluation
- Ground Truth Dataset
- Confidence Calibration
- Dangerous Miss Analysis
- Ground Truth Audit
- Automated Stress Test
- Stability Analysis
- Risk Policy Simulation
- Policy Optimization
- Human Adjudication UI

연구 결과가 자동으로 Production Owner Review 정책에 반영되지는 않습니다.

---

# Domain Gap

Description + Batch 조건의 실제 평가에서는 모델 성능이 업종에 따라 크게 달라지는 것을 확인했습니다.

| Dataset | Luna | Terra |
|---|---:|---:|
| Mega Cafe | 93.6% | 90.7% |
| Korean Snack | 66.3% | 63.7% |

![AI Attribute Accuracy by Domain](docs/diagrams/domain-gap.png)

> 제한된 평가 데이터셋의 연구 결과이며 실제 전체 메뉴 또는 실제 매장 환경의 일반적인 AI 성능을 의미하지 않습니다.

---

# Attribute-level Analysis

Korean Snack 20개 메뉴의 Attribute별 Range Accuracy입니다. 각 Attribute의 표본은 `n=20`입니다.

![Snack Attribute Accuracy](docs/diagrams/snack-attribute-accuracy.png)

주요 관찰:

- `fried`: Luna / Terra 모두 100%
- `cheesy`: 95% / 90%
- `broth`: 85% / 85%
- `spiciness`: 80% / 80%
- `crispy`: 75% / 75%
- `hearty`, `sweetness`, `chewy`: 상대적으로 불안정

---

# Automated Stress Test

사람 평가가 없는 상태에서 Ground Truth를 무조건 신뢰하지 않기 위해 Automated Ground Truth Stress Test를 구축했습니다.

```text
Prediction Consistency       25%
Model Agreement              20%
Input Robustness             20%
Ground Truth Hit Rate        20%
Attribute Reliability        15%
```

Snack20의 160개 Menu-Attribute Pair 분류 결과:

```text
STABLE        81
QUESTIONABLE  34
UNRESOLVED    45
```

![Snack Stress-Test Classification](docs/diagrams/stress-test-classification.png)

Provisionally Stable Coverage:

**50.63%**

Stable subset에서:

- Luna: **98.77%**
- Terra: **100%**

다만 이 결과는 **human-verified Ground Truth가 아니라 자동화된 provisional stability 분석 결과**입니다.

---

# Attribute Stable Coverage

![Snack Attribute Stable Coverage](docs/diagrams/stable-coverage.png)

| Attribute | Provisionally Stable Coverage |
|---|---:|
| fried | 100% |
| cheesy | 90% |
| broth | 75% |
| crispy | 75% |
| spiciness | 65% |
| hearty | 0% |
| sweetness | 0% |
| chewy | 0% |

---

# Risk Policy Research

Attribute별 위험도가 다르기 때문에 Confidence Threshold 역시 Attribute별로 다르게 적용할 수 있는 정책을 실험했습니다.

이후 **454,140개 후보 정책**을 탐색하는 설명 가능한 Policy Optimizer도 구현했습니다.

다만 현재 결과는:

> **PROVISIONAL / DATASET_SPECIFIC / NOT_PRODUCTION_VALIDATED**

상태이며 Production 정책으로 자동 적용하지 않습니다.

---

# Reliability & Failure Recovery

| Failure / Mistake | Recovery |
|---|---|
| AI 분석 실패 | Fallback + Owner Review |
| 낮은 AI Confidence | 점주 확인 |
| 고객의 애매한 답변 | Soft Scoring |
| 이전 답변 수정 | Answer rollback |
| 중복 터치 | Reducer 상태 전이 방어 |
| 결제 실패 | Cart 유지 + 재시도 |
| CSV 일부 오류 | 정상 행 유지 + 오류 행 수정 |
| Wizard 이탈 | Auto-save + Resume |
| LocalStorage 손상 | Recovery 안내 |
| Store Format Version 불일치 | 명시적 오류 상태 |

---

# Technical Validation

```bash
npm test
npm run typecheck
npm run build
npm run audit:bundle
npm run test:e2e
npm run screenshots
```

최근 로컬 Chromium E2E:

**10 / 10 passed**

최근 Vercel Production Remote Smoke:

**2 / 2 passed**

---

# Screenshots

## Demo Home

![EasyOrder Demo Home](docs/screenshots/01-demo-home.png)

## Dynamic Question

![Dynamic Question](docs/screenshots/02-kiosk-question.png)

## Recommendation

![Recommendation Result](docs/screenshots/03-kiosk-recommendation.png)

## Owner Wizard

![Owner Wizard](docs/screenshots/04-owner-wizard.png)

## Owner Review

![Owner Review](docs/screenshots/05-owner-review.png)

## Checkout

![Checkout](docs/screenshots/06-checkout.png)

## For Business

![EasyOrder Business Page](docs/screenshots/07-business-page.png)

---

# For Business

https://easy-order-gamma.vercel.app/business

점주, 프랜차이즈 운영사, 키오스크/POS 솔루션 업체 관점에서 다음 내용을 확인할 수 있습니다.

- 문제 정의
- 기존 키오스크와의 차이
- 고객 경험
- 접근성 설계
- Store-agnostic 구조
- AI와 추천 엔진의 책임 분리
- Human-in-the-loop
- Reliability / Safety
- Technical Validation
- Expected Benefits
- Integration Architecture
- Adoption Flow

---

# Tech Stack

## Frontend

- React
- TypeScript
- Vite
- CSS
- React Lazy Loading

## Recommendation

- Dynamic Question Generation
- Information Gain
- Soft Scoring
- Store-agnostic Attribute Schema

## AI / Data

- OpenAI Responses API
- Structured Outputs
- JSON Schema
- Confidence-based Review
- Provider / Fallback Architecture

## Testing

- Unit / Integration Test Suite
- Playwright
- Chromium
- TypeScript Type Checking
- Bundle Secret Audit

## Deployment

- GitHub
- Vercel
- SPA Rewrite
- Static Mock Portfolio Deployment

---

# Quick Start

```bash
git clone https://github.com/dongjushin-ai/easy-order.git
cd easy-order
npm install
npm run dev
```

Local URLs:

```text
Demo Home        http://localhost:5173/
Customer Kiosk   http://localhost:5173/kiosk
Owner Dashboard  http://localhost:5173/owner
Owner Wizard     http://localhost:5173/owner/new
Business         http://localhost:5173/business
Adjudication     http://localhost:5173/adjudication
```

---

# Demo Mode

```env
VITE_DEMO_MODE=true
VITE_ATTRIBUTE_PROVIDER=mock
ATTRIBUTE_PROVIDER=mock
```

이 상태에서는 OpenAI API Key가 필요하지 않으며 브라우저에서 `/api/attribute-enrichment` 요청도 발생하지 않습니다.

---

# Deployment

Production:

https://easy-order-gamma.vercel.app/

```text
Framework       Vite
Install         npm install
Build           npm run build
Output          dist
```

Environment:

```env
VITE_DEMO_MODE=true
VITE_ATTRIBUTE_PROVIDER=mock
```

---

# Bundle & Secret Audit

```bash
npm run audit:bundle
```

공개 번들에서 API Key 및 금지된 Secret Marker가 발견되지 않는지 검사합니다.

---

# Project Structure

```text
src/
├─ app/
├─ data/
├─ demo/
├─ business/
├─ engine/
├─ enrichment/
├─ evaluation/
├─ adjudication/
├─ input/
├─ onboarding/
├─ owner/
├─ types/
└─ ui/

server/
tests/
docs/
evaluation-results/
```

---

# Known Limitations

현재 EasyOrder는 **Portfolio-ready Functional MVP**이며 실제 상용 키오스크 시스템은 아닙니다.

- LocalStorage 기반 저장
- 사용자 계정 / Cloud Sync 없음
- 실제 POS / PG / 재고 시스템 미연동
- 공개 Demo는 Mock AI 사용
- AI Ground Truth의 Human Validation 제한적
- 실제 키오스크 하드웨어 QA 미완료
- 실제 사용자 대상 접근성 연구 미완료
- Production AI Serverless 배포 미완료
- Production-grade Distributed Rate Limiting 미적용
- 실제 매장 A/B Test 미실시

---

# Future Work

```text
Real User Observation
        ↓
Accessibility Testing
        ↓
Kiosk Hardware QA
        ↓
Human Ground Truth Validation
        ↓
Production AI Backend
        ↓
Authentication / Database
        ↓
POS / PG Adapter
        ↓
Pilot Store
```

---

# Status

## Portfolio-ready Functional MVP

EasyOrder는 현재 **아이디어 → 알고리즘 → AI 실험 → 점주 도구 → 고객 제품 → 자동 테스트 → 실제 웹 배포**까지 연결된 MVP 상태입니다.
