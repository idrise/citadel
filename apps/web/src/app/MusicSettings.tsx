import type { GameSettings } from "../session/settings";
import type { MusicStatus } from "../audio/ports";

export function MusicSettings({
  value,
  onChange,
  status,
}: {
  value: GameSettings;
  onChange: (value: GameSettings) => void;
  status: MusicStatus;
}) {
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={value.music}
          onChange={(event) => onChange({ ...value, music: event.target.checked })}
        />{" "}
        Music
      </label>
      <label>
        Music volume{" "}
        <input
          aria-label="Music volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={value.musicVolume}
          onChange={(event) => onChange({ ...value, musicVolume: Number(event.target.value) })}
        />{" "}
        {Math.round(value.musicVolume * 100)}%
      </label>
      {status === "unavailable" && <p role="status">Audio is unavailable. You can keep playing.</p>}
    </>
  );
}
