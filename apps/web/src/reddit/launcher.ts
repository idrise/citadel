import { context, requestExpandedMode } from "@devvit/web/client";
import "./launcher.css";

const button = document.getElementById("play") as HTMLButtonElement;
button.addEventListener("click", (event) => {
  try {
    if (context) requestExpandedMode(event, "game", { title: "CITADEL" });
    else window.location.assign("./reddit-game.html"); // Local preview without Reddit's host.
  } catch {
    document.getElementById("status")!.textContent =
      "Could not open the game. Please try Play again.";
  }
});
