import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures";
import { openGame, openSettings } from "./helpers";

for (const touch of [false, true])
  test.describe(touch ? "touch graphics" : "desktop graphics", () => {
    test.use({
      hasTouch: touch,
      isMobile: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    });
    test("saves each quality level and changes the real rendering passes while paused", async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await openGame(page, false);
      if (touch) await page.getByRole("button", { name: "Settings", exact: true }).tap();
      else await openSettings(page);
      const canvas = await page.locator("canvas").elementHandle();
      const quality = page.getByRole("slider", { name: "Graphics quality", exact: true });
      const tick = await page.locator(".diagnostics").textContent();
      for (const [step, name] of ["Low", "Medium", "High"].entries()) {
        await quality.fill(String(step));
        await expect(quality).toHaveAttribute("aria-valuetext", name);
        await page.clock.runFor(200);
        expect(await page.locator(".diagnostics").textContent()).toBe(tick);
        expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
        const saved = await page.evaluate(
          () => JSON.parse(localStorage.getItem("citadel.solo.v1")!).settings,
        );
        expect(saved.effectsQuality).toBe(name.toLowerCase());
        const downloadPromise = page.waitForEvent("download");
        const report = page.getByRole("button", { name: "Save performance report", exact: true });
        if (touch) await report.tap();
        else await report.click();
        const download = await downloadPromise;
        const data = JSON.parse(await readFile((await download.path())!, "utf8"));
        expect(data.graphics.effects).toMatchObject({
          bloom: step > 0,
          reflections: step === 2,
          environment: step === 2,
        });
        expect(data.graphics.shadows).toBe(false);
        await page.screenshot({ path: info.outputPath(`${name.toLowerCase()}-settings.png`) });
      }
      await quality.focus();
      await page.keyboard.press("Home");
      await expect(quality).toHaveAttribute("aria-valuetext", "Low");
      await page.reload();
      await openSettings(page);
      await expect(page.getByRole("slider", { name: "Graphics quality", exact: true })).toHaveValue(
        "0",
      );
      expect(errors).toEqual([]);
    });
  });
