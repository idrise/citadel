import { expect, test } from "./fixtures";
import {
  openGame,
  choosePlayers,
  configureGame,
  selectFortress,
  play,
  finishIntroduction,
} from "./helpers";
for (const side of [-1, 1])
  test(`a keyboard swipe can serve with signed curve ${side}`, async ({ page }) => {
    await openGame(page);
    await configureGame(page, { music: false, effectsVolume: 0 });
    await choosePlayers(page, 2);
    await expect(page.getByLabel("Arena players", { exact: true })).toHaveText("2");
    const owner = await page.getByLabel("Ball 0 owner", { exact: true }).textContent();
    await selectFortress(page, owner === "Coral" ? 0 : 1);
    await play(page);
    await finishIntroduction(page);
    await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("ready");
    const key = side === 1 ? "KeyD" : "KeyA";
    await page.keyboard.down(key);
    await page.keyboard.press("Space");
    await page.clock.runFor(25);
    await page.keyboard.up(key);
    await page.clock.runFor(80);
    await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("active");
    const spin = Number(await page.getByLabel("Ball 0 spin", { exact: true }).textContent());
    expect(Math.sign(spin)).toBe(side);
    expect(Math.abs(spin)).toBeGreaterThan(0.5);
  });
test("a mouse flick and click impart curve through the captured-input adapter", async ({
  page,
}) => {
  await openGame(page);
  await configureGame(page, { music: false, effectsVolume: 0 });
  await choosePlayers(page, 2);
  await expect(page.getByLabel("Arena players", { exact: true })).toHaveText("2");
  const owner = await page.getByLabel("Ball 0 owner", { exact: true }).textContent();
  await selectFortress(page, owner === "Coral" ? 0 : 1);
  await play(page);
  await finishIntroduction(page);
  await page.evaluate(() => {
    window.__citadelTestInput.move(30, 300);
    window.__citadelTestInput.click();
  });
  await page.clock.runFor(100);
  await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("active");
  expect(
    Number(await page.getByLabel("Ball 0 spin", { exact: true }).textContent()),
  ).toBeGreaterThan(0.5);
});
test.describe("touch serving curve", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("a drag followed by a tap within the swipe window adds launch curve", async ({ page }) => {
    await openGame(page);
    await configureGame(page, { music: false, effectsVolume: 0 });
    await choosePlayers(page, 2);
    await expect(page.getByLabel("Arena players", { exact: true })).toHaveText("2");
    const owner = await page.getByLabel("Ball 0 owner", { exact: true }).textContent();
    await selectFortress(page, owner === "Coral" ? 0 : 1);
    await page.getByRole("button", { name: "Start", exact: true }).tap();
    await finishIntroduction(page);
    await page.evaluate(() => {
      window.__citadelTestInput.touch("pointerdown", 170, 650);
      window.__citadelTestInput.touch("pointermove", 215, 650);
    });
    await page.clock.runFor(17);
    await page.evaluate(() => {
      const input = window.__citadelTestInput;
      input.touch("pointerup", 215, 650);
      input.touch("pointerdown", 215, 650, 22);
      input.touch("pointerup", 215, 650, 22);
    });
    await page.clock.runFor(100);
    await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("active");
    expect(
      Number(await page.getByLabel("Ball 0 spin", { exact: true }).textContent()),
    ).toBeGreaterThan(0.5);
  });
});
