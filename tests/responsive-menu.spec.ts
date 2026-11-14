import { expect, test } from "./fixtures";
import { choosePlayers, openGame } from "./helpers";

for (const touch of [false, true]) {
  test.describe(touch ? "touch responsive menu" : "mouse responsive menu", () => {
    test.use({ hasTouch: touch, isMobile: touch });
    test("anchors the bottom controls across widths, orientations and camera motion", async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await openGame(page, false);
      await choosePlayers(page, 6);
      if (touch) {
        await page.getByRole("button", { name: "Settings", exact: true }).tap();
        await page.getByRole("button", { name: "Resume", exact: true }).tap();
      }
      await page.clock.runFor(1000);
      const canvas = await page.locator("canvas").elementHandle();
      const start = page.getByRole("button", { name: "Start", exact: true });
      const positions = new Map<number, number>();
      for (const [width, height] of [
        [680, 600],
        [699, 600],
        [700, 600],
        [701, 600],
        [699, 700],
        [700, 699],
        [768, 1024],
        [1024, 768],
      ]) {
        await page.setViewportSize({ width: width!, height: height! });
        await page.clock.runFor(80);
        for (const name of ["Start", "Settings"]) {
          const box = (await page.getByRole("button", { name, exact: true }).boundingBox())!;
          expect(Math.abs(box.x + box.width / 2 - width! / 2)).toBeLessThan(1);
          expect(box.y).toBeGreaterThanOrEqual(12);
          expect(box.y + box.height).toBeLessThanOrEqual(height! - 12);
          if (name === "Start") {
            if (positions.has(height!)) expect(box.y).toBeCloseTo(positions.get(height!)!, 5);
            else positions.set(height!, box.y);
          }
        }
        if ([699, 700, 1024].includes(width!))
          await page.screenshot({
            path: testInfo.outputPath(`${touch ? "touch" : "mouse"}-${width}x${height}.png`),
          });
      }
      let previous: number | null = null;
      for (const height of [501, 500, 499, 498]) {
        await page.setViewportSize({ width: 844, height });
        await page.clock.runFor(50);
        const box = (await start.boundingBox())!;
        const centre = box.x + box.width / 2;
        if (previous !== null) expect(Math.abs(centre - previous)).toBeLessThan(4);
        previous = centre;
      }
      await page.setViewportSize({ width: 844, height: 390 });
      await page.clock.runFor(80);
      const shortBox = (await start.boundingBox())!;
      expect(Math.abs(shortBox.x + shortBox.width / 2 - 422)).toBeLessThan(1);
      await page.screenshot({
        path: testInfo.outputPath(`${touch ? "touch" : "mouse"}-844x390.png`),
      });
      const increase = page.getByRole("button", { name: "Increase players", exact: true });
      if (touch) await increase.tap();
      else await increase.click();
      await expect(page.getByLabel("Player count", { exact: true })).toHaveText("7");
      expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
      expect(errors).toEqual([]);
    });
  });
}
