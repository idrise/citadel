/** One centred bottom stack, independent of width, orientation, touch mode or arena camera. */
export function mobileMenuLayout(width: number, height: number, result: boolean) {
  const density = Math.max(0.92, Math.min(1, height / 600));
  const bottom = height - 18;
  const row = bottom - 152 * density;
  const labelY = row - 43 * density;
  return {
    title: {
      x: 0,
      y: Math.min(height * 0.46, result ? bottom - 87 * density - 110 : labelY - 44),
      width: Math.min(width - 40, 500, height * 0.65),
    },
    label: { x: 0, y: labelY },
    count: { x: 0, y: row },
    controls: {
      decrease: { x: -76, y: row, width: 52, height: 52 * density },
      increase: { x: 76, y: row, width: 52, height: 52 * density },
      start: { x: 0, y: bottom - 87 * density, width: 210, height: 54 * density },
      rematch: { x: 0, y: bottom - 87 * density, width: 210, height: 54 * density },
      options: {
        x: 0,
        y: bottom - 24 * density,
        width: 180,
        height: 48 * density,
      },
    },
  };
}
