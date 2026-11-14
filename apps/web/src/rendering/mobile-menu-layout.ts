/** Centre tablet controls; gradually make room beside them on short landscape phones. */
export function mobileMenuLayout(width: number, height: number, result: boolean) {
  const landscape =
    Math.max(0, Math.min(1, (500 - height) / 110)) *
    Math.max(0, Math.min(1, (width / Math.max(1, height) - 1) / 0.5));
  const mix = (stacked: number, beside: number) => stacked + (beside - stacked) * landscape;
  const x = width * 0.24 * landscape;
  const stackedRow = Math.min(height * 0.72, height - 192);
  const row = mix(stackedRow, height * 0.35);
  return {
    title: {
      x: -x,
      y: height * mix(0.25, 0.43),
      width: Math.min(mix(width - 40, width * 0.42), 500),
    },
    label: { x, y: row - 49 },
    count: { x, y: row },
    controls: {
      decrease: { x: x - 76, y: row, width: 52, height: 52 },
      increase: { x: x + 76, y: row, width: 52, height: 52 },
      start: { x, y: mix(stackedRow + 85, height * 0.58), width: 210, height: 54 },
      rematch: { x, y: height * mix(0.55, 0.53), width: 210, height: 54 },
      options: {
        x,
        y: mix(result ? height * 0.55 + 76 : stackedRow + 155, height * 0.77),
        width: 180,
        height: 48,
      },
    },
  };
}
