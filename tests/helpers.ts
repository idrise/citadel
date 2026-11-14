import type { GameSettings } from "../apps/web/src/session/settings";
import type { PlayerCount } from "../apps/web/src/simulation/arena";
import { expect, type Page } from "./fixtures";

export async function openGame(page: Page, reduced = true, seed = 2026) {
  await page.clock.install();
  await page.goto(`./?seed=${seed}`);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60000));
  // Keep existing seeded gameplay fixtures at four; fresh-load coverage uses page.goto directly.
  await choosePlayers(page, 4);
  if (reduced) await configureGame(page, { reducedEffects: true });
}
export async function openSettings(page: Page) {
  if (!(await page.getByRole("button", { name: "Resume", exact: true }).isVisible()))
    await page.getByRole("button", { name: "Settings", exact: true }).click();
}
export async function configureGame(page: Page, patch: Partial<GameSettings>) {
  await page.evaluate((patch) => window.__citadelTestInput.session!.configure(patch), patch);
  await expect
    .poll(() =>
      page.evaluate((patch) => {
        try {
          return JSON.parse(localStorage.getItem("citadel.solo.v1")!).settings;
        } catch {
          return patch;
        }
      }, patch),
    )
    .toMatchObject(patch);
}
export async function selectFortress(page: Page, seat: number) {
  const count = Number(await page.getByLabel("Player count", { exact: true }).textContent());
  await page.evaluate(
    ({ count, seat }) => window.__citadelTestInput.session!.roster(count as PlayerCount, seat),
    { count, seat },
  );
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("citadel.solo.v1")!).humanSeat))
    .toBe(seat);
}
export async function restartGame(page: Page) {
  await page.evaluate(() => window.__citadelTestInput.session!.restart());
}
export async function exportRound(page: Page) {
  await page.evaluate(() => window.__citadelTestInput.session!.download());
}
export async function choosePlayers(page: Page, count: number) {
  if (await page.getByRole("button", { name: "Resume", exact: true }).isVisible())
    await page.getByRole("button", { name: "Resume", exact: true }).click();
  const current = Number(await page.getByLabel("Player count", { exact: true }).textContent());
  for (let n = current; n !== count; n += Math.sign(count - current))
    await page
      .getByRole("button", {
        name: count > current ? "Increase players" : "Decrease players",
        exact: true,
      })
      .click();
  await expect(page.getByLabel("Player count", { exact: true })).toHaveText(String(count));
}
export async function play(page: Page) {
  if (await page.getByRole("button", { name: "Resume", exact: true }).isVisible())
    await page.getByRole("button", { name: "Resume", exact: true }).click();
  if (!(await page.evaluate(() => Boolean(document.pointerLockElement))))
    await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe("CANVAS");
}
export async function pause(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
}

/** Start a normal saved challenge; never alter a live match or its outcome. */
export async function saveLevel(page: Page, level: number, count = 4) {
  await page.addInitScript(
    ({ level, count }) => {
      const key = "citadel.progress.v1";
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 2,
            level,
            count,
            best: Math.max(1, level - 1),
            rounds: 1,
            losses: 0,
            demotion: null,
            recent: [{ level: Math.max(1, level - 1), count, place: 1, at: Date.now() }],
          }),
        );
    },
    { level, count },
  );
}

/** Advance the text-dependent intro and the existing quarter-second serve arming window. */
export async function finishIntroduction(page: Page) {
  if ((await page.getByLabel("Round phase", { exact: true }).textContent()) === "countdown") {
    const remaining = Number(
      await page.getByLabel("Introduction remaining", { exact: true }).textContent(),
    );
    await page.clock.runFor(Math.ceil(remaining * 1000) + 350);
  }
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
}

/** Dispatch relative movement directly to the normal input adapter without any OS mouse activity. */
export async function moveMouse(page: Page, x: number, y: number) {
  await page.evaluate(({ x, y }) => window.__citadelTestInput.move(x, y), { x, y });
}
