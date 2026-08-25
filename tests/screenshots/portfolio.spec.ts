import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { answerUntilResults, createDemoCafeToReview, startRecommendation } from "../e2e/helpers";

const directory = "docs/screenshots";
test.beforeAll(async () => { await mkdir(directory, { recursive: true }); });

test("portfolio screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "EasyOrder" })).toBeVisible();
  await page.screenshot({ path: `${directory}/01-demo-home.png`, fullPage: true });
  await page.setViewportSize({ width: 1080, height: 1920 });
  await startRecommendation(page, "cafe");
  await page.screenshot({ path: `${directory}/02-kiosk-question.png`, fullPage: true });
  await answerUntilResults(page);
  await page.screenshot({ path: `${directory}/03-kiosk-recommendation.png`, fullPage: true });
  await page.locator(".recommendation-list .menu-card").first().click();
  await page.getByRole("button", { name: /장바구니 담기/ }).click();
  await page.getByRole("button", { name: "결제하러 가기" }).click();
  await page.screenshot({ path: `${directory}/06-checkout.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/owner/new?demo=1");
  await page.addStyleTag({ content: ".diagnostics,.save-status,.wizard-message{display:none!important}" });
  await expect(page.getByRole("heading", { name: "새 매장 만들기" })).toBeVisible();
  await page.screenshot({ path: `${directory}/04-owner-wizard.png`, fullPage: true });
  await createDemoCafeToReview(page);
  await page.screenshot({ path: `${directory}/05-owner-review.png`, fullPage: true });
});
