import { expect, it } from "vite-plus/test";
import { createSneakServeFixture } from "./bot-serve-fixture";
it("waits behind the actual defending bat, then lands a real sneak serve when ordinary human movement exposes the bank", () => {
  const fixture = createSneakServeFixture();
  fixture.advance(0.2);
  expect(fixture.state.balls[0]!.phase).toBe("ready");
  expect(fixture.summary().launches).toHaveLength(0);
  fixture.advance(0.9, true);
  const summary = fixture.summary();
  expect(summary.launches).toHaveLength(1);
  expect(summary.launches[0]!.seat).toBe(1);
  expect(summary.launches[0]!.spin).toBe(0);
  expect(summary.damage.some((hit) => hit.seat === 0)).toBe(true);
  expect(summary.health[0]).toBe(2);
  expect(summary.collisionCaps).toBe(0);
});
