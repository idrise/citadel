import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { installVirtualBrowserControls } from "../tests/virtual-input.ts";
const origin = process.argv[2] ?? "http://127.0.0.1:5190";
const directory = "/private/tmp/citadel-teaser-look";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
try {
  const live = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });
  await live.addInitScript(installVirtualBrowserControls);
  await live.addInitScript(() => {
    localStorage.setItem(
      "citadel.progress.v1",
      JSON.stringify({
        version: 2,
        level: 3,
        count: 4,
        best: 2,
        rounds: 1,
        losses: 0,
        demotion: null,
        recent: [{ level: 2, count: 2, place: 1, at: Date.now() }],
      }),
    );
  });
  await live.goto(`${origin}/?seed=2026`);
  await live.getByRole("button", { name: "Start", exact: true }).waitFor();
  await live.waitForTimeout(3000);
  await live.screenshot({ path: `${directory}/running-game.png` });
  const capture = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });
  await capture.addInitScript(installVirtualBrowserControls);
  await capture.route("**/__compare-teaser", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<link rel="stylesheet" href="/src/app/styles.css?direct"><div id="stage" style="position:relative;width:1280px;height:720px"></div>',
    }),
  );
  await capture.goto(`${origin}/__compare-teaser`);
  const environment = await capture.evaluate(
    async (path) => {
      await import("/@vite/env");
      const { createTeaserScene } = await import(`/@fs${path}`);
      window.lookScene = createTeaserScene(document.getElementById("stage"), "title");
      for (let index = 0; index < 180; index++) window.lookScene.frame(index, 424);
      return window.lookScene.view.environment();
    },
    fileURLToPath(new URL("./teaser-scene.ts", import.meta.url)),
  );
  await capture.screenshot({ path: `${directory}/capture-renderer.png` });
  console.log(JSON.stringify(environment));
} finally {
  await browser.close();
}
