import { expect, test } from "./fixtures";
import {
  configureGame,
  selectFortress,
  finishIntroduction,
  choosePlayers,
  openSettings,
} from "./helpers";

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  video: "on",
});

test("phone menus stay readable, finger-sized and reachable through rotation", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [844, 390],
    [667, 320],
    [768, 1024],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    for (const name of ["Start", "Settings", "Decrease players", "Increase players"]) {
      const box = (await page.getByRole("button", { name, exact: true }).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(12);
      expect(box.y).toBeGreaterThanOrEqual(12);
      expect(box.x + box.width).toBeLessThanOrEqual(width! - 12);
      expect(box.y + box.height).toBeLessThanOrEqual(height! - 12);
    }
    await page.screenshot({ path: testInfo.outputPath(`title-${width}.png`) });
  }
  await page.getByRole("button", { name: "Settings", exact: true }).tap();
  expect(
    (await page.getByRole("button", { name: "Resume", exact: true }).boundingBox())!.height,
  ).toBeGreaterThanOrEqual(44);
  await expect(page.getByRole("button", { name: "Hide controls (H)" })).toBeHidden();
});

for (const count of [2, 3, 4, 5, 6]) {
  test(`mobile ${count}-seat match completes and rematches after rotation and interruption`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(240000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.install();
    await page.goto("./");
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60000));
    await choosePlayers(page, count);
    await openSettings(page);
    await configureGame(page, { reducedEffects: true });
    await configureGame(page, { music: false, effectsVolume: 0 });
    // Give this tester the seeded opening serve through the normal fortress selector.
    const owner = await page.getByLabel("Ball 0 owner", { exact: true }).textContent();
    const seat = ["Coral", "Amber", "Violet", "Rose", "Lime", "Gold"].indexOf(owner!);
    await selectFortress(page, Number(String(seat)));
    if (await page.getByRole("button", { name: "Resume", exact: true }).isVisible())
      await page.getByRole("button", { name: "Resume", exact: true }).tap();
    await page.getByRole("button", { name: "Start", exact: true }).tap();
    await finishIntroduction(page);
    await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("ready");
    await page.evaluate(() => {
      const input = window.__citadelTestInput;
      input.touch("pointerdown", 100, 700);
      input.touch("pointermove", 220, 700);
      input.touch("pointerup", 220, 700);
    });
    await page.clock.runFor(80);
    await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("ready");
    await page.evaluate(() => {
      window.__citadelTestInput.touch("pointerdown", 210, 700);
      window.__citadelTestInput.touch("pointerup", 210, 700);
    });
    await page.clock.runFor(100);
    await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("active");
    await page.setViewportSize({ width: 844, height: 390 });
    await page.clock.runFor(100);
    await page.screenshot({ path: testInfo.outputPath(`play-${count}-landscape.png`) });
    await page.evaluate((useBlur) => {
      if (useBlur) window.dispatchEvent(new Event("blur"));
      else {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      }
    }, count === 2);
    await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeVisible();
    const held = await page.locator(".diagnostics").textContent();
    await page.clock.runFor(500);
    expect(await page.locator(".diagnostics").textContent()).toBe(held);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Resume", exact: true }).tap();
    await page.setViewportSize({ width: 390, height: 844 });
    for (
      let elapsed = 0;
      elapsed < 240 &&
      !(await page
        .getByRole("button", { name: /^(Next level|Retry|Play again)$/, exact: true })
        .isVisible());
      elapsed += 10
    )
      await page.clock.runFor(10000);
    await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("finished");
    await page.screenshot({ path: testInfo.outputPath(`result-${count}.png`) });
    await page.getByRole("button", { name: /^(Next level|Retry|Play again)$/, exact: true }).tap();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeHidden();
    await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
    await expect(page.getByLabel("Player count", { exact: true })).toHaveText(String(count));
    expect(errors).toEqual([]);
  });
}
