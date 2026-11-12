import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const directory = process.argv[2] ?? "/tmp/citadel-title-preview",
  origin = process.argv[3] ?? "http://127.0.0.1:4174";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" }),
  errors = [],
  positions = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(`${origin}/?seed=2026`);
  await page.getByRole("button", { name: "Start", exact: true }).waitFor();
  await page.evaluate(() => {
    document.querySelector("canvas").dataset.reviewIdentity = "persistent";
    document.querySelector(".scene-controls").dataset.reviewIdentity = "persistent";
  });
  const controls = async () =>
    Promise.all(
      ["Start", "Decrease players", "Increase players", "Settings"].map((name) =>
        page.getByRole("button", { name, exact: true }).boundingBox(),
      ),
    );
  const initial = await controls();
  await page.evaluate(() => {
    const recorder = new MediaRecorder(document.querySelector("canvas").captureStream(30), {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 2500000,
    });
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();
    window.titleRecording = { recorder, chunks };
  });
  const choose = async (target) => {
    const current = Number(await page.getByLabel("Player count", { exact: true }).textContent());
    const action = current < target ? "Increase players" : "Decrease players";
    for (let i = 0; i < Math.abs(target - current); i++)
      await page.getByRole("button", { name: action, exact: true }).click();
  };
  for (const count of [2, 4, 6]) {
    await choose(count);
    await page.waitForTimeout(330);
    await page.screenshot({ path: `${directory}/title-${count}-moving.png` });
    assert.deepEqual(await controls(), initial);
    await page.waitForTimeout(650);
    await page.screenshot({ path: `${directory}/title-${count}.png` });
    assert.deepEqual(await controls(), initial);
    assert.equal(await page.locator("canvas").getAttribute("data-review-identity"), "persistent");
    assert.equal(
      await page.locator(".scene-controls").getAttribute("data-review-identity"),
      "persistent",
    );
    positions.push({ count, bounds: await controls() });
  }
  const video = await page.evaluate(async () => {
    const { recorder, chunks } = window.titleRecording;
    await new Promise((resolve) => {
      recorder.onstop = resolve;
      recorder.stop();
    });
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 16384)
      binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    return btoa(binary);
  });
  await writeFile(`${directory}/title-transition.webm`, Buffer.from(video, "base64"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const mobile = await controls();
  await choose(2);
  await page.waitForTimeout(330);
  await page.screenshot({ path: `${directory}/mobile-moving.png` });
  assert.deepEqual(await controls(), mobile);
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${directory}/mobile-title.png` });
  assert.deepEqual(await controls(), mobile);
  // Ordinary attempts use fresh pickup entropy; these are real, unedited games.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.clock.install();
  await page.goto(origin);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await choose(6);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator(".settings-menu summary").click();
  await page.getByRole("checkbox", { name: "Music", exact: true }).uncheck();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  const attempts = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.clock.runFor(6100);
    await page.screenshot({ path: `${directory}/pickup-attempt-${attempt}.png` });
    await page.keyboard.press("Escape");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export round", exact: true }).click();
    const report = JSON.parse(await readFile(await (await download).path(), "utf8"));
    assert.equal(report.supplies.length, 1);
    attempts.push({
      seed: report.seed,
      supplySeed: report.supplySeed,
      position: report.supplies[0].position,
    });
    if (attempt === 1) await page.getByRole("button", { name: "Restart", exact: true }).click();
  }
  assert.equal(attempts[0].seed, attempts[1].seed);
  assert.notEqual(attempts[0].supplySeed, attempts[1].supplySeed);
  assert.notDeepEqual(attempts[0].position, attempts[1].position);
  assert.deepEqual(errors, []);
  await writeFile(
    `${directory}/title-report.json`,
    JSON.stringify(
      {
        kind: "Real production title controls, native GPU; persistent canvas and exact fixed UI bounds",
        positions,
        attempts,
        mobile: { width: 390, height: 844, bounds: mobile },
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ directory, errors }));
} finally {
  await browser.close();
}
