import { expect, test } from "./fixtures";
import { START_TRANSITION_SECONDS } from "../apps/web/src/rendering/title-transition";
import {
  choosePlayers,
  configureGame,
  finishIntroduction,
  openGame,
  play,
  restartGame,
} from "./helpers";

for (const count of [2, 4, 6])
  test(`Start hands the ${count}-seat live title into the intro and Restart keeps a transition`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await openGame(page, false);
    await configureGame(page, { effectsQuality: "low", music: false, effectsVolume: 0 });
    await choosePlayers(page, count);
    await page.clock.runFor(2400);
    const progress = await page.evaluate(() => localStorage.getItem("citadel.progress.v1"));
    await page.screenshot({ path: info.outputPath("before-start.png") });
    await play(page);
    await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
    await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("moving");
    await page.clock.runFor(160);
    await page.screenshot({ path: info.outputPath("start-departing.png") });
    await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("moving");
    await page.clock.runFor(START_TRANSITION_SECONDS * 1000 + 200);
    await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("settled");
    await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("ready");
    await expect(page.getByLabel("Your returns", { exact: true })).toHaveText("0");
    await page.screenshot({ path: info.outputPath("intro-settled.png") });
    await restartGame(page);
    await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("moving");
    await page.clock.runFor(1500);
    await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("settled");
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("citadel.progress.v1"))).toBe(progress);
  });

test("pressing Start partway through a roster morph preserves the in-progress transition", async ({
  page,
}) => {
  test.setTimeout(120000);
  await openGame(page, false);
  await configureGame(page, { effectsQuality: "low", music: false, effectsVolume: 0 });
  await choosePlayers(page, 2);
  await page.clock.runFor(1600);
  await choosePlayers(page, 6);
  await page.clock.runFor(450);
  await play(page);
  await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("moving");
  await page.clock.runFor(1600);
  await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("settled");
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
});

test("title bots play with protected capsules without advancing the real round or saved progress", async ({
  page,
}) => {
  test.setTimeout(120000);
  await openGame(page);
  await configureGame(page, { effectsQuality: "low" });
  const readStorage = () =>
    page.evaluate(() =>
      Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])),
    );
  const before = await readStorage();
  const opening = await page.locator(".diagnostics").textContent();
  await expect(page.getByLabel("Title background", { exact: true })).toHaveText("playing");
  const elapsed = Number(await page.getByLabel("Title elapsed", { exact: true }).textContent());
  await page.clock.runFor(3000);
  expect(
    Number(await page.getByLabel("Title elapsed", { exact: true }).textContent()),
  ).toBeGreaterThan(elapsed + 2.5);
  await expect(page.getByLabel("Title protected fortresses", { exact: true })).toHaveText("4");
  await expect(page.getByLabel("Title damage", { exact: true })).toHaveText("0");
  expect(await page.locator(".diagnostics").textContent()).toBe(opening);
  expect(await readStorage()).toEqual(before);
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  await expect(page.getByLabel("Melody notes", { exact: true })).toHaveText("0");

  await play(page);
  await expect(page.getByLabel("Title background", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
  await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("ready");
  await expect(page.getByLabel("Your returns", { exact: true })).toHaveText("0");
  for (const health of await page.locator('output[aria-label$=" health"]').allTextContents())
    expect(health).toBe("3");
  for (const protection of await page
    .locator('output[aria-label$=" protection"]')
    .allTextContents())
    expect(protection).toBe("Vulnerable");
  await finishIntroduction(page);
  await restartGame(page);
  await page.clock.runFor(500);
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  await expect(page.getByLabel("Title background", { exact: true })).toHaveText("playing");
  await expect(page.getByLabel("Title damage", { exact: true })).toHaveText("0");
});

test("title demo pauses for Settings and hidden/unfocused pages without catching up", async ({
  page,
}) => {
  test.setTimeout(120000);
  await openGame(page);
  await configureGame(page, { effectsQuality: "low" });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Title background", { exact: true })).toHaveText("paused");
  let elapsed = await page.getByLabel("Title elapsed", { exact: true }).textContent();
  await page.clock.runFor(500);
  expect(await page.getByLabel("Title elapsed", { exact: true }).textContent()).toBe(elapsed);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(300);
  await expect(page.getByLabel("Title background", { exact: true })).toHaveText("playing");
  expect(await page.getByLabel("Title elapsed", { exact: true }).textContent()).not.toBe(elapsed);

  for (const hidden of [false, true]) {
    await page.evaluate((hidden) => {
      Object.defineProperty(document, "hasFocus", { configurable: true, value: () => false });
      Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
      window.dispatchEvent(new Event("blur"));
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
    await expect(page.getByLabel("Title background", { exact: true })).toHaveText("paused");
    elapsed = await page.getByLabel("Title elapsed", { exact: true }).textContent();
    await page.clock.fastForward(30000);
    expect(await page.getByLabel("Title elapsed", { exact: true }).textContent()).toBe(elapsed);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      Object.defineProperty(document, "hasFocus", { configurable: true, value: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });
    await page.clock.runFor(150);
    await expect(page.getByLabel("Title background", { exact: true })).toHaveText("playing");
    const resumed = Number(await page.getByLabel("Title elapsed", { exact: true }).textContent());
    expect(resumed - Number(elapsed)).toBeGreaterThan(0);
    expect(resumed - Number(elapsed)).toBeLessThan(0.3);
  }
});

test("live title demo preserves roster morphs and Start/Settings positions at 2, 4 and 6 seats", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await openGame(page, false);
  await configureGame(page, { effectsQuality: "low" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const controls = () =>
    Promise.all(
      ["Start", "Settings"].map((name) =>
        page.getByRole("button", { name, exact: true }).boundingBox(),
      ),
    );
  const bounds = await controls();
  for (const count of [2, 4, 6]) {
    await choosePlayers(page, count);
    await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("moving");
    await page.clock.runFor(1600);
    await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("settled");
    await expect(page.getByLabel("Title protected fortresses", { exact: true })).toHaveText(
      String(count),
    );
    expect(await controls()).toEqual(bounds);
    await page.screenshot({ path: info.outputPath(`title-${count}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(300);
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeInViewport();
  await page.screenshot({ path: info.outputPath("title-phone.png") });
  expect(errors).toEqual([]);
});
