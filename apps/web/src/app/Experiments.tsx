import type { Experiments as Settings } from "../session/session";

export function Experiments({
  value,
  onChange,
  elapsed,
  hits,
  damage,
  caps,
  seed,
  paddleAngle,
}: {
  value: Settings;
  onChange: (value: Settings) => void;
  elapsed: number;
  hits: number;
  damage: number;
  caps: number;
  seed: number;
  paddleAngle: number;
}) {
  return (
    <details className="experiments">
      <summary>Prototype experiments & diagnostics</summary>
      <div className="experiment-options">
        <label>
          Add a ball every{" "}
          <input
            aria-label="Ball addition interval"
            type="range"
            min="5"
            max="30"
            step="1"
            value={value.ballInterval}
            onChange={(event) => onChange({ ...value, ballInterval: Number(event.target.value) })}
          />{" "}
          {value.ballInterval}s
        </label>
        <label>
          Ball limit{" "}
          <select
            aria-label="Ball limit"
            value={value.maxBalls}
            onChange={(event) => onChange({ ...value, maxBalls: Number(event.target.value) })}
          >
            {[1, 2, 3, 4, 6, 8].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.preview}
            onChange={(event) => onChange({ ...value, preview: event.target.checked })}
          />{" "}
          Short return preview
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.slowdown}
            onChange={(event) => onChange({ ...value, slowdown: event.target.checked })}
          />{" "}
          Approach slowdown (all defenders)
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.reducedEffects}
            onChange={(event) => onChange({ ...value, reducedEffects: event.target.checked })}
          />{" "}
          Reduced effects
        </label>
        <label>
          Automatic serve{" "}
          <input
            type="range"
            min="1"
            max="4"
            step="0.1"
            value={value.serveTimeout}
            onChange={(event) => onChange({ ...value, serveTimeout: Number(event.target.value) })}
          />{" "}
          {value.serveTimeout.toFixed(1)}s
        </label>
      </div>
      <p className="diagnostics">
        Seed {seed} · {elapsed.toFixed(1)}s · {hits} returns · {damage} pieces lost · {caps}{" "}
        collision caps
      </p>
      <p className="diagnostics">
        Bat angle{" "}
        <output aria-label="Bat angle">{((paddleAngle * 180) / Math.PI).toFixed(1)}</output>°
      </p>
      <p className="fine-print">
        Preview assumes contact at your current paddle position. Slowdown changes ball speed near
        approaching paddles. Both are experiments; compare on and off.
      </p>
    </details>
  );
}
