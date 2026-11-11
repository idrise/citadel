import type { GameSettings as Settings } from "../session/settings";
import { ControlSettings } from "./ControlSettings";

export function Experiments({
  value,
  onChange,
}: {
  value: Settings;
  onChange: (value: Settings) => void;
}) {
  return (
    <div className="experiment-options">
      <ControlSettings value={value} onChange={onChange} />
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
          checked={value.reducedEffects}
          onChange={(event) => onChange({ ...value, reducedEffects: event.target.checked })}
        />{" "}
        Reduced effects & motion
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
  );
}
