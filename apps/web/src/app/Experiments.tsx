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
      <label>
        Effects quality{" "}
        <select
          aria-label="Effects quality"
          value={value.effectsQuality}
          onChange={(event) =>
            onChange({ ...value, effectsQuality: event.target.value as Settings["effectsQuality"] })
          }
        >
          {["low", "medium", "high"].map((quality) => (
            <option key={quality} value={quality}>
              {quality[0]!.toUpperCase() + quality.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <ControlSettings value={value} onChange={onChange} />
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
