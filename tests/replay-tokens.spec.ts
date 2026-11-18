import { expect, test } from "./fixtures";
import { choosePlayers, configureGame, finishIntroduction, play, selectFortress } from "./helpers";

for (const touch of [false, true])
  test.describe(touch ? "phone replay tokens" : "desktop replay tokens", () => {
    test.use({
      hasTouch: touch,
      isMobile: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    });
    test("renders the saved balance through play, pause, resize and debug without spending tokens", async ({
      page,
    }, info) => {
      test.setTimeout(90000);
      await page.clock.install();
      await page.goto("./?seed=1");
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      for (const count of [2, 4, 6])
        for (const replayTokens of [3, 0]) {
          await page.evaluate(
            ({ count, replayTokens }) => {
              localStorage.setItem(
                "citadel.progress.v1",
                JSON.stringify({
                  version: 5,
                  level: 2,
                  count,
                  replayTokens,
                  best: 1,
                  demotion: null,
                  rounds: 1,
                  recent: [{ level: 2, count, place: count, at: 0 }],
                }),
              );
            },
            { count, replayTokens },
          );
          await page.reload();
          await choosePlayers(page, count);
          await configureGame(page, { music: false, effectsVolume: 0, reducedEffects: false });
          await expect(page.getByLabel("Replay tokens", { exact: true })).toHaveText(
            String(replayTokens),
          );
          if (touch) await page.getByRole("button", { name: "Start", exact: true }).tap();
          else await play(page);
          await finishIntroduction(page);
          await page.clock.runFor(100);
          await page.screenshot({
            path: info.outputPath(count + "-players-" + replayTokens + "-tokens.png"),
          });
          const saved = await page.evaluate(() => localStorage.getItem("citadel.progress.v1"));
          if (touch) await page.getByRole("button", { name: "Pause", exact: true }).tap();
          else await page.keyboard.press("Escape");
          await page.clock.runFor(500);
          await expect(page.getByLabel("Replay tokens", { exact: true })).toHaveText(
            String(replayTokens),
          );
          expect(await page.evaluate(() => localStorage.getItem("citadel.progress.v1"))).toBe(
            saved,
          );
        }
      if (touch) {
        await page.getByRole("button", { name: "Restart", exact: true }).tap();
        await page.setViewportSize({ width: 844, height: 390 });
        await page.clock.runFor(1500);
        await page.screenshot({ path: info.outputPath("landscape-zero-tokens.png") });
      }
      const saved = await page.evaluate(() => localStorage.getItem("citadel.progress.v1"));
      await page.keyboard.press("+");
      await expect(page.getByLabel("Replay tokens", { exact: true })).toHaveText(
        "Debug - progress not saved",
      );
      expect(await page.evaluate(() => localStorage.getItem("citadel.progress.v1"))).toBe(saved);
    });

    test("a real zero-token loss shows DEMOTED, refills three tokens and retries the lower level", async ({
      page,
    }, info) => {
      test.setTimeout(120000);
      const level = touch ? 2 : 21;
      await page.addInitScript((level) => {
        if (!localStorage.getItem("citadel.progress.v1"))
          localStorage.setItem(
            "citadel.progress.v1",
            JSON.stringify({
              version: 5,
              level,
              count: 2,
              replayTokens: 0,
              best: 1,
              demotion: null,
              rounds: 3,
              recent: [0, 1, 2].map((at) => ({ level, count: 2, place: 2, at })),
            }),
          );
      }, level);
      await page.clock.install();
      await page.goto("./?seed=1");
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      await choosePlayers(page, touch ? 2 : 6);
      await selectFortress(page, touch ? 1 : 5);
      await configureGame(page, { music: false, effectsVolume: 0, reducedEffects: false });
      if (touch) await page.getByRole("button", { name: "Start", exact: true }).tap();
      else await play(page);
      await finishIntroduction(page);
      if (touch)
        await page.evaluate(() => {
          window.__citadelTestInput.touch("pointerdown", 100, 650);
          window.__citadelTestInput.touch("pointermove", 370, 650);
          window.__citadelTestInput.touch("pointerup", 370, 650);
        });
      else await page.keyboard.down("KeyD");
      for (let seconds = 0; seconds < 120; seconds++) {
        if (
          (await page.getByLabel("Progress update", { exact: true }).textContent())?.includes(
            "Demoted",
          )
        )
          break;
        await page.clock.runFor(1000);
      }
      if (!touch) await page.keyboard.up("KeyD");
      await expect(page.getByLabel("Progress update", { exact: true })).toContainText(
        `Demoted to level ${level - 1}`,
      );
      await expect(page.getByLabel("Replay tokens", { exact: true })).toHaveText("3");
      if (!touch) {
        await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing");
        await page.clock.runFor(250);
        await page.screenshot({ path: info.outputPath("demoted-early.png") });
      }
      await page.clock.runFor(2000);
      await page.screenshot({ path: info.outputPath("demoted-result.png") });
      await page
        .getByRole("button", { name: new RegExp(`^Retry(?: level ${level - 1})?$`), exact: true })
        .click();
      await expect(page.getByLabel("Round level", { exact: true })).toHaveText(String(level - 1));
      await expect(page.getByLabel("Replay tokens", { exact: true })).toHaveText("3");
      await page.reload();
      await expect(page.getByLabel("Round level", { exact: true })).toHaveText(String(level - 1));
      await expect(page.getByLabel("Replay tokens", { exact: true })).toHaveText("3");
    });
  });
