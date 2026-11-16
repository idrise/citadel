import "./style.css";
import { BUILD_INFO } from "../app/build-info";
import { downloadJSON } from "../session/download-json";
import { runComparison } from "./runner";
import type { Comparison } from "./protocol";

const form = document.querySelector<HTMLFormElement>("#options")!;
const start = document.querySelector<HTMLButtonElement>("#start")!;
const stop = document.querySelector<HTMLButtonElement>("#stop")!;
const save = document.querySelector<HTMLButtonElement>("#save")!;
const status = document.querySelector<HTMLElement>("#status")!;
const results = document.querySelector<HTMLElement>("#results")!;
const description = document.querySelector<HTMLTextAreaElement>("#description")!;
const arena = document.querySelector<HTMLElement>("#arena")!;
arena.hidden = true;
document.querySelector("#build")!.textContent =
  `Build ${BUILD_INFO.buildId}${BUILD_INFO.dirty ? " · local changes" : ""}`;
const duration = new URLSearchParams(location.search).get("seconds");
if (duration)
  status.textContent = `Short developer run (${duration}s per pass); not a performance baseline.`;
let controller: AbortController | null = null;
let report: Awaited<ReturnType<typeof runComparison>> | null = null;
stop.onclick = () => controller?.abort();
window.addEventListener("pagehide", () => controller?.abort());
form.onsubmit = async (event) => {
  event.preventDefault();
  if (controller) return;
  const fields = new FormData(form);
  const config = {
    comparison: fields.get("comparison"),
    change: fields.get("change"),
    seats: Number(fields.get("seats")),
    shape: fields.get("shape"),
    workload: fields.get("workload"),
    reverse: fields.has("reverse"),
    staticAudio: fields.has("staticAudio"),
  } as Comparison;
  if (config.workload === "morph" && config.seats === 2) {
    status.textContent = "Choose at least three players for an elimination morph.";
    return;
  }
  arena.hidden = false;
  controller = new AbortController();
  report = null;
  results.textContent = "";
  stop.disabled = false;
  save.disabled = true;
  for (const element of form.elements)
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLButtonElement
    )
      element.disabled = true;
  try {
    report = await runComparison(
      arena,
      config,
      controller.signal,
      (text) => {
        status.textContent = text;
      },
      duration === null ? undefined : Number(duration),
    );
    status.textContent = report.complete
      ? "Test finished. Save the report and include what you heard or saw."
      : "Test stopped before completion. The partial report is available.";
    results.textContent = report.results
      .map((pass) => {
        const audio = pass.audio.end;
        const p95 = pass.frames.intervalMs.p95;
        return (
          `${pass.id} — ${pass.complete ? "finished" : "incomplete"}\n` +
          `${pass.simulationSeconds.toFixed(1)}s simulated · ${(pass.wallMs / 1000).toFixed(1)}s elapsed · ${pass.workload.minBalls ?? "?"}–${pass.workload.maxBalls} balls\n` +
          `Frame gap p95: ${p95 === null ? "unavailable" : p95.toFixed(1) + " ms"}\n` +
          `Late music steps: ${audio?.schedule?.late ?? "unavailable"} · Output underruns: ${audio?.playback?.underrunEvents ?? "unavailable"}`
        );
      })
      .join("\n\n");
    save.disabled = false;
  } catch (error) {
    status.textContent = `Test could not finish: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    arena.hidden = true;
    controller = null;
    stop.disabled = true;
    for (const element of form.elements)
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLButtonElement
      )
        element.disabled = false;
    start.focus();
  }
};
save.onclick = () => {
  if (report)
    downloadJSON(
      { ...report, description: description.value.slice(0, 2000) },
      `citadel-test-${BUILD_INFO.buildId}.json`,
    );
};
