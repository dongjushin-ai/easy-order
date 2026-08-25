import { expect, test } from "@playwright/test";
import { addFirstRecommendationToCart, answerUntilResults, assertNoHorizontalOverflow, auditPage, completeReview, createDemoCafeToReview, startRecommendation } from "./helpers";

test("Demo Home과 직접 접근 route가 렌더링된다", async ({ page }) => {
  const audit = auditPage(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "EasyOrder" })).toBeVisible();
  for (const name of ["Cafe Demo", "Korean Snack Demo", "Fast Food Demo"]) await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByRole("link", { name: "고객 키오스크 체험" })).toBeVisible();
  await expect(page.getByRole("link", { name: "점주용 매장 만들기 체험" })).toBeVisible();
  for (const [path, text] of [["/kiosk", "무엇을 도와드릴까요?"], ["/owner", "메뉴 속성 검토"], ["/owner/new", "새 매장 만들기"], ["/adjudication", "Snack Ground Truth Review"]] as const) {
    await page.goto(path);
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
  }
  audit.verify();
});

test("Cafe 추천부터 결제 실패, 재시도, 주문 완료까지 진행된다", async ({ page }) => {
  const audit = auditPage(page);
  await page.setViewportSize({ width: 1080, height: 1920 });
  await startRecommendation(page, "cafe");
  const firstQuestion = await page.locator(".question-copy h1").textContent();
  await page.locator(".option-button:not(.neutral)").first().click();
  await expect(page.locator(".question-copy h1")).not.toHaveText(firstQuestion ?? "");
  await page.getByRole("button", { name: "이전으로" }).click();
  await expect(page.locator(".question-copy h1")).toHaveText(firstQuestion ?? "");
  await page.locator(".option-button:not(.neutral)").last().click();
  await answerUntilResults(page);
  await expect(page.getByText("추천 결과")).toBeVisible();
  await addFirstRecommendationToCart(page);
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await page.getByRole("button", { name: "결제하러 가기" }).click();
  await page.getByText("개발용 결제 결과 설정").click();
  await page.getByLabel("이번 결제 결과").selectOption("card-read-failed");
  await page.getByRole("button", { name: /카드 결제/ }).click();
  await expect(page.getByRole("heading", { name: "카드를 읽지 못했어요" })).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("장바구니의 메뉴는 사라지지 않았어요.")).toBeVisible();
  await page.getByRole("button", { name: "다시 결제하기" }).click();
  await expect(page.getByRole("heading", { name: "주문이 완료되었습니다" })).toBeVisible({ timeout: 5_000 });
  await assertNoHorizontalOverflow(page);
  audit.verify();
});

test("Snack 추천은 카페 전용 schema를 노출하지 않는다", async ({ page }) => {
  const audit = auditPage(page);
  await startRecommendation(page, "korean-snack-store");
  await expect(page.locator("body")).not.toContainText(/coffee|caffeine|카페인|커피 맛/i);
  await answerUntilResults(page);
  await expect(page.locator(".recommendation-list .menu-card").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/coffee|caffeine|카페인|커피 맛/i);
  audit.verify();
});

test("Fast Food conditional 옵션과 9,500원 계산이 DOM에서 동작한다", async ({ page }) => {
  const audit = auditPage(page);
  await page.goto("/kiosk?store=fast-food-store");
  await page.getByRole("button", { name: /먹고 싶은 메뉴가/ }).click();
  await page.getByRole("button", { name: /기본 햄버거/ }).click();
  await expect(page.getByRole("group", { name: "세트 사이드" })).toBeHidden();
  await expect(page.getByRole("group", { name: "세트 음료" })).toBeHidden();
  await page.locator('label:has(input[name="meal"][value="set"])').click();
  await expect(page.getByRole("group", { name: "세트 사이드" })).toBeVisible();
  await expect(page.getByRole("group", { name: "세트 음료" })).toBeVisible();
  await page.locator('label:has(input[name="extra-cheese"][value="add"])').click();
  await page.locator('label:has(input[name="extra-patty"][value="add"])').click();
  await expect(page.getByRole("button", { name: "9,500원 · 장바구니 담기" })).toBeVisible();
  await page.getByRole("button", { name: /장바구니 담기/ }).click();
  await expect(page.getByText("9,500원", { exact: true })).toHaveCount(2);
  audit.verify();
});

