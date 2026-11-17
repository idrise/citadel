import { levelFeatures, type LevelDefinition } from "./levels";

/** Frozen for a whole attempt; promotion/demotion only changes the following round. */
export type RoundDifficulty = LevelDefinition;
export const levelDifficulty = levelFeatures;
