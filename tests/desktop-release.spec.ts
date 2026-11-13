import { readFile, writeFile } from "node:fs/promises";
import { expect, test } from "./fixtures";
import {
  configureGame,
  selectFortress,
  exportRound,
  finishIntroduction,
  openGame,
  play,
  pause,
  openSettings,
  choosePlayers,
} from "./helpers";

test("fresh six-seat desktop round exports an honest local result and resets on rematch", async ({
  page,
}, testInfo) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 640, height: 480 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openGame(page);
  await choosePlayers(page, 6);
  await openSettings(page);
  await expect(page.getByText("How to play", { exact: true })).toHaveCount(0);
  await openSettings(page);
  await configureGame(page, { music: false, effectsVolume: 0 });
  await selectFortress(page, Number("5"));
  const playButton = page.getByRole("button", { name: "Start", exact: true });
  await playButton.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(true);
  await finishIntroduction(page);
  await page.keyboard.down("KeyA");
  await page.clock.runFor(100);
  await page.keyboard.up("KeyA");
  const rematch = page.getByRole("button", {
    name: /^(Next level|Retry|Play again)$/,
    exact: true,
  });
  for (let seconds = 0; seconds < 240 && !(await rematch.isVisible()); seconds += 2)
    await page.clock.runFor(2000);
  await expect(rematch).toBeVisible();
  await expect(page.locator(".menu-panel")).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(1);
  await openSettings(page);
  const downloadPromise = page.waitForEvent("download");
  await exportRound(page);
  const download = await downloadPromise;
  const report = JSON.parse(await readFile((await download.path())!, "utf8")) as {
    schema: string;
    version: number;
    seed: number;
    initialPlayers: number;
    humanSeat: number;
    phase: string;
    winner: number;
    elapsedSeconds: number;
    stats: { damage: number; collisionCaps: number };
    players: { seat: number; place: number; health: number; scored: number; lost: number }[];
  };
  expect(report).toMatchObject({
    schema: "citadel.round",
    version: 1,
    seed: 2026,
    initialPlayers: 6,
    humanSeat: 5,
    phase: "finished",
    stats: { collisionCaps: 0 },
  });
  expect(report.players).toHaveLength(6);
  expect(report.players.filter((row) => row.health > 0)).toHaveLength(1);
  expect(report.players.find((row) => row.seat === report.winner)!.place).toBe(1);
  expect(report.players.reduce((sum, row) => sum + row.lost, 0)).toBe(report.stats.damage);
  await writeFile(
    testInfo.outputPath("six-seat-round.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  // The download click may scroll a short viewport; capture the full result at desktop size.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.clock.runFor(100);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(rematch).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("desktop-results.png") });
  await rematch.click();
  await expect(page.getByLabel("Player count", { exact: true })).toHaveText("6");
  await expect(page.getByLabel("Your pieces broken", { exact: true })).toHaveText("0");
  await play(page);
  await page.clock.runFor(300);
  await pause(page);
  expect(errors).toEqual([]);
});

test("solo preferences survive refresh, and every quality preset remains playable without a HUD", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 640, height: 480 });
  await openGame(page, false);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await choosePlayers(page, 6);
  await openSettings(page);
  await configureGame(page, { effectsQuality: "medium" });
  await configureGame(page, { music: false, effectsVolume: 0 });
  await selectFortress(page, Number("5"));
  await page.reload();
  await expect(page.getByLabel("Player count", { exact: true })).toHaveText("6");
  await openSettings(page);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("citadel.solo.v1")!)),
  ).toMatchObject({ humanSeat: 5, settings: { effectsQuality: "medium", music: false } });
  // Run the countdown cheaply; exercise the actual full presets in bounded frame samples below.
  await configureGame(page, { effectsQuality: "low" });
  await openSettings(page);
  await play(page);
  await finishIntroduction(page);
  for (const quality of ["low", "medium", "high"] as const) {
    await pause(page);
    await openSettings(page);
    await configureGame(page, { effectsQuality: quality });
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await page.clock.runFor(100);
    await expect(page.locator(".menu-panel")).toHaveCount(0);
    await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
  }
  const previous = await page.locator(".diagnostics").textContent();
  await page.context().setOffline(true);
  await page.clock.runFor(200);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
  await expect(page.locator(".diagnostics")).not.toHaveText(previous!);
  expect(errors).toEqual([]);
});

test("unavailable preference storage never prevents starting a local game", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw Error("Storage blocked");
      },
    }),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openGame(page);
  await play(page);
  await finishIntroduction(page);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
  expect(errors).toEqual([]);
});
