import type { PlayerCount } from "../simulation/arena";
import { useState } from "react";
import { GamePanel } from "./GamePanel";
import { createSettings } from "../session/settings";

export function App() {
  const [seed, setSeed] = useState(2026);
  const [count, setCount] = useState<PlayerCount>(4);
  const [humanSeat, setHumanSeat] = useState(0);
  const [round, setRound] = useState(0);
  const [settings, setSettings] = useState(() =>
    createSettings(window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  );
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
