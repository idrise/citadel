import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (!match) throw Error("Use --key=value");
    return [match[1], match[2]];
  }),
);
const directory = args.output ?? "/tmp/citadel-performance-review";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.addInitScript(installVirtualBrowserControls);
  const url = new URL("diagnostics.html", args.url ?? "http://127.0.0.1:4173/");
  if (args.seconds) url.searchParams.set("seconds", args.seconds);
  await page.goto(url.href);
  await page.locator('[name="comparison"]').selectOption(args.comparison ?? "quality");
  await page.locator('[name="workload"]').selectOption(args.workload ?? "sixteen");
  await page.locator('[name="shape"]').selectOption(args.shape ?? "classic");
  await page.locator('[name="seats"]').selectOption(args.seats ?? "6");
  if (args.reverse === "true") await page.locator('[name="reverse"]').check();
  await page.getByRole("button", { name: "Start test", exact: true }).click();
  await page.waitForTimeout(Number(args.captureAfter ?? 7) * 1000);
  await page.screenshot({ path: `${directory}/running.png`, fullPage: true });
  await page
    .getByRole("button", { name: "Save test report", exact: true })
    .waitFor({ state: "visible" });
  await page.waitForFunction(
    () => !document.querySelector("#save").disabled,
    {},
    { timeout: 700000 },
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save test report", exact: true }).click();
  const report = JSON.parse(await readFile(await (await downloadPromise).path(), "utf8"));
  await writeFile(`${directory}/report.json.gz`, gzipSync(JSON.stringify(report)));
  const summary = {
    ...report,
    results: report.results.map((p) => ({ ...p, frames: { ...p.frames, recent: undefined } })),
    errors,
  };
  await writeFile(`${directory}/summary.json`, JSON.stringify(summary, null, 2) + "\n");
  await page.screenshot({ path: `${directory}/completed.png`, fullPage: true });
  console.log(
    JSON.stringify(
      {
        directory,
        build: report.build,
        complete: report.complete,
        minimumDurationMet: report.minimumDurationMet,
        results: report.results.map((p) => ({
          id: p.id,
          simulationSeconds: p.simulationSeconds,
          wallMs: p.wallMs,
          workload: p.workload,
          frames: p.frames.summary,
          audio: p.audio.end,
        })),
        errors,
      },
      null,
      2,
    ),
  );
  if (!report.complete || errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
