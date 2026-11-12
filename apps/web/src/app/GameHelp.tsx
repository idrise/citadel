import { BUILD_INFO } from "./build-info";
export function GameHelp() {
  return (
    <details className="game-help">
      <summary>How to play</summary>
      <p>
        Start with three containers. Hit falling supply containers with your ball to add one to your
        fortress. Supplies stop arriving after the opening minute. The last fortress standing wins.
        Your rivals are bots.
      </p>
      <p>
        Move the mouse left/right to steer. Click or press Space to serve; held serves launch
        automatically. A/D or the arrow keys also move the bat. On a touchscreen, drag left or right
        to steer and tap to serve.
      </p>
      <p>
        Catch near the bat's edges to aim. Brush sideways into a hit for curve. Dots show a possible
        return if you hold the bat still.
      </p>
      <p>
        Losing a piece gives you a revenge serve. The arena changes shape as fortresses fall. Escape
        or P pauses and releases the mouse; H hides paused controls.
      </p>
      <small>
        Desktop preview · v{BUILD_INFO.version} · {BUILD_INFO.revision}. Choices are saved on this
        device. Round export downloads a local JSON file.
      </small>
    </details>
  );
}
