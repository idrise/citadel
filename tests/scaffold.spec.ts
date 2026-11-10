import { expect, test } from "@playwright/test";

test("production app loads and refreshes under the GitHub Pages project path", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "NEON CITADEL" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Three-dimensional arena stage" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("img", { name: "Three-dimensional arena stage" })).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("scaffold-desktop.png"), fullPage: true });
});

test("narrow windows keep the page within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "NEON CITADEL" })).toBeVisible();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
});

test("missing WebGL2 leaves a readable fallback rather than a broken page", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "NEON CITADEL" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("needs WebGL2");
  await expect(page.locator("canvas")).toHaveCount(0);
});
