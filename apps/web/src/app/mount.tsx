import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { NO_GAME_SIGNALS, type GameSignals } from "../events/game-signals";
import "./styles.css";

export function mountGame(signals: GameSignals = NO_GAME_SIGNALS) {
  const container = document.getElementById("root");
  if (!container) throw new Error("Missing application root.");
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App signals={signals} />
    </StrictMode>,
  );
  return root;
}
