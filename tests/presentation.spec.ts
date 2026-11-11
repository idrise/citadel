import { expect, test } from "@playwright/test";
import { openGame, play, pause } from "./helpers";

test("perspective walls and reflected bloom render, with a reduced-effects path", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await openGame(page, false);
  await play(page);
  await page.clock.runFor(1800);
  await page.screenshot({ path: testInfo.outputPath("perspective-neon.png") });
  await pause(page);
  await page.getByText("Settings", { exact: true }).click();
  const stats = await page.locator(".diagnostics").textContent();
  await page.getByRole("checkbox", { name: "Reduced effects" }).check();
  await page.clock.runFor(150);
  expect(await page.locator(".diagnostics").textContent()).toBe(stats);
  await page.getByRole("checkbox", { name: "Reduced effects" }).uncheck();
  await page.clock.runFor(150);
  expect(await page.locator(".diagnostics").textContent()).toBe(stats);
  expect(errors).toEqual([]);
});

test("live perspective camera cannot steer a stationary captured mouse", async ({ page }) => {
  test.setTimeout(240000);
  // Keep the longer live-motion run affordable in software WebGL; the render check uses full size.
  await page.setViewportSize({ width: 800, height: 600 });
  await openGame(page, false);
  await play(page);
  await page.clock.runFor(1800);
  await page.mouse.move(660, 360);
  await page.clock.runFor(400);
  const angle = await page.getByLabel("Bat angle", { exact: true }).textContent();
  await page.clock.runFor(2500);
  expect(await page.getByLabel("Bat angle", { exact: true }).textContent()).toBe(angle);
  await pause(page);
});
