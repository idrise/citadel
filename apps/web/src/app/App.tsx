import { roundSeed } from "../session/round-seed";
import { levelFor, loadProgress, recordResult, saveProgress } from "../session/progression";
import type { PlayerCount } from "../simulation/arena";
import { useState, useEffect } from "react";
import { GamePanel } from "./GamePanel";
import { loadPreferences, savePreferences } from "../session/preferences";

export function App() {
  const [initial] = useState(() =>
    loadPreferences(window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  );
  const [progress, setProgress] = useState(loadProgress);
  const [seed] = useState(roundSeed);
  const [count, setCount] = useState<PlayerCount>(initial.count);
  const [humanSeat, setHumanSeat] = useState(initial.humanSeat);
  const [settings, setSettings] = useState(initial.settings);
  useEffect(() => {
    savePreferences({ count, humanSeat, settings });
  }, [count, humanSeat, settings]);
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);
  return (
    <main className="game-root">
      <h1 className="sr-only">Neon Citadel</h1>
      <GamePanel
        level={levelFor(progress, count)}
        onComplete={(result) => setProgress((current) => recordResult(current, result))}
        count={count}
        onCount={(value) => {
          setHumanSeat((seat) => Math.min(seat, value - 1));
          setCount(value);
        }}
        seed={seed}
        humanSeat={humanSeat}
        settings={settings}
        onSettings={setSettings}
        onSeat={setHumanSeat}
      />
    </main>
  );
}
