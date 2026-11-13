import { expect, test } from "./fixtures";
import {
  configureGame,
  selectFortress,
  restartGame,
  exportRound,
  finishIntroduction,
  choosePlayers,
  openGame,
  openSettings,
  play,
  saveLevel,
} from "./helpers";
import { readFile } from "node:fs/promises";

test("player-count previews morph on the same canvas with fixed menu controls and rapid retargeting", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openGame(page, false);
  const canvas = (await page.locator(".viewport canvas").elementHandle())!;
  const controls = (await page.locator(".scene-controls").elementHandle())!;
  const names = ["Start", "Decrease players", "Increase players", "Settings"];
  const boxes = await Promise.all(
    names.map((name) => page.getByRole("button", { name, exact: true }).boundingBox()),
  );
  await choosePlayers(page, 2);
  await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("moving");
  await page.clock.runFor(1000);
  await page.screenshot({ path: testInfo.outputPath("preview-2.png") });
  await choosePlayers(page, 6);
  await page.clock.runFor(400);
  await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("moving");
  await page.screenshot({ path: testInfo.outputPath("preview-middle.png") });
  await choosePlayers(page, 4);
  await page.clock.runFor(1000);
  await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("settled");
  await page.screenshot({ path: testInfo.outputPath("preview-4.png") });
  expect(await canvas.evaluate((node) => node === document.querySelector(".viewport canvas"))).toBe(
    true,
  );
  expect(
    await controls.evaluate((node) => node === document.querySelector(".scene-controls")),
  ).toBe(true);
  expect(
    await Promise.all(
      names.map((name) => page.getByRole("button", { name, exact: true }).boundingBox()),
    ),
  ).toEqual(boxes);
  expect(errors).toEqual([]);
});

test("clamping a selected fortress during the preview keeps the menu fixed and Start remains playable", async ({
  page,
}) => {
  await openGame(page, false);
  await choosePlayers(page, 6);
  await openSettings(page);
  await selectFortress(page, Number("5"));
  await choosePlayers(page, 2);
  await play(page);
  await finishIntroduction(page);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
  await expect(page.getByLabel("Arena preview", { exact: true })).toHaveText("settled");
  await expect(page.getByLabel("Survivors", { exact: true })).toHaveText("2");
});

test("ordinary restarted attempts keep their opening seed but vary pickup seeds and positions", async ({
  page,
}) => {
  await saveLevel(page, 5);
  await page.clock.install();
  await page.goto("./");
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60000));
  await openSettings(page);
  await configureGame(page, { reducedEffects: true });
  await configureGame(page, { music: false, effectsVolume: 0 });
  const reports: {
    seed: number;
    supplySeed: number;
    supplies: { position: { x: number; y: number } }[];
  }[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    await play(page);
    await finishIntroduction(page);
    // Inspect the first drop before it lands and can be collected.
    await page.clock.runFor(4200);
    await page.keyboard.press("Escape");
    await openSettings(page);
    const download = page.waitForEvent("download");
    await exportRound(page);
    reports.push(JSON.parse(await readFile((await (await download).path())!, "utf8")));
    if (!attempt) await restartGame(page);
  }
  expect(reports[0]!.supplies).toHaveLength(1);
  expect(reports[1]!.supplies).toHaveLength(1);
  expect(reports[0]!.seed).toBe(reports[1]!.seed);
  expect(reports[0]!.supplySeed).not.toBe(reports[1]!.supplySeed);
  expect(reports[0]!.supplies[0]!.position).not.toEqual(reports[1]!.supplies[0]!.position);
});

test("choosing the current roster keeps Settings usable without resetting the round", async ({
  page,
}) => {
  await openGame(page);
  await openSettings(page);
  await selectFortress(page, Number("0"));
  await page.evaluate(() => window.__citadelTestInput.session!.roster(4, 0));
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await play(page);
  await finishIntroduction(page);
  await page.keyboard.press("Escape");
  await openSettings(page);
  const before = await page.locator(".diagnostics").textContent();
  await selectFortress(page, Number("0"));
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  expect(await page.locator(".diagnostics").textContent()).toBe(before);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
});
