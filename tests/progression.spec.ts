import { expect, test } from "@playwright/test";
import { choosePlayers, openGame, openSettings, pause, play } from "./helpers";

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
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
  await page.screenshot({ path: testInfo.outputPath("level-start.png") });
  await pause(page);
  await page.clock.runFor(3000);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(1200);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
  await expect(page.getByLabel("Level introduction", { exact: true })).toHaveCount(0);
  for (const seat of ["Coral", "Amber", "Violet", "Rose"])
    await expect(page.getByLabel(`${seat} health`, { exact: true })).toHaveText("3");
  await pause(page);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).rounds, key)).toBe(0);
});

test("a real second win advances the next level once and survives rematch and reload", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.addInitScript(
    ({ key, now }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            level: 1,
            count: 2,
            best: 1,
            rounds: 1,
            recent: [{ level: 1, count: 2, place: 1, at: now }],
          }),
        );
    },
    { key, now: Date.now() },
  );
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
  expect(progress.rounds).toBe(2);
  expect(progress.level).toBeGreaterThan(1);
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
  await page.clock.runFor(6000);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).rounds, key)).toBe(2);
  await page.getByRole("button", { name: "Rematch", exact: true }).click();
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText(String(progress.level));
  await page.reload();
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText(String(progress.level));
});

test("a returning phone player gets a gentler saved level without repeated refresh penalties", async ({
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
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("70");
  await page.reload();
  await expect(page.getByLabel("Round level", { exact: true })).toHaveText("70");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.clock.runFor(400);
  await expect(page.getByLabel("Level introduction", { exact: true })).toHaveText("Level 70");
  await page.screenshot({ path: testInfo.outputPath("returning-phone-level.png") });
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).best, key)).toBe(90);
});
