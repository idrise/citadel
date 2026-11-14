import { expect, test } from "./fixtures";

for (const touch of [false, true]) {
  test.describe(touch ? "phone default roster" : "desktop default roster", () => {
    test.use({
      hasTouch: touch,
      isMobile: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    });
    test("opens with six players and remembers an adjusted count on reload", async ({
      page,
    }, testInfo) => {
      await page.clock.install();
      await page.goto("./");
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      await expect(page.getByLabel("Player count", { exact: true })).toHaveText("6");
      await expect(page.getByLabel("Arena players", { exact: true })).toHaveText("6");
      await page.screenshot({
        path: testInfo.outputPath(touch ? "phone-default-six.png" : "desktop-default-six.png"),
      });
      const more = page.getByRole("button", { name: "Increase players", exact: true });
      if (touch) await more.tap();
      else await more.click();
      await expect(page.getByLabel("Player count", { exact: true })).toHaveText("7");
      await page.reload();
      await expect(page.getByLabel("Player count", { exact: true })).toHaveText("7");
      await expect(page.getByLabel("Arena players", { exact: true })).toHaveText("7");
      const fewer = page.getByRole("button", { name: "Decrease players", exact: true });
      if (touch) await fewer.tap();
      else await fewer.click();
      await expect(page.getByLabel("Player count", { exact: true })).toHaveText("6");
    });
  });
}

test("retains an existing sixteen-player choice, seat and settings", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("citadel.solo.v1"))
      localStorage.setItem(
        "citadel.solo.v1",
        JSON.stringify({
          version: 1,
          count: 16,
          humanSeat: 15,
          settings: { musicVolume: 0.23, effectsVolume: 0.61 },
        }),
      );
  });
  await page.goto("./");
  await expect(page.getByLabel("Player count", { exact: true })).toHaveText("16");
  await expect(page.getByLabel("Arena players", { exact: true })).toHaveText("16");
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("citadel.solo.v1")!)))
    .toMatchObject({
      count: 16,
      humanSeat: 15,
      settings: { musicVolume: 0.23, effectsVolume: 0.61 },
    });
});
