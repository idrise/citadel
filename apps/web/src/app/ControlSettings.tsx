import {
  ASSISTANCE,
  assistanceMode,
  withAssistance,
  type AssistanceMode,
  type GameSettings,
} from "../session/settings";

export function ControlSettings({
  value,
  onChange,
}: {
  value: GameSettings;
  onChange: (value: GameSettings) => void;
}) {
  return (
    <>
      <label>
        Mouse sensitivity{" "}
        <input
          aria-label="Mouse sensitivity"
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={value.mouseSensitivity}
          onChange={(event) => onChange({ ...value, mouseSensitivity: Number(event.target.value) })}
        />{" "}
        {value.mouseSensitivity.toFixed(1)}×
      </label>
      <label>
        Aiming assistance{" "}
        <select
          aria-label="Aiming assistance"
          value={assistanceMode(value)}
          onChange={(event) =>
            onChange(withAssistance(value, event.target.value as AssistanceMode))
          }
        >
          {ASSISTANCE.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
      <p className="settings-hint">
        Preview suggests a short return with your bat held still. Slowdown gives every defender more
        time.
      </p>
    </>
  );
}
