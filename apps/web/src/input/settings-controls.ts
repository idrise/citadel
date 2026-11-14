import type { SettingKey, SettingsAction, SettingsTarget } from "../rendering/scene-settings";
/** Accessible native ranges are invisible hit surfaces over the rendered tracks. */
export function createSettingsControls(
  container: HTMLElement,
  onAction: (action: SettingsAction) => void,
  onChange: (key: SettingKey, value: number) => void,
) {
  const root = document.createElement("nav");
  root.className = "scene-settings-controls";
  root.setAttribute("aria-label", "Game settings");
  container.append(root);
  const heading = document.createElement("h2");
  heading.className = "sr-only";
  heading.textContent = "Paused";
  root.append(heading);
  const controls = new Map<string, HTMLInputElement | HTMLButtonElement>();
  for (const [key, label] of [
    ["effectsVolume", "Sound effects volume"],
    ["musicVolume", "Music volume"],
    ["mouseSensitivity", "Mouse sensitivity"],
  ] as const) {
    const input = document.createElement("input");
    input.type = "range";
    input.setAttribute("aria-label", label);
    input.hidden = true;
    input.oninput = () => onChange(key, Number(input.value));
    root.append(input);
    controls.set(key, input);
  }
  for (const [key, label] of [
    ["pause", "Pause"],
    ["resume", "Resume"],
    ["restart", "Restart"],
    ["sound", "Enable sound"],
  ] as const) {
    const button = document.createElement("button");
    button.setAttribute("aria-label", label);
    button.hidden = true;
    button.onclick = () => onAction(key);
    root.append(button);
    controls.set(key, button);
  }
  return {
    update(targets: readonly SettingsTarget[], open: boolean) {
      heading.hidden = !open;
      root.hidden = targets.length === 0;
      for (const [key, element] of controls) {
        const target = targets.find((t) => t.key === key);
        element.hidden = !target;
        if (!target) continue;
        if (element instanceof HTMLInputElement) {
          element.min = String(target.min);
          element.max = String(target.max);
          element.step = String(target.step);
          element.value = String(target.value);
          element.setAttribute(
            "aria-valuetext",
            key === "mouseSensitivity"
              ? `${target.value!.toFixed(2)} times`
              : `${Math.round(target.value! * 100)} percent`,
          );
        }
        Object.assign(element.style, {
          left: `${target.left}px`,
          top: `${target.top}px`,
          width: `${target.width}px`,
          height: `${target.height}px`,
        });
      }
    },
    dispose() {
      root.remove();
    },
  };
}
