import { expect, test } from "./fixtures";
import { configureGame, finishIntroduction, openGame, pause, play } from "./helpers";

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
])
  test(`release version stays readable on title, play and pause at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openGame(page, false);
    const version = page.getByLabel("Release version", { exact: true });
    await expect(version).toHaveText("V1.0.0");
    await page.screenshot({ path: testInfo.outputPath("title.png") });
    await configureGame(page, { effectsQuality: "low" });
    await play(page);
    await finishIntroduction(page);
    await expect(version).toHaveText("V1.0.0");
    await page.screenshot({ path: testInfo.outputPath("playing-low.png") });
    await pause(page);
    await expect(version).toHaveText("V1.0.0");
    await page.screenshot({ path: testInfo.outputPath("paused.png") });
    expect(errors).toEqual([]);
  });
