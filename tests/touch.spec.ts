import { expect, test } from "./fixtures";

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  video: "on",
});

for (const count of [2, 6]) {
  test(`touch layout starts with ${count} players`, async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await page.goto("./");
    const current = Number(await page.getByLabel("Player count").textContent());
    const action = count < current ? "Decrease players" : "Increase players";
    for (let n = current; n !== count; n += Math.sign(count - current))
      await page.getByRole("button", { name: action }).tap();
    await expect(page.getByLabel("Player count")).toHaveText(String(count));
    await page.getByRole("button", { name: "Start", exact: true }).tap();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`mobile-${count}.png`) });
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator("canvas")).toHaveJSProperty("clientWidth", 844);
    await page.screenshot({ path: testInfo.outputPath(`landscape-${count}.png`) });
  });
}

test("touch drag steers and pause resumes without pointer lock", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(120000);
  await page.clock.install();
  await page.goto("./");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60000));
  await page.getByRole("button", { name: "Start", exact: true }).tap();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement)).toBeNull();
  await page.clock.runFor(4000);
  const before = Number(await page.getByLabel("Bat angle").textContent());
  const client = await context.newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 80, y: 700 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 240, y: 700 }],
  });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.clock.runFor(400);
  expect(Number(await page.getByLabel("Bat angle").textContent())).toBeGreaterThan(before + 5);
  await page.screenshot({ path: testInfo.outputPath("mobile-play.png") });
  await page.getByRole("button", { name: "Pause", exact: true }).tap();
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).tap();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.touchscreen.tap(200, 700);
  await page.clock.runFor(100);
  await expect(page.locator("canvas")).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("canvas")).toHaveJSProperty("clientWidth", 844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("mobile gameplay capture with real-time touch movement", async ({ page, context }) => {
  test.setTimeout(120000);
  await page.goto("./");
  await page.getByRole("button", { name: "Start", exact: true }).tap();
  const client = await context.newCDPSession(page);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing", {
    timeout: 10000,
  });
  for (const [from, to] of [
    [90, 270],
    [270, 100],
    [100, 230],
  ]) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: from!, y: 700 }],
    });
    for (let step = 1; step <= 8; step++) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: from! + ((to! - from!) * step) / 8, y: 700 }],
      });
      await page.waitForTimeout(70);
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(400);
  }
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
});
