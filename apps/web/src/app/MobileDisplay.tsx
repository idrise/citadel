import { useEffect, useState } from "react";
import {
  enterMobileFullscreen,
  exitMobileFullscreen,
  fullscreenActive,
  fullscreenSupported,
} from "../input/fullscreen";

/** Fullscreen controls live in menus; the round only keeps its touch pause button. */
export function MobileDisplay() {
  const [active, setActive] = useState(fullscreenActive);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    const update = () => setActive(fullscreenActive());
    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update);
    };
  }, []);
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    (!active && window.matchMedia("(display-mode: fullscreen)").matches) ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  if (installed) return null;
  return (
    <div className="mobile-display">
      {fullscreenSupported() ? (
        <>
          <button
            onClick={() => {
              if (active) void exitMobileFullscreen();
              else void enterMobileFullscreen().then((ok) => setDenied(!ok));
            }}
          >
            {active ? "Exit fullscreen" : "Full screen"}
          </button>
          {denied && (
            <p role="status">
              Fullscreen was unavailable. You can also launch Citadel from your Home Screen.
            </p>
          )}
        </>
      ) : (
        <details className="fullscreen-help">
          <summary>Full screen</summary>
          <p>
            On iPhone, open Share → Add to Home Screen, enable Open as Web App if offered, then
            launch Citadel from its icon to hide the browser bars.
          </p>
        </details>
      )}
    </div>
  );
}
