import { expect, test } from "./fixtures";
import {
  choosePlayers,
  configureGame,
  finishIntroduction,
  openGame,
  play,
  saveLevel,
} from "./helpers";

test.use({ video: "on", viewport: { width: 1280, height: 900 } });
for (const count of [2, 4, 6, 12])
  test(`level 100 remains playable with fallible bots and ${count} players`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await saveLevel(page, 100, count);
    await openGame(page, false, 20);
    await choosePlayers(page, count);
    await configureGame(page, { music: false, effectsVolume: 0, effectsQuality: "low" });
    await play(page);
    await finishIntroduction(page);
    await expect(page.getByLabel("Round level", { exact: true })).toHaveText("100");
    await expect(page.getByLabel("Round ball limit", { exact: true })).toHaveText("16");
    await expect(page.getByLabel("Round ball speed", { exact: true })).toHaveText("34.00");
    await page.clock.runFor(2300);
    await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
    await page.screenshot({ path: info.outputPath(`elite-level-100-${count}.png`) });
    await page.keyboard.down("KeyD");
    await page.clock.runFor(200);
    await page.keyboard.up("KeyD");
    await page.keyboard.down("KeyA");
    await page.clock.runFor(400);
    await page.keyboard.up("KeyA");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
