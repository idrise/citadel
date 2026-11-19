import { expect, test } from "./fixtures";
import { openGame, play, pause } from "./helpers";

for (const touch of [false, true])
  test.describe(touch ? "touch release gate" : "desktop release gate", () => {
    test.use({
      hasTouch: touch,
      isMobile: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    });
    test("Settings diagnostic actions match the build profile", async ({ page }, info) => {
      test.setTimeout(120000); // Software WebGL startup can be slow on shared CI workers.
      const local = process.env.CITADEL_BUILD_MODE === "local-debug";
      await page.goto("./");
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      const panel = page.getByRole("navigation", { name: "Game settings", exact: true });
      await expect(panel).toBeVisible();
      for (const name of ["Save performance report", "Run performance test"])
        await expect(panel.getByRole("button", { name, exact: true })).toHaveCount(local ? 1 : 0);
      for (const name of ["Reset progress", "Resume", "Restart"])
        await expect(panel.getByRole("button", { name, exact: true })).toBeInViewport();
      await expect(panel.getByRole("button")).toHaveCount(local ? 5 : 3);
      await page.screenshot({ path: info.outputPath("build-settings.png") });
    });
  });

test("production game fills the viewport and refreshes under the Pages path", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("./");
  await expect(page).toHaveTitle("Citadel");
  const canvas = page.getByRole("application", { name: "Citadel arena" });
  await expect(canvas).toBeVisible();
  const bounds = (await canvas.boundingBox())!;
  expect(bounds.x).toBe(0);
  expect(bounds.y).toBe(0);
  expect(bounds.width).toBe(page.viewportSize()!.width);
  expect(bounds.height).toBe(page.viewportSize()!.height);
  await page.reload();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("fullscreen-start.png") });
});

test("active play is pure canvas without the surrounding HUD or text", async ({ page }) => {
  await openGame(page);
  await play(page);
  await expect(page.locator(".menu-panel")).toHaveCount(0);
  await expect(page.locator(".masthead, .scoreboard, .pressure-bar, .controls-hint")).toHaveCount(
    0,
  );
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
});

test("narrow windows fit without cropping the canvas or scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  const bounds = (await page.locator("canvas").boundingBox())!;
  expect(bounds.width).toBe(360);
  expect(bounds.height).toBe(740);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("missing WebGL2 leaves a readable fallback", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("./");
  await expect(page.getByText("WebGL2 is needed to render the arena.")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("pause uses the minimal scene controls and resumes on the same canvas", async ({ page }) => {
  await openGame(page);
  await play(page);
  await pause(page);
  await expect(page.locator(".menu-panel,.game-overlay")).toHaveCount(0);
  expect(
    (await page.getByRole("button", { name: "Resume", exact: true }).boundingBox())!.width,
  ).toBeLessThanOrEqual(382);
  const stats = await page.locator(".diagnostics").textContent();
  await page.clock.runFor(500);
  expect(await page.locator(".diagnostics").textContent()).toBe(stats);
  await expect(page.getByRole("button", { name: "Hide controls (H)", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeHidden();
  await expect(page.locator("canvas")).toHaveCount(1);
});
