import type { ArenaMorph } from "./types";
import type { Vec2 } from "./vector";

export interface PostReveal {
  vertices: readonly Vec2[];
  lift: number;
}

const clamp = (t: number) => Math.max(0, Math.min(1, t));
/** Zero velocity and acceleration at each mechanical stop. */
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Posts must be underground before any outline movement, and rise only after it stops. */
export function arenaTransition(time: number) {
  return {
    shape: ease(clamp((time - 0.15) / 0.7)),
    retract: 1 - ease(clamp(time / 0.15)),
    rise: ease(clamp((time - 0.85) / 0.15)),
  };
}

export function transitionPosts(
  time: number,
  source: PostReveal,
  target: readonly Vec2[],
): PostReveal {
  const phase = arenaTransition(time);
  return time < 0.5
    ? { vertices: source.vertices, lift: source.lift * phase.retract }
    : { vertices: target, lift: phase.rise };
}

export function morphPosts(morph: ArenaMorph): PostReveal {
  return transitionPosts(
    morph.elapsed / morph.duration,
    morph.postSource ?? { vertices: morph.from.vertices, lift: 1 },
    morph.to.vertices,
  );
}
