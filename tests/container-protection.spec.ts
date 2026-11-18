import { expect, test } from "./fixtures";
import { choosePlayers, finishIntroduction, openGame, pause, play } from "./helpers";
test("a real lost container protects the human bank, freezes on pause and resets on Restart", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await openGame(page, false, 1);
  await choosePlayers(page, 2);
  await play(page);
  await finishIntroduction(page);
  await page.keyboard.down("KeyD");
  const health = page.getByLabel("Coral health", { exact: true });
  for (let ticks = 0; ticks < 800 && (await health.textContent()) === "3"; ticks++)
    await page.clock.runFor(50);
  await page.keyboard.up("KeyD");
  await expect(health).toHaveText("2");
  await expect(page.getByLabel("Coral protection", { exact: true })).toHaveText("Protected");
  await pause(page);
  const frozen = await page.locator(".diagnostics").textContent();
  await page.clock.runFor(3000);
  await expect(page.getByLabel("Coral protection", { exact: true })).toHaveText("Protected");
  expect(await page.locator(".diagnostics").textContent()).toBe(frozen);
  await page.screenshot({ path: info.outputPath("protected-bank-paused.png") });
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(health).toHaveText("3");
  await expect(page.getByLabel("Coral protection", { exact: true })).toHaveText("Vulnerable");
});