test("처음으로는 주문 상태를 초기화하고 큰 글씨 설정은 유지한다", async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await startRecommendation(page, "cafe");
  await page.getByRole("button", { name: "글자 크게 보기" }).click();
  await page.locator(".option-button:not(.neutral)").first().click();
  await page.getByRole("button", { name: "처음으로" }).click();
  await expect(page.getByRole("heading", { name: "무엇을 도와드릴까요?" })).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveClass(/large-text/);
  await page.getByRole("button", { name: /추천받고 싶어요/ }).click();
  await expect(page.locator(".progress-row strong")).toHaveText(/1 \/ /);
  await assertNoHorizontalOverflow(page);
});

test("Owner Wizard sample, reload, review, preview 복귀가 유지된다", async ({ page }) => {
  const audit = auditPage(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await createDemoCafeToReview(page);
  await expect(page.locator("body")).not.toContainText(/0\.73|raw value/i);
  const progressBefore = await page.locator("progress").getAttribute("value");
  await page.getByRole("button", { name: "현재 분석 결과가 맞음" }).click();
  await expect(page.locator("progress")).not.toHaveAttribute("value", progressBefore ?? "");
  await page.reload();
  await expect(page.getByRole("heading", { name: "분석 결과 확인" })).toBeVisible();
  await expect(page.getByText("E2E 데모 카페")).toBeVisible();
  await completeReview(page);
  await page.getByRole("button", { name: "미리보기 준비" }).click();
  await expect(page.getByRole("heading", { name: "키오스크 미리보기" })).toBeVisible();
  await page.getByRole("link", { name: "고객 화면 미리보기" }).click();
  await expect(page.getByText(/미리보기 · 실제 주문이나 결제가 발생하지 않습니다/)).toBeVisible();
  await page.getByRole("link", { name: "설정으로 돌아가기" }).click();
  await expect(page.getByRole("heading", { name: "키오스크 미리보기" })).toBeVisible();
  audit.verify();
});

test("Owner keyboard smoke와 Demo Reset LocalStorage 정책", async ({ page }) => {
  await page.goto("/owner/new");
  await expect(page.getByRole("heading", { name: "새 매장 만들기" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await Promise.all([page.waitForURL(/\/owner$/), page.keyboard.press("Enter")]);
  await page.goto("/");
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const base = { storeFormatVersion: 1, createdBy: "USER", step: "STORE_INFO", rawStore: { attributes: [], menus: [] }, createdAt: now, updatedAt: now };
    localStorage.setItem("easy-order-stores-v1", JSON.stringify([
      { ...base, id: "keep-user", info: { name: "Keep User" }, rawStore: { ...base.rawStore, storeId: "keep-user", storeName: "Keep User" } },
      { ...base, id: "remove-demo", demoCreated: true, info: { name: "Remove Demo" }, rawStore: { ...base.rawStore, storeId: "remove-demo", storeName: "Remove Demo" } },
    ]));
    localStorage.setItem("easy-order-demo-session", "temporary");
  });
  await page.getByRole("button", { name: "데모 초기화" }).click();
  const result = await page.evaluate(() => ({ stores: localStorage.getItem("easy-order-stores-v1"), session: localStorage.getItem("easy-order-demo-session") }));
  expect(result.stores).toContain("keep-user");
  expect(result.stores).not.toContain("remove-demo");
  expect(result.session).toBeNull();
});

test("Vertical Large Text 주요 화면에 horizontal overflow가 없다", async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await startRecommendation(page, "cafe");
  await page.getByRole("button", { name: "글자 크게 보기" }).click();
  await assertNoHorizontalOverflow(page);
  await answerUntilResults(page);
  await assertNoHorizontalOverflow(page);
  await addFirstRecommendationToCart(page);
  await assertNoHorizontalOverflow(page);
  await expect(page.getByRole("button", { name: "결제하러 가기" })).toBeVisible();
});
