import { expect, it } from "vite-plus/test";
import { mobileMenuLayout } from "./mobile-menu-layout";

it("changes compact title placement continuously around width, height and orientation thresholds", () => {
  for (const [width, height] of [
    [699, 600],
    [700, 600],
    [699, 700],
    [700, 699],
    [844, 499],
    [844, 500],
    [844, 390],
  ]) {
    const original = mobileMenuLayout(width!, height!, false);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ]) {
      const resized = mobileMenuLayout(width! + dx!, height! + dy!, false);
      for (const key of ["start", "options", "decrease", "increase"] as const) {
        expect(Math.abs(resized.controls[key].x - original.controls[key].x)).toBeLessThan(3);
        expect(Math.abs(resized.controls[key].y - original.controls[key].y)).toBeLessThan(3);
      }
    }
  }
});

it("keeps title and result buttons inside short landscape screens throughout reflow", () => {
  for (const width of [600, 667, 844, 1024])
    for (let height = 320; height <= 600; height += 10)
      for (const result of [false, true]) {
        const layout = mobileMenuLayout(width, height, result);
        for (const button of Object.values(layout.controls)) {
          expect(width / 2 + button.x - button.width / 2).toBeGreaterThanOrEqual(12);
          expect(width / 2 + button.x + button.width / 2).toBeLessThanOrEqual(width - 12);
          expect(button.y - button.height / 2).toBeGreaterThanOrEqual(12);
          expect(button.y + button.height / 2).toBeLessThanOrEqual(height - 12);
        }
      }
});
