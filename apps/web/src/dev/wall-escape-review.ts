import { createViewport } from "../rendering/viewport";
import { ARENA, FIXED_DT } from "../simulation/arena";
import { advanceBalls } from "../simulation/balls";
import { createMatch } from "../simulation/match";
import { resolveLevel } from "../simulation/levels";
import { DEFAULT_OPTIONS } from "../simulation/types";

function fixture(id: "before" | "after") {
  const container = document.getElementById(id)!,
    status = document.getElementById(`${id}-status`)!;
  let state = initial();
  function initial() {
    const next = createMatch(7, 4, 3, 7, {
      ...resolveLevel(1),
      arenaShape: "rounded",
      playerCount: 4,
    });
    next.phase = "playing";
    Object.assign(next.balls[0]!, {
      phase: "active",
      position: { x: 0, y: 0 },
      velocity: { x: 24, y: 0 },
      spin: 0,
    });
    return next;
  }
  const view = createViewport(container, 0, state.arena);
  let firstContact: number | null = null;
  const walls: { time: number; spin: number }[] = [];
  function step() {
    if (firstContact !== null) return;
    const ball = state.balls[0]!;
    // Reproduce the old response only in this labelled comparison fixture.
    if (id === "before") ball.wallBounces = 0;
    state.events = [];
    state.elapsed += FIXED_DT;
    state.tick++;
    advanceBalls(
      state,
      state.balls,
      state.players.map((player) => player.angle),
      FIXED_DT,
      DEFAULT_OPTIONS,
      state.players.map((player) => player.pieces.map((body) => body.position)),
    );
    for (const event of state.events) {
      if (event.type === "wall") walls.push({ time: state.elapsed, spin: event.impact!.spin });
      if (event.type === "paddle" || event.type === "damage") firstContact = state.elapsed;
    }
  }
  function render(dt: number) {
    view.render(state, dt, {
      humanSeat: 0,
      reducedEffects: false,
      preview: false,
      slowdown: false,
      quality: "high",
    });
    status.textContent = `${walls.length} wall bounces · ${firstContact === null ? "No defence contact" : `Defence reached at ${firstContact.toFixed(2)}s`}`;
  }
  return {
    step,
    render,
    reset() {
      state = initial();
      walls.length = 0;
      firstContact = null;
    },
    summary: () => ({
      firstContact,
      walls: [...walls],
      collisionCaps: state.stats.collisionCaps,
      ballRadius: ARENA.ballRadius,
    }),
    dispose: () => view.dispose(),
  };
}

const before = fixture("before"),
  after = fixture("after"),
  scrub = document.getElementById("time") as HTMLInputElement,
  play = document.getElementById("play") as HTMLButtonElement,
  elapsed = document.getElementById("elapsed")!;
let time = 0,
  accumulator = 0,
  running = true,
  previous = performance.now(),
  frameId = 0;
function render(dt: number) {
  before.render(dt);
  after.render(dt);
  scrub.value = String(time);
  elapsed.textContent = `${time.toFixed(1)}s`;
}
function seek(seconds: number) {
  before.reset();
  after.reset();
  time = 0;
  accumulator = 0;
  while (time + FIXED_DT <= seconds + 1e-8) {
    before.step();
    after.step();
    time += FIXED_DT;
  }
  render(1 / 60);
}
play.onclick = () => {
  if (time >= 20) seek(0);
  running = !running;
  play.textContent = running ? "Pause" : "Play";
};
scrub.oninput = () => {
  running = false;
  play.textContent = "Play";
  seek(Number(scrub.value));
};
function animate(now: number) {
  const dt = Math.min(0.1, (now - previous) / 1000);
  previous = now;
  if (running && time < 20) {
    accumulator += dt;
    while (accumulator >= FIXED_DT) {
      before.step();
      after.step();
      time += FIXED_DT;
      accumulator -= FIXED_DT;
    }
  }
  render(dt);
  frameId = requestAnimationFrame(animate);
}
Object.assign(window, {
  wallEscapeReview: {
    seek(seconds: number) {
      running = false;
      play.textContent = "Play";
      seek(seconds);
    },
    summary: () => ({ before: before.summary(), after: after.summary() }),
  },
});
frameId = requestAnimationFrame(animate);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(frameId);
    before.dispose();
    after.dispose();
  });
