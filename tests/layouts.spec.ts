import { expect, test } from "@playwright/test";
import { openGame, play, pause, openSettings, choosePlayers } from "./helpers";

for (const [count, rounds] of [
  [2, 3],
  [3, 1],
  [4, 4],
  [5, 1],
  [6, 3],
] as const) {
  test(`${count} seats: complete ${rounds} scripted desktop rounds and rematch with roster/settings intact`, async ({
    page,
  }) => {
    test.setTimeout(300000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
    await page.setViewportSize({ width: 480, height: 360 });
    await openGame(page);
    await choosePlayers(page, count);
    await openSettings(page);
    await page.getByRole("checkbox", { name: "Music", exact: true }).uncheck();
    await expect(page.getByLabel("Bot difficulty", { exact: true })).toHaveCount(0);
    await openSettings(page);
    let sawTransition = false;
    for (let round = 0; round < rounds; round++) {
      const seat = round === 0 ? count - 1 : round % count;
      await openSettings(page);
      await page.getByLabel("Your fortress", { exact: true }).selectOption(String(seat));
      await openSettings(page);
      await expect(page.getByLabel("Survivors", { exact: true })).toHaveText(String(count));
      await play(page);
      await page.clock.runFor(1800);
      const angle = Number(await page.getByLabel("Bat angle", { exact: true }).textContent());
      await page.keyboard.down("KeyD");
      await page.clock.runFor(100);
      await page.keyboard.up("KeyD");
      expect(Number(await page.getByLabel("Bat angle", { exact: true }).textContent())).not.toBe(
        angle,
      );
      await pause(page);
      const stats = await page.locator(".diagnostics").textContent();
      await page.clock.runFor(300);
      expect(await page.locator(".diagnostics").textContent()).toBe(stats);
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      const rematch = page.getByRole("button", { name: "Rematch", exact: true });
      for (let elapsed = 0; elapsed < 240 && !(await rematch.isVisible()); elapsed += 2) {
        await page.clock.runFor(2000);
        if ((await page.getByLabel("Arena transition", { exact: true }).textContent()) === "moving")
          sawTransition = true;
      }
      await expect(rematch).toBeVisible();
      await expect(page.locator(".menu-panel")).toHaveCount(0);
      await openSettings(page);
      await page.getByText("Round statistics", { exact: true }).click();
      await expect(page.getByRole("table", { name: "Round standings" })).toBeVisible();
      await expect(page.getByLabel("Survivors", { exact: true })).toHaveText("1");
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      await rematch.click();
      await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
      await expect(page.getByLabel("Player count", { exact: true })).toHaveText(String(count));
      await expect(page.getByLabel("Balls in play", { exact: true })).toHaveText("1");
    }
    if (count > 2) expect(sawTransition).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("all six human fortresses support captured input, adaptive levels and shrinking the roster clamps the seat", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 640, height: 480 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  await openGame(page);
  await choosePlayers(page, 6);
  for (let seat = 0; seat < 6; seat++) {
    await openSettings(page);
    await expect(page.getByLabel("Round level", { exact: true })).toHaveText("1");
    await page.getByLabel("Your fortress", { exact: true }).selectOption(String(seat));
    await play(page);
    await page.clock.runFor(1800);
    await pause(page);
    await page.getByRole("button", { name: "Restart", exact: true }).click();
  }
  await choosePlayers(page, 2);
  await openSettings(page);
  await expect(page.getByLabel("Your fortress", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("Your fortress", { exact: true }).locator("option")).toHaveCount(2);
  await expect(page.getByLabel("Bot difficulty", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("two-player captured mouse reaches both end walls without the old travel gaps", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 960, height: 675 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openGame(page, false);
  await choosePlayers(page, 2);
  await openSettings(page);
  await page.getByRole("checkbox", { name: "Music", exact: true }).uncheck();
  await openSettings(page);
  await play(page);
  await page.clock.runFor(1800);
  await page.mouse.move(1500, 300);
  await page.clock.runFor(600);
  expect(Number(await page.getByLabel("Bat angle", { exact: true }).textContent())).toBeGreaterThan(
    -20,
  );
  await page.screenshot({ path: testInfo.outputPath("reach-right.png") });
  await page.mouse.move(-500, 300);
  await page.clock.runFor(1000);
  expect(Number(await page.getByLabel("Bat angle", { exact: true }).textContent())).toBeLessThan(
    -160,
  );
  await page.screenshot({ path: testInfo.outputPath("reach-left.png") });
  expect(errors).toEqual([]);
});
