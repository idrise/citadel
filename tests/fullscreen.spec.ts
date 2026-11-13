import { expect, test } from "./fixtures";

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});

test("mobile Start enters fullscreen, keeps the canvas fitted and pauses on browser exit", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Start", exact: true }).tap();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  const size = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  await expect(page.locator("canvas")).toHaveJSProperty("clientWidth", size.width);
  await expect(page.locator("canvas")).toHaveJSProperty("clientHeight", size.height);
  await page.screenshot({ path: testInfo.outputPath("fullscreen-mobile.png") });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("canvas")).toHaveJSProperty("clientWidth", 844);
  await expect(page.locator("canvas")).toHaveJSProperty("clientHeight", 390);
  await page.screenshot({ path: testInfo.outputPath("fullscreen-landscape.png") });
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).tap();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe("HTML");
  await page.getByRole("button", { name: "Pause", exact: true }).tap();
  await page.getByRole("button", { name: "Exit fullscreen", exact: true }).tap();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
});

test("unsupported iPhone-style fullscreen offers Home Screen instructions and starts normally", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "fullscreenEnabled", { get: () => false });
    Object.defineProperty(document, "webkitFullscreenEnabled", { get: () => false });
  });
  await page.goto("./");
  await page.getByText("Full screen", { exact: true }).tap();
  await expect(page.getByText(/On iPhone, open Share/)).toBeVisible();
  await page.getByRole("button", { name: "Start", exact: true }).tap();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
});

test("a rejected fullscreen request still allows the touch round to start", async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.reject(new Error("Fullscreen denied"));
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Full screen", exact: true }).tap();
  await expect(
    page.getByRole("status").filter({ hasText: "Fullscreen was unavailable" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start", exact: true }).tap();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
});

test("Home Screen metadata uses relative paths under the configured Pages base", async ({
  page,
  request,
}) => {
  await page.goto("./");
  const url = await page.locator('link[rel="manifest"]').getAttribute("href");
  const response = await request.get(new URL(url!, page.url()).href);
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({
    display: "fullscreen",
    start_url: "./",
    scope: "./",
  });
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );
});
