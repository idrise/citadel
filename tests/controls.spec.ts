import { expect, test } from "./fixtures";
import {
  configureGame,
  selectFortress,
  restartGame,
  moveMouse,
  finishIntroduction,
  openGame,
  play,
  pause,
  openSettings,
} from "./helpers";

async function settings(page: import("@playwright/test").Page) {
  await openSettings(page);
}

test("a mouse flick reaches the requested bat position within 50ms", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await openGame(page);
  await play(page);
  await moveMouse(page, -100, 300);
  await page.clock.runFor(150);
  const before = Number(await page.getByLabel("Bat angle", { exact: true }).textContent());
  await moveMouse(page, 0, 300);
  await page.clock.runFor(50);
  // Pause reports the actual 50ms state; the normal accessible status is sampled every 80ms.
  await pause(page);
  const after = Number(await page.getByLabel("Bat angle", { exact: true }).textContent());
  expect(after - before).toBeGreaterThan(28);
  expect(after - before).toBeLessThan(30);
});

test("aid modes and sensitivity survive restart and every human fortress", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 800, height: 600 });
  await openGame(page);
  await settings(page);
  for (const mode of ["none", "preview", "slowdown", "both"]) {
    await configureGame(page, {
      preview: mode === "preview" || mode === "both",
      slowdown: mode === "slowdown" || mode === "both",
    });
    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem("citadel.solo.v1")!).settings,
    );
    expect(saved.preview).toBe(mode === "preview" || mode === "both");
    expect(saved.slowdown).toBe(mode === "slowdown" || mode === "both");
  }
  await page.getByLabel("Mouse sensitivity", { exact: true }).focus();
  for (let step = 0; step < 12; step++) await page.keyboard.press("ArrowRight");
  for (const seat of ["1", "2", "3", "0"]) {
    await selectFortress(page, Number(seat));
    await settings(page);
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.solo.v1")!).settings),
    ).toMatchObject({ preview: true, slowdown: true });
    await expect(page.getByLabel("Mouse sensitivity", { exact: true })).toHaveValue("1.6");
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("citadel.solo.v1")!).settings.reducedEffects,
      ),
    ).toBe(true);
    await openSettings(page);
    await play(page);
    await moveMouse(page, 790, 300);
    await page.clock.runFor(300);
    const angle = Number(await page.getByLabel("Bat angle", { exact: true }).textContent());
    expect(angle).toBeCloseTo(
      Number(await page.getByLabel("Bat maximum angle", { exact: true }).textContent()),
      1,
    );
    await pause(page);
    await settings(page);
  }
  await restartGame(page);
  await settings(page);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.solo.v1")!).settings),
  ).toMatchObject({ preview: true, slowdown: true });
  await expect(page.getByLabel("Mouse sensitivity", { exact: true })).toHaveValue("1.6");
});

test("restart repeats the same opening and resize does not steer captured input", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 800, height: 600 });
  await openGame(page);
  const opening = await page.locator(".diagnostics").textContent();
  await play(page);
  await finishIntroduction(page);
  await moveMouse(page, 430, 300);
  await page.clock.runFor(300);
  const angle = await page.getByLabel("Bat angle", { exact: true }).textContent();
  await page.setViewportSize({ width: 1000, height: 650 });
  await page.clock.runFor(250);
  expect(await page.getByLabel("Bat angle", { exact: true }).textContent()).toBe(angle);
  await pause(page);
  await restartGame(page);
  expect(await page.locator(".diagnostics").textContent()).toBe(opening);
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
});
