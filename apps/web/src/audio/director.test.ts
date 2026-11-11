import { expect, it } from "vite-plus/test";
import { createMusicDirector, type MusicFrame } from "./director";
import type { GameEvent } from "../simulation/types";
import { createMatch, stepMatch } from "../simulation/match";
import { musicLight } from "../rendering/music-light";
const frame: MusicFrame = { elapsed: 0, balls: 1, alive: [true, true, true, true] };
const event = (id: number, type: GameEvent["type"] = "paddle", seat = 0): GameEvent => ({
  id,
  tick: id,
  type,
  seat,
  piece: null,
  position: { x: 0, y: 0 },
});

it("turns each hit into an immediate note and a seven-note phrase with its own loop length", () => {
  const director = createMusicDirector(0, 2026);
  const events = Array.from({ length: 7 }, (_, id) => event(id));
  expect(director.observe(frame, events).filter((c) => c.voice === "hit")).toHaveLength(7);
  expect(director.snapshot()).toMatchObject({ streak: 7, notes: 7 });
  const notes = Array.from(
    { length: 9 },
    (_, index) => director.step(64 + index * 2).find((c) => c.voice === "player")!.note,
  );
  expect(notes[7]).toBe(notes[0]);
  expect(notes[8]).toBe(notes[1]);
  expect(director.observe(frame, events)).toEqual([]);
  expect(director.snapshot().streak).toBe(7);
});
it("resets only the damaged seat and leaves the beat running", () => {
  const director = createMusicDirector(0, 1);
  director.observe(frame, [event(0), event(1), event(2, "paddle", 1)]);
  director.observe(frame, [event(3, "damage", 1)]);
  expect(director.snapshot().notes).toBe(2);
  expect(director.observe(frame, [event(4, "damage")])).toMatchObject([
    { voice: "damage" },
    { voice: "cheer" },
  ]);
  expect(director.snapshot()).toMatchObject({ streak: 0, notes: 0 });
  expect(director.step(64).some((c) => c.voice === "kick")).toBe(true);
});
it("bounds phrases, foregrounds human hits, and composes repeatably without touching events", () => {
  const a = createMusicDirector(0, 2026),
    b = createMusicDirector(0, 2026);
  const events = Array.from({ length: 100 }, (_, id) => event(id));
  const before = structuredClone(events);
  const cues = a.observe(frame, events);
  expect(cues).toEqual(b.observe(frame, events));
  expect(events).toEqual(before);
  expect(a.snapshot().notes).toBe(16);
  expect(a.step(10)).toEqual(b.step(10));
  expect(a.observe(frame, [event(101, "paddle", 1)])[0]!.velocity).toBeLessThan(cues[0]!.velocity);
});
it("builds and drops on the musical clock even without a long player streak", () => {
  const director = createMusicDirector(0, 2026);
  expect(director.step(0).some((c) => c.voice === "bass")).toBe(false);
  expect(director.step(192).some((c) => c.voice === "hat")).toBe(true);
  expect(director.snapshot().section).toBe("build");
  expect(director.step(252).map((c) => c.voice)).toEqual(["breath"]);
  for (let step = 253; step < 256; step++) expect(director.step(step)).toEqual([]);
  expect(director.step(256).some((c) => c.voice === "kick")).toBe(true);
  expect(director.step(259).some((c) => c.voice === "bass")).toBe(true);
  expect(director.snapshot().section).toBe("drop");
});
it("uses global pressure independently and follows a survivor after human elimination", () => {
  const director = createMusicDirector(0, 1);
  director.observe({ ...frame, elapsed: 60, balls: 4 }, []);
  expect(director.step(67).some((c) => c.voice === "bass")).toBe(true);
  director.observe({ ...frame, alive: [false, true, true, true] }, [event(0, "paddle", 2)]);
  expect(director.snapshot()).toMatchObject({ seat: 2, notes: 1 });
});
it("leaves the authoritative match exactly identical while music and beat lights react", () => {
  let audible = createMatch(2026),
    silent = createMatch(2026);
  const director = createMusicDirector(0, 2026);
  for (let tick = 0; tick < 2400; tick++) {
    audible = stepMatch(audible);
    silent = stepMatch(silent);
    director.observe(
      {
        elapsed: audible.elapsed,
        balls: audible.balls.length,
        alive: audible.players.map((p) => p.health.some(Boolean)),
      },
      audible.events,
    );
    director.step(tick);
    musicLight(Math.sin(tick), false);
  }
  expect(audible).toEqual(silent);
});

it("introduces ball layers on a bar boundary and emits a musical arrival cue", () => {
  const director = createMusicDirector(0, 2026);
  director.step(64);
  expect(director.snapshot().layers).toBe(1);
  expect(
    director
      .observe({ ...frame, balls: 3 }, [event(0, "arrival")])
      .some((c) => c.voice === "unlock"),
  ).toBe(true);
  expect(director.step(66).some((c) => c.voice === "acid")).toBe(false);
  expect(director.snapshot().layers).toBe(1);
  director.step(80);
  expect(director.snapshot().layers).toBe(3);
  expect(director.step(81).some((c) => c.voice === "acid")).toBe(true);
});

it.each([4, 5])(
  "keeps a separate human phrase at expanded seat %s and follows a living survivor",
  (seat) => {
    const director = createMusicDirector(seat, 2026);
    const expanded = { elapsed: 12, balls: 2, alive: Array<boolean>(6).fill(true) };
    expect(director.observe(expanded, [event(0, "paddle", seat)])[0]!.voice).toBe("hit");
    expect(director.snapshot()).toMatchObject({ seat, notes: 1, streak: 1 });
    expanded.alive[seat] = false;
    director.observe(expanded, [event(1, "damage", seat), event(2, "paddle", 3)]);
    expect(director.snapshot()).toMatchObject({ seat: 3, notes: 1 });
    expect(() => director.step(80)).not.toThrow();
  },
);
