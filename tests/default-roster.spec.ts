import { expect, test } from "./fixtures";
import { configureGame, finishIntroduction, saveLevel } from "./helpers";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";

for (const touch of [false, true]) {
  test.describe(touch ? "phone level roster" : "desktop level roster", () => {
    test.use({
      hasTouch: touch,
      isMobile: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    });
    test("opens with six players and exposes only Start and Settings", async ({
      page,
    }, testInfo) => {
      await page.clock.install();
      await page.goto("./");
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      await expect(page.getByLabel("Player count", { exact: true })).toHaveText("6");
      await expect(page.getByLabel("Arena players", { exact: true })).toHaveText("6");
      await expect(
        page.getByRole("button", { name: /Increase players|Decrease players/ }),
      ).toHaveCount(0);
      await expect(page.locator(".scene-controls button:visible")).toHaveCount(2);
      await page.clock.runFor(1200);
      await page.screenshot({
        path: testInfo.outputPath(touch ? "phone-level-roster.png" : "desktop-level-roster.png"),
      });
      await page.reload();
      await expect(page.getByLabel("Player count", { exact: true })).toHaveText("6");
      const start = page.getByRole("button", { name: "Start", exact: true });
      if (touch) await start.tap();
      else await start.click();
      await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
      await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
    });
  });
}

for (const count of [3, 16])
  test(`ignores a legacy ${count}-player choice, clamps its fortress and preserves settings and level`, async ({
    page,
  }) => {
    await saveLevel(page, 15, count);
    await page.addInitScript((count) => {
      if (!localStorage.getItem("citadel.solo.v1"))
        localStorage.setItem(
          "citadel.solo.v1",
          JSON.stringify({
            version: 1,
            count,
            humanSeat: count - 1,
            settings: { musicVolume: 0.23, effectsVolume: 0.61 },
          }),
        );
    }, count);
    await page.goto("./");
    const roster = levelDifficulty(15).playerCount;
    await expect(page.getByLabel("Round level", { exact: true })).toHaveText("15");
    await expect(page.getByLabel("Player count", { exact: true })).toHaveText(String(roster));
    await expect
      .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("citadel.solo.v1")!)))
      .toMatchObject({
        count: roster,
        humanSeat: Math.min(count - 1, roster - 1),
        settings: { musicVolume: 0.23, effectsVolume: 0.61 },
      });
    await page.reload();
    await expect(page.getByLabel("Round level", { exact: true })).toHaveText("15");
    await expect(page.getByLabel("Player count", { exact: true })).toHaveText(String(roster));
  });

test("debug levels apply the authored roster and restore the real challenge without changing progress", async ({
  page,
}, testInfo) => {
  await saveLevel(page, 20, 3);
  await page.clock.install();
  await page.goto("./?seed=2026");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await configureGame(page, { reducedEffects: true, music: false, effectsVolume: 0 });
  const canvas = await page.locator("canvas").elementHandle();
  const saved = await page.evaluate(() => localStorage.getItem("citadel.progress.v1"));
  for (const level of [21, 22, 23, 24]) {
    await page.keyboard.press("+");
    await expect(page.getByLabel("Round level", { exact: true })).toHaveText(String(level));
    await expect(page.getByLabel("Player count", { exact: true })).toHaveText(
      String(levelDifficulty(level).playerCount),
    );
  }
  await page.clock.runFor(600);
  await page.screenshot({ path: testInfo.outputPath("authored-level-24.png") });
  await page.keyboard.press("Backspace");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("20");
  await expect(page.getByLabel("Player count", { exact: true })).toHaveText(
    String(levelDifficulty(20).playerCount),
  );
  expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("citadel.progress.v1"))).toBe(saved);
});

test("a demotion keeps the live roster intact until Retry applies the next level's roster", async ({
  page,
}) => {
  test.setTimeout(120000);
  const count = levelDifficulty(21).playerCount;
  await page.addInitScript((count) => {
    localStorage.setItem(
      "citadel.progress.v1",
      JSON.stringify({
        version: 3,
        level: 21,
        count,
        best: 21,
        rounds: 1,
        losses: 2,
        demotion: null,
        recent: [{ level: 21, count, place: count, at: 0 }],
      }),
    );
    localStorage.setItem(
      "citadel.solo.v1",
      JSON.stringify({ version: 1, count, humanSeat: count - 1, settings: {} }),
    );
  }, count);
  await page.clock.install();
  await page.goto("./?seed=1");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await configureGame(page, { reducedEffects: true, music: false, effectsVolume: 0 });
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByLabel("Loss consequence", { exact: true })).toHaveText(
    "LOSS DROPS TO LEVEL 20",
  );
  await finishIntroduction(page);
  await page.keyboard.down("KeyD");
  for (let second = 0; second < 120; second++) {
    if (
      (await page.getByLabel("Elimination result", { exact: true }).count()) ||
      (await page.getByLabel("Round phase", { exact: true }).textContent()) === "finished"
    )
      break;
    await page.clock.runFor(1000);
  }
  await page.keyboard.up("KeyD");
  await expect(page.getByLabel("Progress update", { exact: true })).toContainText(
    "Demoted to level 20",
  );
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("21");
  await expect(page.getByLabel("Player count", { exact: true })).toHaveText(String(count));
  await page.clock.runFor(1200);
  await page.getByRole("button", { name: /^Retry(?: level 20)?$/, exact: true }).click();
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("20");
  await expect(page.getByLabel("Player count", { exact: true })).toHaveText(
    String(levelDifficulty(20).playerCount),
  );
  await expect(page.getByLabel("Survivors", { exact: true })).toHaveText(
    String(levelDifficulty(20).playerCount),
  );
});

for (const touch of [false, true])
  for (const count of [2, 4, 6])
    test.describe(`${touch ? "phone" : "desktop"} authored ${count}-player level`, () => {
      test.use({
        hasTouch: touch,
        isMobile: touch,
        viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      });
      test("renders the authored level before any balls move", async ({ page }, testInfo) => {
        const level = Array.from({ length: 20 }, (_, index) => index + 1).find(
          (level) => levelDifficulty(level).playerCount === count,
        )!;
        expect(level).toBeDefined();
        await saveLevel(page, level, 3);
        await page.clock.install();
        await page.goto("./?seed=2026");
        await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
        await configureGame(page, { music: false, effectsVolume: 0, effectsQuality: "low" });
        const start = page.getByRole("button", { name: "Start", exact: true });
        if (touch) await start.tap();
        else await start.click();
        await page.clock.runFor(700);
        await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
        await expect(page.getByLabel("Player count", { exact: true })).toHaveText(String(count));
        await expect(page.getByLabel("Survivors", { exact: true })).toHaveText(String(count));
        await expect(page.locator(".diagnostics")).toContainText("0.0s");
        await page.screenshot({
          path: testInfo.outputPath(`${touch ? "phone" : "desktop"}-authored-${count}.png`),
        });
      });
    });
