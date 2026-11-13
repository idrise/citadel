import { levelDifficulty } from "../simulation/difficulty";
import { botLevelProfile } from "../simulation/bot-level";

/** Describe the challenge, including on retries or when progression skips levels. */
export function levelHighlights(requested: number, previousLevel = requested - 1): string[] {
  const current = levelDifficulty(requested),
    previous = levelDifficulty(previousLevel);
  if (current.level === 1) return ["ONE BALL - WIDE BAT"];
  if (current.level === previous.level) return [];
  const messages: string[] = [];
  if (current.maxBalls > previous.maxBalls) messages.push("EXTRA BALL");
  if (current.maxBalls < previous.maxBalls) messages.push("FEWER BALLS");
  if (current.pickupCount < previous.pickupCount) messages.push("FEWER PICKUPS");
  if (current.pickupCount > previous.pickupCount)
    messages.push(previous.pickupCount === 0 ? "PICKUPS INTRODUCED" : "MORE PICKUPS");
  if (current.arenaShape !== previous.arenaShape)
    messages.push(`${current.arenaShape.toUpperCase()} ARENA`);
  if (current.level === 100 && previous.level < 100) messages.push("ELITE BOTS");
  else {
    // Call out cumulative changes that are large enough to notice, rather than tiny per-level steps.
    const widthBand = (scale: number) => Math.floor((1.35 - scale + 1e-8) / 0.1);
    if (widthBand(current.batScale) > widthBand(previous.batScale)) messages.push("SMALLER BAT");
    if (widthBand(current.batScale) < widthBand(previous.batScale)) messages.push("WIDER BAT");
    const reactionBand = (level: number) =>
      Math.floor((0.65 - botLevelProfile(level).reaction + 1e-8) / 0.13);
    if (reactionBand(current.level) > reactionBand(previous.level)) messages.push("QUICKER BOTS");
    if (reactionBand(current.level) < reactionBand(previous.level)) messages.push("SLOWER BOTS");
  }
  return messages.length
    ? messages.slice(0, 2)
    : [current.ballSpeed > previous.ballSpeed ? "SPEED UP" : "SLOWER BALLS"];
}

export function lossMessage(level: number, lossLevel = level): string {
  if (level <= 1) return "LEVEL 01 IS THE FLOOR";
  const dropping = lossLevel < level;
  return `${dropping ? "LOSS DROPS TO" : "LOSS RETRIES"} LEVEL ${String(dropping ? lossLevel : level).padStart(2, "0")}`;
}

/** Shared unwrapped copy: layout may wrap lines, but reading time counts each word once. */
export function levelBriefingLines(
  level: number,
  lossLevel = level,
  previousLevel?: number,
  demotedFrom?: number,
) {
  return [
    ...(demotedFrom === undefined
      ? []
      : [{ text: `DEMOTED FROM ${String(demotedFrom).padStart(2, "0")}`, colour: 0xffab83 }]),
    ...levelHighlights(level, previousLevel).map((text) => ({ text, colour: 0x9ceaff })),
    { text: lossMessage(level, lossLevel), colour: lossLevel < level ? 0xff8d71 : 0xb3c5dc },
  ];
}
