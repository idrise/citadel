import type { SceneAction, SceneControl } from "../rendering/scene-menu";

/** Invisible semantic hit targets follow the actual 3D buttons under the live camera. */
export function createSceneControls(
  container: HTMLElement,
  onAction: (action: SceneAction) => void,
  onHover: (action: SceneAction | null) => void,
) {
  const root = document.createElement("nav");
  root.className = "scene-controls";
  root.setAttribute("aria-label", "Arena menu");
  container.append(root);
  const buttons = new Map<SceneAction, HTMLButtonElement>();
  for (const [action, label] of [
    ["start", "Start"],
    ["decrease", "Decrease players"],
    ["increase", "Increase players"],
    ["options", "Settings"],
    ["rematch", "Rematch"],
    ["retry", "Retry"],
    ["back", "Back"],
  ] as const) {
    const button = document.createElement("button");
    button.setAttribute("aria-label", label);
    button.hidden = true;
    button.onclick = () => onAction(action);
    button.onmouseenter = button.onfocus = () => onHover(action);
    button.onmouseleave = button.onblur = () => onHover(null);
    root.append(button);
    buttons.set(action, button);
  }
  const count = document.createElement("output");
  count.className = "sr-only";
  count.setAttribute("aria-label", "Player count");
  root.append(count);
  return {
    update(controls: readonly SceneControl[], players: number) {
      count.textContent = String(players);
      root.hidden = controls.length === 0;
      for (const [action, button] of buttons) {
        const item = controls.find((control) => control.action === action);
        button.hidden = !item;
        if (!item) continue;
        button.setAttribute("aria-label", item.label);
        button.disabled = item.disabled;
        Object.assign(button.style, {
          left: `${Math.round(item.left)}px`,
          top: `${Math.round(item.top)}px`,
          width: `${Math.max(1, Math.round(item.width))}px`,
          height: `${Math.max(1, Math.round(item.height))}px`,
        });
      }
    },
    dispose() {
      root.remove();
    },
  };
}
