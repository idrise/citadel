/** Pixel-space placement for the procedural menu on compact screens. */
export function mobileMenuLayout(width: number, height: number, result: boolean) {
  const landscape = width > height;
  const x = landscape ? width * 0.24 : 0;
  const row = landscape ? height * 0.35 : height * 0.46;
  return {
    title: {
      x: landscape ? -width * 0.24 : 0,
      y: height * (landscape ? 0.43 : 0.25),
      width: Math.min(landscape ? width * 0.42 : width - 40, 500),
    },
    label: { x, y: row - 49 },
    count: { x, y: row },
    controls: {
      decrease: { x: x - 76, y: row, width: 52, height: 52 },
      increase: { x: x + 76, y: row, width: 52, height: 52 },
      start: { x, y: landscape ? height * 0.58 : row + 85, width: 210, height: 54 },
      rematch: { x, y: landscape ? height * 0.53 : height * 0.55, width: 210, height: 54 },
      options: {
        x,
        y: landscape ? height * 0.77 : result ? height * 0.55 + 76 : row + 155,
        width: 180,
        height: 48,
      },
    },
  };
}
