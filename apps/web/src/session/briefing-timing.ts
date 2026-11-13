import { levelBriefingLines } from "./level-briefing";

// 180wpm is the upper end of Ofcom's 160–180wpm subtitle guidance.
// The additional notice time and separate animations are game-specific allowances.
export const BRIEFING_WORDS_PER_MINUTE = 180;
export const BRIEFING_RISE_SECONDS = 0.4;
export const BRIEFING_SINK_SECONDS = 0.45;
export const BRIEFING_NOTICE_SECONDS = 0.5;
export const BRIEFING_MINIMUM_HOLD_SECONDS = 2;

export function levelBriefingTiming(
  level: number,
  lossLevel = level,
  previousLevel?: number,
  demotedFrom?: number,
) {
  const lines = [
    `LEVEL ${String(level).padStart(2, "0")}`,
    ...levelBriefingLines(level, lossLevel, previousLevel, demotedFrom).map((line) => line.text),
  ];
  const words = lines.reduce((sum, line) => sum + (line.match(/[\p{L}\p{N}]+/gu)?.length ?? 0), 0);
  const readingSeconds = (words * 60) / BRIEFING_WORDS_PER_MINUTE;
  const minimumHold = Math.max(
    BRIEFING_MINIMUM_HOLD_SECONDS,
    BRIEFING_NOTICE_SECONDS + readingSeconds,
  );
  const duration = Math.ceil((BRIEFING_RISE_SECONDS + minimumHold + BRIEFING_SINK_SECONDS) * 4) / 4;
  return {
    words,
    readingSeconds,
    holdSeconds: duration - BRIEFING_RISE_SECONDS - BRIEFING_SINK_SECONDS,
    duration,
  };
}
