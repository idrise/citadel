import { saveLevel, choosePlayers, openSettings, play } from "./helpers";
import { expect, test, type Page } from "./fixtures";

test.use({ viewport: { width: 480, height: 360 } });

interface AudioReview {
  contexts: AudioContext[];
  taps: AnalyserNode[];
}
async function outputLevel(page: Page) {
  return page.evaluate(() => {
    const review = (window as unknown as { audioReview: AudioReview }).audioReview;
    let rms = 0;
    for (const tap of review.taps) {
      if (tap.context.state !== "running") continue;
      const data = new Float32Array(tap.fftSize);
      tap.getFloatTimeDomainData(data);
      rms = Math.max(
        rms,
        Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length),
      );
    }
    return rms;
  });
}

test("synthesised music unlocks on Play, becomes audible, pauses, mutes, and closes on restart", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    const review: AudioReview = { contexts: [], taps: [] };
    (window as unknown as { audioReview: AudioReview }).audioReview = review;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options);
        review.contexts.push(this);
      }
    };
    const connect = Object.getOwnPropertyDescriptor(AudioNode.prototype, "connect")!
      .value as typeof AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (
      this: AudioNode,
      destination: AudioNode | AudioParam,
      ...args: number[]
    ) {
      const result = Reflect.apply(connect, this, [destination, ...args]) as AudioNode | undefined;
      if (destination === this.context.destination) {
        const tap = this.context.createAnalyser();
        tap.fftSize = 4096;
        Reflect.apply(connect, this, [tap]);
        review.taps.push(tap);
      }
      return result;
    } as typeof connect;
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  expect(
    await page.evaluate(
      () => (window as unknown as { audioReview: AudioReview }).audioReview.contexts.length,
    ),
  ).toBe(0);
  await play(page);
  await expect(page.getByLabel("Music status", { exact: true })).toHaveText("playing");
  await expect.poll(() => outputLevel(page), { timeout: 10000 }).toBeGreaterThan(0.002);
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Music status", { exact: true })).toHaveText("paused");
  await expect.poll(() => outputLevel(page)).toBeLessThan(0.0001);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByLabel("Music status", { exact: true })).toHaveText("playing");
  await expect.poll(() => outputLevel(page)).toBeGreaterThan(0.002);
  await page.keyboard.press("Escape");
  await openSettings(page);
  await page.getByRole("checkbox", { name: "Music", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Beat lighting", exact: true }).uncheck();
  await page.getByLabel("Music volume", { exact: true }).fill("0.25");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { audioReview: AudioReview }).audioReview.contexts.every(
          (context) => context.state === "closed",
        ),
      ),
    )
    .toBe(true);
  await openSettings(page);
  await expect(page.getByRole("checkbox", { name: "Music", exact: true })).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Beat lighting", exact: true }),
  ).not.toBeChecked();
  await expect(page.getByLabel("Music volume", { exact: true })).toHaveValue("0.25");
  await openSettings(page);
  await play(page);
  await expect(page.getByLabel("Music status", { exact: true })).toHaveText("off");
  await expect.poll(() => outputLevel(page)).toBeLessThan(0.0001);
  expect(errors).toEqual([]);
});

test("unavailable audio leaves captured gameplay playable", async ({ page }) => {
  await page.addInitScript(() => {
    window.AudioContext = class {
      constructor() {
        throw Error("Audio unavailable");
      }
    } as unknown as typeof AudioContext;
  });
  await page.goto("./");
  await play(page);
  await expect(page.getByLabel("Music status", { exact: true })).toHaveText("unavailable");
  await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(true);
  await expect(page.getByLabel("Round phase", { exact: true })).toHaveText("playing", {
    timeout: 10000,
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused", exact: true })).toBeVisible();
});

test("an arriving second ball introduces the second musical layer in the real audio clock", async ({
  page,
}) => {
  test.setTimeout(30000);
  await saveLevel(page, 100, 6);
  await page.goto("./?seed=2026");
  await choosePlayers(page, 6);
  await openSettings(page);
  await openSettings(page);
  await play(page);
  await expect(page.getByLabel("Music layers", { exact: true })).toHaveText("1");
  await expect(page.getByLabel("Balls in play", { exact: true })).toHaveText("2", {
    timeout: 12000,
  });
  await expect(page.getByLabel("Music layers", { exact: true })).toHaveText("2", { timeout: 4000 });
});
