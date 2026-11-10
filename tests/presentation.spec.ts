import { expect, test } from "@playwright/test";

test("bloom and reduced rendering both work without changing a paused match", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.clock.install();
  await page.goto("./");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60000));
  await page.getByRole("button", { name: "Play vs Bots" }).click();
  await page.clock.runFor(1800);
  await page.screenshot({ path: testInfo.outputPath("arena-3d-bloom.png"), fullPage: true });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByText("Prototype experiments & diagnostics").click();
  const stats = await page.locator(".diagnostics").first().textContent();
  await page.getByRole("checkbox", { name: "Reduced effects" }).check();
  await page.clock.runFor(150);
  expect(await page.locator(".diagnostics").first().textContent()).toBe(stats);
  await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("arena-3d-reduced.png"), fullPage: true });
  await page.getByRole("checkbox", { name: "Reduced effects" }).uncheck();
  await page.clock.runFor(150);
  expect(await page.locator(".diagnostics").first().textContent()).toBe(stats);
  expect(errors).toEqual([]);
});

test("live camera does not steer a stationary pointer and keeps mouse aim usable", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.clock.install();
  await page.goto("./");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60000));
  await page.getByRole("button", { name: "Play vs Bots" }).click();
  await page.clock.runFor(1800);
  await page.getByText("Prototype experiments & diagnostics").click();
  const canvas = page.getByRole("application", { name: "Neon Citadel arena" });
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.65);
  await page.clock.runFor(400);
  const angle = await page.getByLabel("Bat angle", { exact: true }).textContent();
  await page.clock.runFor(5000);
  expect(await page.getByLabel("Bat angle", { exact: true }).textContent()).toBe(angle);
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.85);
  await page.clock.runFor(500);
  expect(Number(await page.getByLabel("Bat angle", { exact: true }).textContent())).toBeGreaterThan(
    -20,
  );
  await page.getByRole("checkbox", { name: "Reduced effects" }).check();
  await page.clock.runFor(200);
  expect(Number(await page.getByLabel("Bat angle", { exact: true }).textContent())).toBeGreaterThan(
    -20,
  );
});
