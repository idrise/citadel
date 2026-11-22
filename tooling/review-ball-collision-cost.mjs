import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";

// Serve two production builds. This uses the existing diagnostic fixture, never
// modifies a live match, and keeps all browser input inside the page.
const before = process.argv[2] ?? "http://127.0.0.1:5180/";
const after = process.argv[3] ?? "http://127.0.0.1:5179/";
const directory = process.argv[4] ?? "artifacts/reviews/m09/replay-tokens-collisions";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const devices = {
  desktop: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  },
  tablet: {
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  },
};
const summaries = [];
try {
  for (const [device, profile] of Object.entries(devices))
    for (const label of device === "phone" ? ["after", "before"] : ["before", "after"]) {
      const context = await browser.newContext(profile);
      try {
        const page = await context.newPage(),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.addInitScript(installVirtualBrowserControls);
        const url = new URL("diagnostics.html", label === "before" ? before : after);
        url.searchParams.set("seconds", "10");
        await page.goto(url.href);
        await page.locator('[name="comparison"]').selectOption("soak");
        await page.locator('[name="workload"]').selectOption("sixteen");
        await page.locator('[name="seats"]').selectOption("6");
        await page.getByRole("button", { name: "Start test", exact: true }).click();
        await page.waitForFunction(
          () => !document.querySelector("#save").disabled,
          {},
          { timeout: 90000 },
        );
        const download = page.waitForEvent("download");
        await page.getByRole("button", { name: "Save test report", exact: true }).click();
        const report = JSON.parse(await readFile(await (await download).path(), "utf8"));
        assert.equal(report.complete, true);
        assert.equal(report.minimumDurationMet, false); // Explicit shortened developer sample.
        assert.deepEqual(errors, []);
        assert.equal(report.results[0].workload.minBalls, 16);
        assert.equal(report.results[0].workload.maxBalls, 16);
        await writeFile(
          directory + "/" + device + "-" + label + ".json.gz",
          gzipSync(JSON.stringify(report)),
        );
        const summary = {
          device,
          label,
          profile,
          errors,
          ...report,
          results: report.results.map((p) => ({
            ...p,
            finalState: undefined,
            frames: { ...p.frames, recent: undefined },
          })),
        };
        summaries.push(summary);
        console.log(
          JSON.stringify({
            device,
            label,
            complete: report.complete,
            frames: report.results[0].frames.summary,
            workload: report.results[0].workload,
          }),
        );
      } finally {
        await context.close();
      }
    }
  await writeFile(
    directory + "/performance.json",
    JSON.stringify(
      {
        note: "One 10-second developer sample per build/view; emulation uses this Mac's GPU, not physical mobile hardware.",
        summaries,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
