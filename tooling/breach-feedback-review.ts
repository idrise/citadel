import { createGameMusic } from "../apps/web/src/audio/music-session";
import { createToneEngine } from "../apps/web/src/audio/tone-engine";
import { createRoundObserver } from "../apps/web/src/session/round-observer";
import { createMatch } from "../apps/web/src/simulation/match";
import { damagePiece, launchBall } from "../apps/web/src/simulation/serving";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";

/** Live native-clock review of actual rule events through the session's audio path.
 * The arranged score is silent here so neither a missing cue nor a falling cheer can hide in it. */
export function mountBreachReview(human = 5) {
  const state = createMatch(2026, 6),
    observer = createRoundObserver(6),
    music = createGameMusic(2026, human, {
      createContext: () => {
        const context = new AudioContext();
        Object.assign(window, { feedbackHost: context });
        return context;
      },
      load: async (context) => createToneEngine(context, () => []),
    });
  const status = document.createElement("output");
  status.setAttribute("aria-label", "Music status");
  const timer = setInterval(() => {
    status.textContent = music.snapshot().status;
  }, 50);
  const button = (label: string, action: () => void) => {
    const node = document.createElement("button");
    node.textContent = label;
    node.onclick = action;
    document.body.append(node);
  };
  button("Start", () => {
    music.unlock();
    music.setPlaying(true);
  });
  const breach = (seat: number, striker = human) => {
    const ball = state.balls[0]!;
    ball.seat = striker;
    launchBall(state, ball, DEFAULT_OPTIONS);
    observer.observe(state.events); // Attribution, without a serve sound contaminating the audition.
    const piece = state.players[seat]!.health.findIndex(Boolean);
    damagePiece(state, ball, seat, piece);
    music.observe(
      { elapsed: 10, balls: 1, alive: state.players.map((p) => p.health.some(Boolean)) },
      observer.observe(state.events),
    );
  };
  button("Your score", () => breach((human + 1) % 6));
  button("Your loss", () => breach(human));
  button("Enemy break", () => breach((human + 1) % 6, (human + 2) % 6));
  button("Mixed breaches", () => {
    for (let i = 0; i < 3; i++) breach(human);
    breach((human + 1) % 6);
  });
  document.body.append(status);
  return {
    dispose() {
      clearInterval(timer);
      music.dispose();
    },
  };
}
