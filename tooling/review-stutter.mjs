import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const origin = process.argv[2] ?? "http://127.0.0.1:5180",
  directory = "docs/reviews/m09/windows-feedback";
const pressure = process.argv.includes("--pressure"),
  trace = process.argv.includes("--trace");
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  results = [],
  errors = [];
try {
  for (const [level, mobile, tabs] of pressure
    ? [[7, false, 1]]
    : trace
      ? [[7, false, 6]]
      : [
          [7, false, 1],
          [7, false, 6],
          [100, false, 6],
          [100, true, 1],
        ]) {
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : pressure
          ? { width: 1920, height: 1080 }
          : { width: 1280, height: 900 },
      deviceScaleFactor: pressure ? 2 : 1,
      hasTouch: mobile,
      isMobile: mobile,
    });
    // Static extra tabs model open tabs only, not David's unknown Windows workloads.
    for (let i = 1; i < tabs; i++) {
      const tab = await context.newPage();
      await tab.setContent(`<title>Idle review tab ${i}</title><p>Static document ${i}</p>`);
    }
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/__stutter", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/app/styles.css?direct"><div id="review" style="width:100vw;height:100dvh"></div><button id="begin" style="position:fixed;top:100px">Begin</button>',
      }),
    );
    await page.goto(`${origin}/__stutter`);
    const traceSession = trace ? await context.newCDPSession(page) : null;
    if (traceSession)
      await traceSession.send("Tracing.start", {
        categories: "v8,devtools.timeline,disabled-by-default-v8.gc",
        options: "record-continuously",
        transferMode: "ReturnAsStream",
      });
    await page.evaluate(
      async ({ path, inputPath, level, mobile }) => {
        const { installVirtualBrowserControls } = await import(`/@fs${inputPath}`);
        installVirtualBrowserControls();
        const { createStutterReview } = await import(`/@fs${path}`);
        window.stutterReview = createStutterReview(
          document.getElementById("review"),
          level,
          6,
          mobile,
        );
        document.getElementById("begin").onclick = () => {
          window.stutterReview.start();
          document.getElementById("begin").remove();
        };
      },
      {
        path: fileURLToPath(new URL("./stutter-review.ts", import.meta.url)),
        inputPath: fileURLToPath(new URL("../tests/virtual-input.ts", import.meta.url)),
        level,
        mobile,
      },
    );
    if (mobile) await page.tap("#begin");
    else await page.click("#begin");
    const resolutionTimeline = [];
    if (pressure)
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(500);
        resolutionTimeline.push(
          await page.evaluate(() => {
            const report = window.__citadelPerformance(),
              frame = report.recent.at(-1),
              canvas = document.querySelector("canvas");
            return {
              frames: report.totalFrames,
              scale: frame?.resolutionScale ?? 1,
              bufferWidth: canvas.width,
              cssWidth: canvas.clientWidth,
              frameMs: report.intervalMs.p95,
              gpuMs: report.gpuMs.p95,
            };
          }),
        );
      }
    else await page.waitForTimeout(30000);
    const sample = await page.evaluate(() => ({
      summary: window.stutterReview.summary(),
      diagnostics: window.__citadelPerformance(),
    }));
    let traceSummary = null;
    if (traceSession) {
      const complete = new Promise((resolve) =>
        traceSession.once("Tracing.tracingComplete", resolve),
      );
      await traceSession.send("Tracing.end");
      const { stream } = await complete;
      let raw = "";
      while (true) {
        const part = await traceSession.send("IO.read", { handle: stream });
        raw += part.data;
        if (part.eof) break;
      }
      await traceSession.send("IO.close", { handle: stream });
      const events = JSON.parse(raw).traceEvents,
        threads = new Set(
          events
            .filter((e) => e.name === "thread_name" && e.args?.name === "CrRendererMain")
            .map((e) => `${e.pid}:${e.tid}`),
        ),
        main = events.filter(
          (e) => threads.has(`${e.pid}:${e.tid}`) && e.ph === "X" && typeof e.dur === "number",
        ),
        gc = main.filter((e) => /MinorGC|MajorGC|V8.GC/.test(e.name)),
        slow = main.filter((e) => e.dur > 50000).sort((a, b) => b.dur - a.dur);
      traceSummary = {
        mainThreadGcEvents: gc.length,
        longestGcMs: Math.max(0, ...gc.map((e) => e.dur / 1000)),
        slowMainEvents: slow.slice(0, 12).map((e) => ({ name: e.name, durationMs: e.dur / 1000 })),
        note: "Trace instrumentation adds overhead; GC events can nest, so durations are not summed.",
      };
    }
    const { recent: _recent, ...metrics } = sample.diagnostics;
    const tail = _recent
      .slice(-120)
      .map((s) => s.intervalMs)
      .sort((a, b) => a - b);
    metrics.last120FrameP95Ms = tail[Math.floor((tail.length - 1) * 0.95)] ?? null;
    results.push({
      mobile,
      tabs,
      resolutionTimeline,
      traceSummary,
      summary: sample.summary,
      ...metrics,
    });
    await page.screenshot({
      path: `${directory}/${pressure ? "resolution-pressure" : trace ? "trace-level-7-6-tabs" : `${mobile ? "phone" : "desktop"}-level-${level}-${tabs}-tabs`}.png`,
    });
    await page.evaluate(() => window.stutterReview.dispose());
    await context.close();
  }
  await writeFile(
    `${directory}/${pressure ? "resolution" : trace ? "trace" : "performance"}.json`,
    JSON.stringify(
      {
        conditions: pressure
          ? "30s 1920x1080 at DPR2 graphics load; native Chromium on this Mac; real session and audio"
          : "30s per sample; native Chromium on this Mac, five optional static idle tabs; not Windows or physical mobile; ordinary simulation, real audio scheduling and rendering",
        results,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({ results: results.map(({ spikes: _spikes, ...result }) => result), errors }),
  );
} finally {
  await browser.close();
}
