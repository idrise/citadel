import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { openGame, play, pause, saveLevel } from "./helpers";

for (const [level, balls, pickups, speed, bat] of [
  [1, 1, 0, "14.00", "1.35"],
  [4, 1, 0, "14.61", "1.33"],
  [5, 1, 1, "14.81", "1.32"],
  [10, 2, 1, "15.82", "1.29"],
  [50, 4, 4, "23.90", "1.00"],
  [100, 8, 7, "34.00", "0.70"],
] as const)
  test(`level ${level} owns ball pressure, pickup budget and physical bat size`, async ({
    page,
  }, testInfo) => {
    await saveLevel(page, level);
    await openGame(page);
    await expect(page.getByLabel("Round level", { exact: true })).toHaveText(String(level));
    await expect(page.getByLabel("Round ball limit", { exact: true })).toHaveText(String(balls));
    await expect(page.getByLabel("Round pickup budget", { exact: true })).toHaveText(
      String(pickups),
    );
    await expect(page.getByLabel("Round ball speed", { exact: true })).toHaveText(speed);
    await expect(page.getByLabel("Round bat scale", { exact: true })).toHaveText(bat);
    await play(page);
    await page.clock.runFor(500);
    await page.screenshot({ path: testInfo.outputPath(`level-${level}.png`) });
    await page.clock.runFor(5200);
    if (level <= 5)
      await expect(page.getByLabel("Supply containers", { exact: true })).toHaveText(
        pickups ? "1" : "0",
      );
    await pause(page);
    await expect(page.getByLabel("Ball limit", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Ball addition interval", { exact: true })).toHaveCount(0);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export round", exact: true }).click();
    const report = JSON.parse(await readFile((await (await download).path())!, "utf8"));
    expect(report.difficulty).toMatchObject({ level, maxBalls: balls, pickupCount: pickups });
    await page.getByRole("button", { name: /^(Restart|Play again)$/, exact: true }).click();
    await expect(page.getByLabel("Round ball limit", { exact: true })).toHaveText(String(balls));
    await expect(page.getByLabel("Supply containers", { exact: true })).toHaveText("0");
  });
