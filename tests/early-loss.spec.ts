import { expect, test } from "@playwright/test";
import { choosePlayers, openGame, openSettings, play } from "./helpers";
for (const action of ["Back", "Retry"] as const)
  test(`an eliminated player can choose ${action} on the same canvas`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    await openGame(page, true, 8);
    await choosePlayers(page, 6);
    await openSettings(page);
    await page.getByRole("checkbox", { name: "Music", exact: true }).uncheck();
    await play(page);
    await page.keyboard.down("KeyD");
    // Observe the actual elimination; rally acceleration changes its timing.
    for (
      let seconds = 0;
      seconds < 180 &&
      (await page.getByLabel("Coral health", { exact: true }).textContent()) !== "0";
      seconds += 2
    )
      await page.clock.runFor(2000);
    await page.keyboard.up("KeyD");
    await expect(page.getByLabel("Coral health", { exact: true })).toHaveText("0");
    await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
    await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(false);
    await expect(page.getByRole("button", { name: "Retry level 1", exact: true })).toBeVisible();
    const retry = page.getByRole("button", { name: "Retry level 1", exact: true });
    await expect(retry).toHaveCSS("opacity", "0");
    await expect(retry.locator("..")).toHaveClass("scene-controls");
    await expect(page.locator(".elimination-actions")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("early-loss.png") });
    const rounds = await page.evaluate(
      () => JSON.parse(localStorage.getItem("citadel.progress.v1")!).rounds,
    );
    await page
      .locator("canvas")
      .evaluate((canvas) => canvas.setAttribute("data-navigation", "same"));
    if (action === "Back") {
      await page.getByRole("button", { name: "Back", exact: true }).click();
      await expect(page.getByLabel("Round presentation", { exact: true })).toHaveText("title");
      await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Back", exact: true })).toBeHidden();
      await expect(retry).toBeHidden();
      await expect(page.getByLabel("Player count", { exact: true })).toHaveText("6");
      await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
      await expect(page.getByLabel("Coral health", { exact: true })).toHaveText("3");
      await expect
        .poll(() => page.evaluate(() => Boolean(document.pointerLockElement)))
        .toBe(false);
      await page.screenshot({ path: testInfo.outputPath("back-to-title.png") });
      const before = await page.locator(".diagnostics").textContent();
      await page.clock.runFor(2000);
      expect(await page.locator(".diagnostics").textContent()).toBe(before);
      await page.getByRole("button", { name: "Start", exact: true }).click();
    } else await retry.click();
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.progress.v1")!).rounds),
    ).toBe(rounds);
    await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeHidden();
    await expect(page.locator("canvas")).toHaveAttribute("data-navigation", "same");
    await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(true);
  });
test.describe("touch scene retry", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  for (const action of ["Back", "Retry"] as const)
    test(`taps scene ${action} after losing a mobile fortress`, async ({
      page,
      context,
    }, testInfo) => {
      test.setTimeout(120000);
      await openGame(page, true, 8);
      await choosePlayers(page, 6);
      await openSettings(page);
      await page.getByRole("checkbox", { name: "Music", exact: true }).uncheck();
      await page.getByLabel("Your fortress", { exact: true }).selectOption("5");
      if (await page.getByRole("button", { name: "Resume", exact: true }).isVisible())
        await page.getByRole("button", { name: "Resume", exact: true }).tap();
      await page.getByRole("button", { name: "Start", exact: true }).tap();
      await page.clock.runFor(1800);
      const client = await context.newCDPSession(page);
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 80, y: 650 }],
      });
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 260, y: 650 }],
      });
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      for (
        let seconds = 0;
        seconds < 180 &&
        (await page.getByLabel("Gold health", { exact: true }).textContent()) !== "0";
        seconds += 2
      )
        await page.clock.runFor(2000);
      await expect(page.getByLabel("Gold health", { exact: true })).toHaveText("0");
      await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
      const retry = page.getByRole("button", { name: "Retry level 1", exact: true });
      await expect(retry).toHaveCSS("opacity", "0");
      await page.screenshot({ path: testInfo.outputPath("touch-scene-retry.png") });
      const progress = await page.evaluate(() => localStorage.getItem("citadel.progress.v1"));
      await page
        .locator("canvas")
        .evaluate((canvas) => canvas.setAttribute("data-navigation", "same"));
      if (action === "Back") {
        await page.getByRole("button", { name: "Back", exact: true }).tap();
        await expect(page.getByLabel("Round presentation", { exact: true })).toHaveText("title");
        await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Back", exact: true })).toBeHidden();
        await expect(retry).toBeHidden();
        await expect(page.getByLabel("Player count", { exact: true })).toHaveText("6");
        await expect(page.getByLabel("Gold health", { exact: true })).toHaveText("3");
        await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
        await page.clock.runFor(1000);
        await page.screenshot({ path: testInfo.outputPath("touch-back-to-title.png") });
        await page.getByRole("button", { name: "Start", exact: true }).tap();
      } else await retry.tap();
      expect(await page.evaluate(() => localStorage.getItem("citadel.progress.v1"))).toBe(progress);
      await expect(page.locator("canvas")).toHaveAttribute("data-navigation", "same");
      await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
      await expect(page.getByRole("button", { name: "Start", exact: true })).toBeHidden();
      expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
    });
});
