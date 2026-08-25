import { expect, test } from "@playwright/test";
import { auditPage } from "../e2e/helpers";

test.beforeAll(() => {
  if (!process.env.PLAYWRIGHT_BASE_URL) throw new Error("PLAYWRIGHT_BASE_URL is required for remote smoke tests");
});

test("Demo Home, public sample, direct routes와 refresh", async ({ page }) => {
  const audit = auditPage(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "EasyOrder" })).toBeVisible();
  for (const name of ["Cafe Demo", "Korean Snack Demo", "Fast Food Demo"]) await expect(page.getByText(name)).toBeVisible();

  const sample = await page.request.get("/samples/cafe-menu.csv");
  expect(sample.ok()).toBeTruthy();
  expect(await sample.text()).toContain("아이스 아메리카노");

  const routes: ReadonlyArray<readonly [string, RegExp]> = [
    ["/kiosk", /^무엇을 도와드릴까요\?$/],
    ["/owner", /^메뉴 속성 검토$/],
    ["/owner/new", /^새 매장 만들기$/],
    ["/business", /메뉴는 많아졌지만/],
  ];
  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await page.reload();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await page.goto("/adjudication");
  await expect(page.getByRole("heading", { name: "Snack Ground Truth Review" })).toBeVisible();
  audit.verify();
});

test("배포 Demo에서 세 Store와 Fast Food conditional option", async ({ page }) => {
  const audit = auditPage(page);
  for (const storeId of ["cafe", "korean-snack-store"]) {
    await page.goto(`/kiosk?store=${storeId}`);
    await page.getByRole("button", { name: /추천받고 싶어요/ }).click();
    await expect(page.locator(".question-screen")).toBeVisible();
  }

  await page.goto("/kiosk?store=fast-food-store");
  await page.getByRole("button", { name: /먹고 싶은 메뉴가/ }).click();
  await page.getByRole("button", { name: /기본 햄버거/ }).click();
  await expect(page.getByRole("group", { name: "세트 사이드" })).toBeHidden();
  await page.locator('label:has(input[name="meal"][value="set"])').click();
  await expect(page.getByRole("group", { name: "세트 사이드" })).toBeVisible();
  audit.verify();
});
