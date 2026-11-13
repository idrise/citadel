import { expect, test } from "./fixtures";
import { finishIntroduction, choosePlayers, openGame, openSettings, pause, play } from "./helpers";

const key = "citadel.progress.v1";
test("introduces the level before play, pauses the introduction and never rates an abandoned round", async ({
  page,
}, testInfo) => {
  await openGame(page);
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
  await openSettings(page);
  await expect(page.getByLabel("Bot difficulty", { exact: true })).toHaveCount(0);
  await play(page);
  await page.clock.runFor(400);
  await expect(page.getByLabel("Level introduction", { exact: true })).toHaveText("Level 1");
  await expect(page.getByLabel("Loss consequence", { exact: true })).toHaveText(
    "LEVEL 01 IS THE FLOOR",
  );
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
  await page.screenshot({ path: testInfo.outputPath("level-start.png") });
  await pause(page);
  await page.clock.runFor(3000);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await finishIntroduction(page);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
  await expect(page.getByLabel("Level introduction", { exact: true })).toHaveCount(0);
  for (const seat of ["Coral", "Amber", "Violet", "Rose"])
    await expect(page.getByLabel(`${seat} health`, { exact: true })).toHaveText("3");
  await pause(page);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).rounds, key)).toBe(0);
});

test("a first win advances 1 to 2 and one click starts the next round without recreating the canvas", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await openGame(page);
  await choosePlayers(page, 2);
  await openSettings(page);
  await page.getByRole("checkbox", { name: "Music", exact: true }).uncheck();
  await play(page);
  for (
    let time = 0;
    time < 120 &&
    (await page.getByLabel("Round phase", { exact: true }).textContent()) !== "finished";
    time++
  )
    await page.clock.runFor(1000);
  await expect(page.getByLabel("Round winner", { exact: true })).toHaveText("You win");
  const progress = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(progress.rounds).toBe(1);
  expect(progress.level).toBe(2);
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
  await expect(page.getByLabel("Round ball speed", { exact: true })).toHaveText("14.00");
  await page.clock.runFor(6000);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).rounds, key)).toBe(1);
  await page.screenshot({ path: testInfo.outputPath("level-1-win.png") });
  await page.locator("canvas").evaluate((canvas) => canvas.setAttribute("data-continued", "same"));
  await page.getByRole("button", { name: "Next level", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeHidden();
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
  await expect(page.getByLabel("Level introduction", { exact: true })).toHaveText("Level 2");
  await expect(page.getByLabel("Round ball speed", { exact: true })).toHaveText("14.20");
  await expect(page.locator("canvas")).toHaveAttribute("data-continued", "same");
  await page.screenshot({ path: testInfo.outputPath("level-2-start.png") });
  await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(true);
  await finishIntroduction(page);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText(String(progress.level));
  await page.reload();
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText(String(progress.level));
});

test("a returning phone player keeps their saved level regardless of time away", async ({
  page,
}, testInfo) => {
  const now = new Date("2026-11-12T12:00:00Z").getTime();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: now });
  await page.addInitScript(
    ({ key, at }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          level: 80,
          count: 4,
          best: 90,
          rounds: 1,
          recent: [{ level: 80, count: 4, place: 1, at }],
        }),
      ),
    { key, at: now - 8 * 86400000 },
  );
  await page.goto("./");
  await page.clock.pauseAt(now + 1000);
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("80");
  await page.reload();
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("80");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.clock.runFor(400);
  await expect(page.getByLabel("Level introduction", { exact: true })).toHaveText("Level 80");
  await page.screenshot({ path: testInfo.outputPath("returning-phone-level.png") });
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).best, key)).toBe(90);
});

