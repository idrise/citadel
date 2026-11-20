import { expect, test } from "./fixtures";
import { configureGame, finishIntroduction, openGame, selectFortress } from "./helpers";

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

test("touch serving blocks iOS selection and callouts while Settings stays usable", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  // Native Home Screen menus still require a physical-device retest.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openGame(page);
  await configureGame(page, { music: false, effectsVolume: 0 });
  const canvas = page.getByRole("application", { name: "Citadel arena" });
  await expect(canvas).toHaveCSS("touch-action", "none");
  await expect(canvas).toHaveCSS("user-select", "none");
  // Chromium does not implement this WebKit-only property.
  const callout = await canvas.evaluate((element) => {
    const styles = getComputedStyle(element);
    return CSS.supports("-webkit-touch-callout", "none")
      ? styles.getPropertyValue("-webkit-touch-callout")
      : null;
  });
  if (callout !== null) expect(callout).toBe("none");
  const owner = await page.getByLabel("Ball 0 owner", { exact: true }).textContent();
  await selectFortress(page, ["Coral", "Amber", "Violet", "Rose"].indexOf(owner!));
  const start = page.getByRole("button", { name: "Start", exact: true });
  await expect(start).toHaveCSS("user-select", "none");
  await start.tap();
  await finishIntroduction(page);
  await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("ready");

  // Safari delivers Touch Events as well as Pointer Events. Check their cancellation
  // in the actual browser without invoking any native menus or system input.
  const prevented = await page.evaluate(() => {
    const canvas = document.querySelector("canvas")!;
    const input = window.__citadelTestInput;
    input.touch("pointerdown", 120, 650);
    const results = ["touchstart", "contextmenu", "selectstart"].map(
      (type) => !canvas.dispatchEvent(new Event(type, { bubbles: true, cancelable: true })),
    );
    input.touch("pointerup", 120, 650);
    return results;
  });
  expect(prevented).toEqual([true, true, true]);
  await page.clock.runFor(100);
  await expect(page.getByLabel("Ball 0 phase", { exact: true })).toHaveText("active");
  await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeHidden();
  const angle = Number(await page.getByLabel("Bat angle", { exact: true }).textContent());
  await page.evaluate(() => {
    const input = window.__citadelTestInput;
    input.touch("pointerdown", 120, 650);
    document.querySelector("canvas")!.dispatchEvent(new Event("touchstart", { cancelable: true }));
    input.touch("pointermove", 180, 650);
    input.touch("pointerup", 180, 650);
  });
  await page.clock.runFor(100);
  expect(Number(await page.getByLabel("Bat angle", { exact: true }).textContent())).toBeGreaterThan(
    angle,
  );
  await page.screenshot({ path: info.outputPath("ios-touch-playing.png") });
  await page.getByRole("button", { name: "Pause", exact: true }).tap();
  await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeVisible();
  const resume = page.getByRole("button", { name: "Resume", exact: true });
  expect(
    await resume.evaluate((element) =>
      element.dispatchEvent(new Event("touchstart", { bubbles: true, cancelable: true })),
    ),
  ).toBe(true);
  const slider = page.getByRole("slider", { name: "Sound effects volume", exact: true });
  expect(
    await slider.evaluate((element) =>
      element.dispatchEvent(new Event("touchstart", { bubbles: true, cancelable: true })),
    ),
  ).toBe(true);
  await slider.fill("0.4");
  await expect(slider).toHaveValue("0.4");
  await resume.tap();
  await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeHidden();
  expect(errors).toEqual([]);
});
