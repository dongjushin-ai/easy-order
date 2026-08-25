import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, auditPage } from "./helpers";

test("Business page direct route, anchors와 CTA", async ({ page }) => {
  const audit=auditPage(page);
  await page.goto("/business");
  await expect(page.getByRole("heading", { name:/메뉴는 많아졌지만/ })).toBeVisible();
  await expect(page.getByText("기존 주문 시스템을 모두 바꾸는 것이 아니라",{exact:false})).toBeVisible();
  await page.getByRole("link",{name:"어떻게 작동하나요?"}).click();
  await expect(page).toHaveURL(/#solution$/);
  await expect(page.getByRole("heading",{name:/메뉴를 고객이 찾아가는 방식에서/})).toBeVisible();
  await page.getByRole("link",{name:"고객 화면 체험"}).first().click();
  await expect(page).toHaveURL(/\/kiosk\?store=cafe/);
  await page.goto("/business");
  await page.getByRole("link",{name:"점주 도입 과정 체험"}).first().click();
  await expect(page).toHaveURL(/\/owner\/new\?demo=1/);
  audit.verify();
});

test("Demo Home에서 Business로 이동하고 mobile overflow가 없다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link",{name:"EasyOrder 도입 알아보기"}).click();
  await expect(page).toHaveURL(/\/business$/);
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await assertNoHorizontalOverflow(page);
  await expect(page.getByRole("navigation",{name:"서비스 소개"})).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("Portfolio Prototype");
});
