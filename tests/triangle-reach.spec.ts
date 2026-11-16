import { expect, test } from "./fixtures";
import { choosePlayers, finishIntroduction, moveMouse, openGame } from "./helpers";

for (const touch of [false, true]) {
  test.describe(touch ? "triangle touch reach" : "triangle mouse reach", () => {
    test.use({
      hasTouch: touch,
      isMobile: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 800, height: 600 },
    });
    test("reaches both wall limits with the forward fortress", async ({ page }) => {
      await openGame(page);
      await choosePlayers(page, 3);
      const start = page.getByRole("button", { name: "Start", exact: true });
      if (touch) await start.tap();
      else await start.click();
      await finishIntroduction(page);
      const low = Number(await page.getByLabel("Bat minimum angle", { exact: true }).textContent()),
        high = Number(await page.getByLabel("Bat maximum angle", { exact: true }).textContent());
      // The old permanent corridor limited a level-one bat to about 36 degrees total.
      expect(high - low).toBeGreaterThan(55);
      if (touch)
        await page.evaluate(() => {
          window.__citadelTestInput.touch("pointerdown", 60, 700);
          window.__citadelTestInput.touch("pointermove", 330, 700);
        });
      else await moveMouse(page, 10000, 300);
      await page.clock.runFor(200);
      expect(Number(await page.getByLabel("Bat angle", { exact: true }).textContent())).toBeCloseTo(
        high,
        1,
      );
      if (touch) await page.evaluate(() => window.__citadelTestInput.touch("pointermove", 10, 700));
      else await moveMouse(page, -10000, 300);
      await page.clock.runFor(250);
      expect(Number(await page.getByLabel("Bat angle", { exact: true }).textContent())).toBeCloseTo(
        low,
        1,
      );
      if (touch) await page.evaluate(() => window.__citadelTestInput.touch("pointerup", 10, 700));
    });
  });
}
