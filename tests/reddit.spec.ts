import { expect, test } from "./fixtures";

test("the inline launcher requests Reddit expanded mode only after a real Play click", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.assign(window, {
      devvit: {
        context: { username: "local-review" },
        entrypoints: { game: `${location.origin}/reddit-game.html` },
      },
      redditEffects: [] as unknown[],
    });
    window.addEventListener("message", (event) => {
      if (event.data?.type === "devvit-internal" && event.data.immersiveMode)
        (window as unknown as { redditEffects: unknown[] }).redditEffects.push(event.data);
    });
  });
  await page.goto("./reddit.html");
  await page.screenshot({ path: info.outputPath("reddit-launcher.png") });
  expect(
    await page.evaluate(() => (window as unknown as { redditEffects: unknown[] }).redditEffects),
  ).toEqual([]);
  await page.getByRole("button", { name: "Play CITADEL" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { redditEffects: unknown[] }).redditEffects),
    )
    .toEqual([
      expect.objectContaining({
        immersiveMode: expect.objectContaining({
          entryUrl: "http://127.0.0.1:4175/reddit-game.html",
        }),
      }),
    ]);
});

for (const touch of [false, true])
  test.describe(touch ? "Reddit touch" : "Reddit desktop", () => {
    test.use({
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      hasTouch: touch,
      isMobile: touch,
    });
    test("starts, steers and pauses inside a sandbox without pointer lock or fullscreen", async ({
      page,
    }, info) => {
      test.setTimeout(60000);
      await page.clock.install();
      await page.addInitScript((hardware) => {
        localStorage.setItem(
          "citadel.solo.v1",
          JSON.stringify({
            version: 1,
            count: 6,
            humanSeat: 0,
            settings: { effectsQuality: hardware ? "high" : "low", music: false, effectsVolume: 0 },
          }),
        );
        Object.assign(window, { redditNativeCalls: [] as string[] });
        for (const method of ["requestPointerLock", "requestFullscreen"] as const)
          Element.prototype[method] = () => {
            (window as unknown as { redditNativeCalls: string[] }).redditNativeCalls.push(method);
            throw new Error(`${method} is blocked by the Reddit iframe`);
          };
      }, process.env.PLAYWRIGHT_RENDERER === "hardware");
      await page.route("**/__reddit-frame", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: '<style>html,body{margin:0;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:0}</style><iframe title="Reddit game" sandbox="allow-scripts allow-same-origin allow-forms" src="/reddit-game.html"></iframe>',
        }),
      );
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("./__reddit-frame");
      const frame = await (await page.locator("iframe").elementHandle())!.contentFrame();
      if (!frame) throw new Error("Missing Reddit frame");
      await frame.getByRole("button", { name: "Start", exact: true }).waitFor();
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60000));
      await frame.evaluate(() =>
        window.__citadelTestInput.session!.configure({ music: false, effectsVolume: 0 }),
      );
      const start = frame.getByRole("button", { name: "Start", exact: true });
      if (touch) await start.tap();
      else await start.click();
      if (process.env.PLAYWRIGHT_RENDERER === "hardware") {
        const remaining = Number(
          await frame.getByLabel("Introduction remaining", { exact: true }).textContent(),
        );
        await page.clock.runFor(Math.ceil(remaining * 1000) + 350);
        await expect(frame.getByLabel("Round phase", { exact: true })).toHaveText("playing");
      } else {
        // Software CI checks the input/start/pause contract without rendering the
        // whole animated intro; native review also exercises actual playing frames.
        await expect(frame.getByLabel("Round phase", { exact: true })).toHaveText("countdown");
      }
      const before = Number(await frame.getByLabel("Bat angle", { exact: true }).textContent());
      await frame.evaluate((touch) => {
        const input = window.__citadelTestInput;
        if (touch) {
          input.touch("pointerdown", 130, 550);
          input.touch("pointermove", 185, 550);
        } else input.move(innerWidth * 0.8, innerHeight * 0.6);
      }, touch);
      await page.clock.runFor(100);
      expect(Number(await frame.getByLabel("Bat angle", { exact: true }).textContent())).not.toBe(
        before,
      );
      await page.screenshot({ path: info.outputPath("reddit-gameplay.png") });
      if (touch) {
        await frame.evaluate(() => window.__citadelTestInput.touch("pointerup", 185, 550));
        await frame.getByRole("button", { name: "Pause", exact: true }).click();
      } else await frame.evaluate(() => window.__citadelTestInput.key("Escape", true));
      await expect(frame.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
      await expect(frame.getByRole("button", { name: "Save performance report" })).toHaveCount(0);
      expect(await frame.evaluate(() => document.pointerLockElement)).toBeNull();
      expect(
        await frame.evaluate(
          () => (window as unknown as { redditNativeCalls: string[] }).redditNativeCalls,
        ),
      ).toEqual([]);
      expect(errors).toEqual([]);
      await page.screenshot({
        path: info.outputPath(touch ? "reddit-phone.png" : "reddit-desktop.png"),
      });
    });
  });
