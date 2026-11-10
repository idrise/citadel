import { FIXED_DT } from "../simulation/arena";

/** Drops suspended-tab time rather than replaying an unbounded backlog. */
export function createFixedClock() {
  let accumulator = 0;
  return {
    advance(seconds: number, step: () => void): number {
      accumulator += Math.max(0, Math.min(seconds, 0.1));
      let steps = 0;
      while (accumulator + 1e-10 >= FIXED_DT) {
        step();
        accumulator -= FIXED_DT;
        steps++;
      }
      return steps;
    },
    reset() {
      accumulator = 0;
    },
  };
}
