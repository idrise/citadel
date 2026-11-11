import type { PlayerCount } from "../simulation/arena";
import { useState, useEffect } from "react";
import { GamePanel } from "./GamePanel";
import { loadPreferences, savePreferences } from "../session/preferences";

export function App() {
  const [initial] = useState(() =>
    loadPreferences(window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  );
  const [seed, setSeed] = useState(2026);
  const [count, setCount] = useState<PlayerCount>(initial.count);
  const [humanSeat, setHumanSeat] = useState(initial.humanSeat);
  const [round, setRound] = useState(0);
  const [settings, setSettings] = useState(initial.settings);
  useEffect(() => {
    savePreferences({ count, humanSeat, settings });
  }, [count, humanSeat, settings]);
  return (
    <main className="game-root">
      <h1 className="sr-only">Neon Citadel</h1>
      <GamePanel
        key={`${seed}-${humanSeat}-${round}-${count}`}
        count={count}
        onCount={(value) => {
          setHumanSeat((seat) => Math.min(seat, value - 1));
          setCount(value);
        }}
        seed={seed}
        humanSeat={humanSeat}
        settings={settings}
        onSettings={setSettings}
        onRestart={() => setRound((value) => value + 1)}
        onRematch={() => setSeed((value) => value + 1)}
        onSeat={setHumanSeat}
      />
    </main>
  );
}
