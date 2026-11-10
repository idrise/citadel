/** Explicit match-owned PRNG: replaying the same seed/inputs repeats decisions. */
export function sample(state: { rng: number }): number {
  state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
  return state.rng / 0x100000000;
}
