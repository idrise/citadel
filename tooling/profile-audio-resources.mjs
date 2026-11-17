import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";
import { summariseAudioResources } from "./audio-resource-summary.ts";

const options = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (!match) throw Error("Use --name=value");
    return [match[1], match[2]];
  }),
);
const comparison = options.comparison ?? "quality",
  change = options.change ?? "balanced",
  channel = options.channel ?? "chromium";
const seconds = options.seconds === undefined ? undefined : Number(options.seconds);
if (
  !["quality", "custom"].includes(comparison) ||
  !["balanced", "drawing", "audio"].includes(change) ||
  !["chromium", "chrome"].includes(channel) ||
  (seconds !== undefined && (!Number.isFinite(seconds) || seconds < 1 || seconds > 600))
)
  throw Error(
    "Use quality/custom; change=balanced/drawing/audio; channel=chromium/chrome; seconds=1–600",
  );
const output = options.output ?? "/tmp/citadel-audio-resources";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const contexts = new Map(),
  nodes = new Map(),
  params = new Map(),
  history = [],
  samples = [],
  errors = [];
const cdp = await page.context().newCDPSession(page);
page.on("pageerror", (error) => errors.push(error.message));
const contextChanged = ({ context }) => {
  contexts.set(context.contextId, context);
  history.push({ atMs: Date.now(), ...context });
};
cdp.on("WebAudio.contextCreated", contextChanged);
cdp.on("WebAudio.contextChanged", contextChanged);
cdp.on("WebAudio.contextWillBeDestroyed", ({ contextId }) => {
  contexts.delete(contextId);
  for (const [id, node] of nodes) if (node.contextId === contextId) nodes.delete(id);
  for (const [id, param] of params) if (param.contextId === contextId) params.delete(id);
});
cdp.on("WebAudio.audioNodeCreated", ({ node }) => nodes.set(node.nodeId, node));
cdp.on("WebAudio.audioNodeWillBeDestroyed", ({ nodeId }) => nodes.delete(nodeId));
cdp.on("WebAudio.audioParamCreated", ({ param }) => params.set(param.paramId, param));
cdp.on("WebAudio.audioParamWillBeDestroyed", ({ paramId }) => params.delete(paramId));
try {
  await page.addInitScript(installVirtualBrowserControls);
  await cdp.send("WebAudio.enable");
  const url = new URL("diagnostics.html", options.url ?? "http://127.0.0.1:4181/");
  if (seconds !== undefined) url.searchParams.set("seconds", String(seconds));
  await page.goto(url.href);
  await page.locator('[name="comparison"]').selectOption(comparison);
  await page.getByText("Controlled comparisons", { exact: true }).click();
  await page.locator('[name="change"]').selectOption(change);
  await page.locator('[name="workload"]').selectOption("play");
  await page.getByRole("button", { name: "Start test", exact: true }).click();
  const started = Date.now(),
    deadline = started + (seconds ?? 60) * 8500 + 60000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(1000);
    for (const context of contexts.values()) {
      if (context.contextType !== "realtime" || context.contextState !== "running") continue;
      try {
        const { realtimeData } = await cdp.send("WebAudio.getRealtimeData", {
          contextId: context.contextId,
        });
        const graph = [...nodes.values()].filter((node) => node.contextId === context.contextId);
        const types = Object.fromEntries(
          [...new Set(graph.map((node) => node.nodeType))].map((type) => [
            type,
            graph.filter((node) => node.nodeType === type).length,
          ]),
        );
        samples.push({
          atMs: Date.now() - started,
          ...context,
          ...realtimeData,
          inspectedNodes: graph.length,
          inspectedParams: [...params.values()].filter(
            (param) => param.contextId === context.contextId,
          ).length,
          nodeTypes: types,
        });
      } catch (error) {
        // A pass can close its context between the snapshot and the protocol request.
        if (!/Cannot find BaseAudioContext|not running|closed|destroyed/i.test(String(error)))
          errors.push(String(error));
      }
    }
    if (await page.locator("#save").isEnabled()) break;
  }
  if (!(await page.locator("#save").isEnabled()))
    throw Error("Comparison did not complete within its wall-time limit");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save test report", exact: true }).click();
  const benchmark = JSON.parse(await readFile(await (await pending).path(), "utf8"));
  const summary = summariseAudioResources(samples);
  const expectedContexts = benchmark.results.filter((pass) => pass.settings.audio).length;
  const validCapture =
    benchmark.complete &&
    summary.length === expectedContexts &&
    benchmark.results.every((pass) => pass.audioAvailable);
  const report = {
    validCapture,
    schema: "citadel.audio-resources",
    version: 1,
    browser: browser.version(),
    comparison,
    change,
    benchmark,
    samples,
    contexts: history,
    summary,
    errors,
    notes: [
      "Audio-thread samples include warm-up; benchmark audio start/end counters delimit the measured window.",
      "Developer inspection adds overhead. Repeat without inspection before attributing a regression.",
      "Chromium renderCapacity is a ratio; displayed percent matches Chromium DevTools (ratio × 100).",
      "One-second samples cannot establish that every native audio deadline was met; compare native underrun counters too.",
      "Inspected node/parameter counts include retained/stopped objects awaiting garbage collection; they are not simultaneous voices or proof of a leak.",
      "Native callback buffer, render quantum and 200 ms music scheduling look-ahead are separate quantities.",
      "No game preferences/progress are changed and nothing is uploaded.",
    ],
  };
  await writeFile(`${output}/report.json.gz`, gzipSync(JSON.stringify(report)));
  await writeFile(
    `${output}/summary.json`,
    JSON.stringify(
      {
        ...report,
        benchmark: {
          ...benchmark,
          results: benchmark.results.map((pass) => ({
            ...pass,
            frames: { ...pass.frames, recent: undefined, spikes: undefined },
          })),
        },
        samples: undefined,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ output, summary: report.summary, errors }, null, 2));
  if (!validCapture || errors.length) process.exitCode = 1;
} finally {
  await cdp.detach().catch(() => {});
  await browser.close();
}
