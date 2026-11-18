import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import { expect, test } from "./fixtures";
import { openGame, choosePlayers, finishIntroduction } from "./helpers";
const progressKey = "citadel.progress.v1";
test("plus and minus preview frozen levels on the same canvas, never saving debug results, and Backspace restores progress", async ({
  page,
}, testInfo) => {
  await openGame(page);
  await choosePlayers(page, 2);
  const canvas = await page.locator("canvas").elementHandle();
  const saved = await page.evaluate((key) => localStorage.getItem(key), progressKey);
  await page.keyboard.press("+");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("2");
  await expect(page.getByLabel("Debug mode", { exact: true })).toHaveText(
    "Debug - progress not saved",
  );
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
  await page.keyboard.press("-");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
  await page.clock.runFor(500);
  await page.screenshot({ path: testInfo.outputPath("debug-level-01.png") });
  await finishIntroduction(page);
  for (
    let seconds = 0;
    seconds < 120 &&
    (await page.getByLabel("Round phase", { exact: true }).textContent()) !== "finished";
    seconds++
  )
    await page.clock.runFor(1000);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("finished");
  expect(await page.evaluate((key) => localStorage.getItem(key), progressKey)).toBe(saved);
  await page.keyboard.press("Backspace");
  await expect(page.getByLabel("Debug mode", { exact: true })).toHaveText("Off");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
  expect(await page.evaluate((key) => localStorage.getItem(key), progressKey)).toBe(saved);
});
test("debug keys do not alter preferences and show shape changes before play", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page, false);
  const before = await page.evaluate(() => localStorage.getItem("citadel.solo.v1"));
  for (let level = 2; level <= 10; level++) await page.keyboard.press("+");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("10");
  await expect(page.getByLabel("Level changes", { exact: true })).toHaveText("WIDE ARENA");
  await page.clock.runFor(600);
  await page.screenshot({ path: testInfo.outputPath("debug-level-10-phone.png") });
  expect(await page.evaluate(() => localStorage.getItem("citadel.solo.v1"))).toBe(before);
  expect(await page.getByLabel("Ball 0 phase", { exact: true }).textContent()).toBe("ready");
});

test("rapid debug steps retain capture and never open Settings when recapture would be rejected", async ({
  page,
}) => {
  await openGame(page);
  await page.evaluate(() => {
    const canvas = document.querySelector("canvas")!;
    const request = canvas.requestPointerLock.bind(canvas);
    canvas.dataset.captureRequests = "0";
    canvas.requestPointerLock = (options) => {
      const requests = Number(canvas.dataset.captureRequests) + 1;
      canvas.dataset.captureRequests = String(requests);
      // Model a browser rejecting immediate recapture after a programmatic unlock.
      if (requests > 1) return Promise.reject(new Error("Immediate recapture denied"));
      return request(options);
    };
  });
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const progress = await page.evaluate(() => localStorage.getItem("citadel.progress.v1"));
  for (const [key, level] of [
    ["+", 2],
    ["+", 3],
    ["-", 2],
    ["-", 1],
    ["+", 2],
  ] as const) {
    await page.keyboard.press(key);
    await expect(page.getByLabel("Round level", { exact: true })).toHaveText(String(level));
    await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeHidden();
    await expect(page.locator(".scene-settings-controls")).toBeHidden();
    expect(await page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  }
  expect(await page.locator("canvas").getAttribute("data-capture-requests")).toBe("1");
  await page.evaluate(() => document.exitPointerLock());
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("citadel.progress.v1"))).toBe(progress);
});

test("debug steps stay captured when the next roster clamps the human fortress", async ({
  page,
}) => {
  const level = Array.from({ length: 98 }, (_, i) => i + 2).find(
    (level) => levelDifficulty(level).playerCount > levelDifficulty(level + 1).playerCount,
  )!;
  const count = levelDifficulty(level).playerCount;
  await page.addInitScript(
    ({ level, count }) => {
      localStorage.setItem(
        "citadel.progress.v1",
        JSON.stringify({
          version: 4,
          level,
          best: level - 1,
          count,
          rounds: 1,
          losses: 0,
          demotion: null,
          recent: [{ level: level - 1, count, place: 1, at: 0 }],
        }),
      );
      localStorage.setItem(
        "citadel.solo.v1",
        JSON.stringify({ version: 1, count, humanSeat: count - 1, settings: {} }),
      );
    },
    { level, count },
  );
  await page.clock.install();
  await page.goto("./?seed=2026");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const saved = await page.evaluate(() => localStorage.getItem("citadel.progress.v1"));
  await page.keyboard.press("+");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText(String(level + 1));
  await expect(page.getByLabel("Player count", { exact: true })).toHaveText(
    String(levelDifficulty(level + 1).playerCount),
  );
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeHidden();
  expect(await page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
  await page.evaluate(() => window.__citadelTestInput.move(8, 0));
  await page.clock.runFor(100);
  await page.keyboard.press("-");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText(String(level));
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("citadel.progress.v1"))).toBe(saved);
});
