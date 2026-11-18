import { expect, it } from "vite-plus/test";
import { createScenario } from "./scenario";
import { alive } from "../simulation/types";
// The full 30 simulated seconds are a correctness check, not a wall-clock benchmark.
it(
  "sustains sixteen balls through multiple fixture resets, with identical seeded ticks",
  { timeout: 30_000 },
  () => {
    const first = createScenario({ seats: 3, shape: "rounded", workload: "sixteen" });
    const second = createScenario({ seats: 3, shape: "rounded", workload: "sixteen" });
    for (let i = 0; i < 3600; i++) {
      first.step();
      second.step();
      expect(first.state.stats.collisionCaps).toBe(0);
      if (first.state.balls.length !== 16) throw new Error(`Lost fixture balls at ${i}`);
    }
    expect(first.state).toEqual(second.state);
    expect(first.simulatedSeconds()).toBe(30);
    expect(first.cycles).toBe(2);
    expect(first.state.arena.variant).toBe("rounded");
    expect(first.state.players.every(alive)).toBe(true);
  },
);
it.each([2, 6] as const)(
  "separates dense sixteen-ball launch queues in %i seats without collision caps",
  (seats) => {
    const fixture = createScenario({ seats, shape: "classic", workload: "sixteen" });
    for (let tick = 0; tick < 480; tick++) {
      fixture.step();
      expect(fixture.state.stats.collisionCaps).toBe(0);
      expect(fixture.state.balls).toHaveLength(16);
    }
  },
);
it.each([2, 3, 4, 6] as const)(
  "runs %i-seat fixtures without changing the requested roster",
  (seats) => {
    const fixture = createScenario({ seats, shape: "classic", workload: "play" });
    for (let i = 0; i < 240; i++) fixture.step();
    expect(fixture.state.players).toHaveLength(seats);
    expect(fixture.state.balls).toHaveLength(4);
  },
);
it("triggers the authored morph and then resets the original shape and roster", () => {
  const fixture = createScenario({ seats: 4, shape: "rounded", workload: "morph" });
  for (let i = 0; i < 1441; i++) fixture.step();
  expect(fixture.state.players.filter(alive)).toHaveLength(3);
  expect(fixture.state.morph?.to.count).toBe(3);
  for (let i = 0; i < 1440; i++) fixture.step();
  expect(fixture.cycles).toBe(2);
  expect(fixture.state.players.filter(alive)).toHaveLength(4);
  expect(fixture.state.arena.variant).toBe("rounded");
});
