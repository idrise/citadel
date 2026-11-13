import { expect, test } from "./fixtures";
import { configureGame, choosePlayers, openGame, openSettings, play, pause } from "./helpers";
test("natural rallies accelerate, freeze while paused and reset after a real score", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 480, height: 360 });
  await openGame(page, true, 1);
  await choosePlayers(page, 4);
  await openSettings(page);
  await configureGame(page, { music: false, effectsVolume: 0 });
  await play(page);
  let boosted = false,
    reset = false,
    pauseChecked = false;
  for (let time = 0; time < 90000; time += 250) {
    await page.clock.runFor(250);
    if ((await page.getByLabel("Round phase", { exact: true }).textContent()) === "finished") break;
    const phase = await page.getByLabel("Ball 0 phase", { exact: true }).textContent(),
      speed = Number(await page.getByLabel("Ball 0 speed", { exact: true }).textContent()),
      seconds = Number(await page.getByLabel("Ball 0 rally time", { exact: true }).textContent());
    if (phase === "active") {
      const expected = 14 * (1 + Math.min(0.75, Math.max(0, seconds - 8) * 0.05));
      expect(Math.abs(speed - expected)).toBeLessThan(0.03);
      if (speed > 14.2) {
        boosted = true;
        if (!pauseChecked) {
          await pause(page);
          const held = await page.getByLabel("Ball 0 rally time", { exact: true }).textContent();
          await page.clock.runFor(2000);
          await expect(page.getByLabel("Ball 0 rally time", { exact: true })).toHaveText(held!);
          await page.getByRole("button", { name: "Resume", exact: true }).click();
          pauseChecked = true;
          await page.screenshot({ path: testInfo.outputPath("accelerated-rally.png") });
        }
      }
    } else if (boosted) {
      expect(speed).toBe(0);
      expect(seconds).toBe(0);
      reset = true;
      break;
    }
  }
  expect(boosted).toBe(true);
  expect(pauseChecked).toBe(true);
  expect(reset).toBe(true);
});