test("a loss retries the played level directly and preserves it after reload", async ({
  page,
}, testInfo) => {
  await page.addInitScript(
    ({ key, now }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            level: 2,
            count: 2,
            best: 1,
            rounds: 1,
            recent: [{ level: 1, count: 2, place: 1, at: now }],
          }),
        );
    },
    { key, now: Date.now() },
  );
  await openGame(page, true, 8);
  await choosePlayers(page, 2);
  await openSettings(page);
  await page.getByRole("checkbox", { name: "Music", exact: true }).uncheck();
  await page.getByLabel("Your fortress", { exact: true }).selectOption("1");
  await play(page);
  await expect(page.getByLabel("Loss consequence", { exact: true })).toHaveText(
    "LOSS RETRIES LEVEL 02",
  );
  await page.clock.runFor(450);
  await page.screenshot({ path: testInfo.outputPath("safe-retry.png") });
  await page.keyboard.down("KeyD");
  for (
    let seconds = 0;
    seconds < 120 &&
    (await page.getByLabel("Round phase", { exact: true }).textContent()) !== "finished";
    seconds++
  )
    await page.clock.runFor(1000);
  await page.keyboard.up("KeyD");
  await expect(page.getByLabel("Round winner", { exact: true })).toHaveText("Coral wins");
  await page.clock.runFor(1000);
  const progress = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(progress.level).toBe(2);
  expect(progress.losses).toBe(1);
  expect(progress.rounds).toBe(2);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByLabel("Level introduction", { exact: true })).toHaveText("Level 2");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath("retry-level-2.png") });
  await finishIntroduction(page);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
  await page.reload();
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("2");
});

test("an older loss-demoted save restores the level that was played", async ({ page }) => {
  await page.addInitScript(
    ({ key, now }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          level: 1,
          count: 4,
          best: 1,
          rounds: 2,
          recent: [
            { level: 1, count: 4, place: 1, at: now - 1000 },
            { level: 2, count: 4, place: 4, at: now },
          ],
        }),
      ),
    { key, now: Date.now() },
  );
  await openGame(page);
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("2");
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).level, key)).toBe(2);
});

test("the third consecutive loss demotes one level, announces it and persists the new challenge", async ({
  page,
}, testInfo) => {
  await page.addInitScript(
    ({ key, now }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 2,
            level: 2,
            count: 2,
            best: 1,
            rounds: 3,
            losses: 2,
            demotion: null,
            recent: [
              { level: 1, count: 2, place: 1, at: now - 3000 },
              { level: 2, count: 2, place: 2, at: now - 2000 },
              { level: 2, count: 2, place: 2, at: now - 1000 },
            ],
          }),
        );
    },
    { key, now: Date.now() },
  );
  await openGame(page, true, 8);
  await choosePlayers(page, 2);
  await openSettings(page);
  await page.getByRole("checkbox", { name: "Music", exact: true }).uncheck();
  await page.getByLabel("Your fortress", { exact: true }).selectOption("1");
  await play(page);
  await expect(page.getByLabel("Loss consequence", { exact: true })).toHaveText(
    "LOSS DROPS TO LEVEL 01",
  );
  await page.clock.runFor(450);
  await page.screenshot({ path: testInfo.outputPath("demotion-warning.png") });
  await page.keyboard.down("KeyD");
  for (
    let seconds = 0;
    seconds < 120 &&
    (await page.getByLabel("Round phase", { exact: true }).textContent()) !== "finished";
    seconds++
  )
    await page.clock.runFor(1000);
  await page.keyboard.up("KeyD");
  await expect(page.getByLabel("Round winner", { exact: true })).toHaveText("Coral wins");
  await page.clock.runFor(4600);
  await expect(page.getByLabel("Progress update", { exact: true })).toHaveText(
    "Demoted to level 1 after three consecutive losses.",
  );
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("2");
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(saved).toMatchObject({
    version: 2,
    level: 1,
    losses: 0,
    rounds: 4,
    demotion: { from: 2, to: 1, count: 2 },
  });
  await page.screenshot({ path: testInfo.outputPath("demotion-result.png") });
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByLabel("Level introduction", { exact: true })).toHaveText("Level 1");
  await page.clock.runFor(450);
  await page.screenshot({ path: testInfo.outputPath("demoted-level-start.png") });
  await page.reload();
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
  await expect(page.getByLabel("Progress update", { exact: true })).toHaveText(
    /Demoted to level 1/,
  );
});
