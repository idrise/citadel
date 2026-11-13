export const ARENA = {
  halfSize: 9,
  railRadius: 4.4,
  sectorHalfAngle: Math.PI / 4,
  paddleHalfAngle: 0.24,
  // Sharper physical bow, preserving the original standard bat's end-to-end span.
  batRadius: 1.55,
  batHalfAngle: Math.asin((2.2 * Math.sin(0.48)) / 1.55),
  paddleThickness: 0.28,
  paddleSpeed: 3.2,
  pointerPaddleSpeed: 16,
  pieceRadius: 0.26,
  legacyFormationPieces: 8, // Retained for authored collision fixtures.
  startingPieces: 3,
  ballRadius: 0.187,
} as const;
export const FIXED_DT = 1 / 120;

export const MAX_BALLS = 16;
