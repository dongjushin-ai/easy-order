import { expect, type Page } from "@playwright/test";

export function auditPage(page: Page) {
  const failures: string[] = [];
  let enrichmentRequests = 0;
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") failures.push(`console: ${message.text()}`); });
  page.on("request", (request) => { if (request.url().includes("/api/attribute-enrichment")) enrichmentRequests += 1; });
  return { verify() { expect(failures, failures.join("\n")).toEqual([]); expect(enrichmentRequests, "Mock demo must not call the enrichment API").toBe(0); } };
}

export async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

export async function startRecommendation(page: Page, storeId: string) {
  await page.goto(`/kiosk?store=${storeId}`);
  await expect(page.getByRole("heading", { name: "무엇을 도와드릴까요?" })).toBeVisible();
  await page.getByRole("button", { name: /추천받고 싶어요/ }).click();
  await expect(page.locator(".question-screen")).toBeVisible();
}

export async function answerUntilResults(page: Page, maxAnswers = 10) {
  for (let index = 0; index < maxAnswers; index += 1) {
    if (await page.locator(".result-screen").isVisible().catch(() => false)) return;
    const options = page.locator(".question-screen .option-button:not(.neutral)");
    await expect(options.first()).toBeVisible();
    await options.first().click();
  }
  await expect(page.locator(".result-screen")).toBeVisible();
}

export async function addFirstRecommendationToCart(page: Page) {
  await page.locator(".recommendation-list .menu-card").first().click();
  await expect(page.locator(".detail-screen")).toBeVisible();
  const add = page.getByRole("button", { name: /장바구니 담기/ });
  await expect(add).toBeVisible();
  await add.click();
  await expect(page.getByRole("heading", { name: "담은 메뉴를 확인해 주세요" })).toBeVisible();
}

export async function createDemoCafeToReview(page: Page) {
  await page.goto("/owner/new?demo=1");
  await page.getByLabel("매장 이름").fill("E2E 데모 카페");
  await page.getByLabel("업종").selectOption({ label: "Cafe" });
  await page.getByRole("button", { name: "저장하고 메뉴 입력" }).click();
  await page.getByRole("button", { name: "Cafe 샘플 불러오기" }).click();
  await page.getByRole("button", { name: /정상 메뉴 3개 가져오기/ }).click();
  await page.getByRole("button", { name: /다음: 추천 기준/ }).click();
  await page.getByRole("button", { name: /업종에 맞는 기준 사용/ }).click();
  await page.getByRole("button", { name: /다음: 자동 분석/ }).click();
  await page.getByRole("button", { name: /메뉴 자동 분석 시작/ }).click();
  await expect(page.getByRole("heading", { name: "분석 결과 확인" })).toBeVisible();
}

export async function completeReview(page: Page) {
  const approve = page.getByRole("button", { name: "현재 분석 결과가 맞음" });
  for (let index = 0; index < 100 && await approve.isVisible().catch(() => false); index += 1) await approve.click();
  await expect(page.getByText("필수 확인 항목을 모두 처리했습니다.")).toBeVisible();
}
