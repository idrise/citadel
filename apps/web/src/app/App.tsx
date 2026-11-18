import { levelDifficulty } from "../simulation/difficulty";
import { roundSeed } from "../session/round-seed";
import {
  freshProgress,
  levelFor,
  levelAfterLoss,
  loadProgress,
  recordResult,
  saveProgress,
} from "../session/progression";
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
  // Only the injected browser-test port can override authored progression for geometry fixtures.
  const [testCount, setCount] = useState<PlayerCount | null>(null);
  const count = testCount ?? levelDifficulty(progress.level).playerCount;
  const [seat, setHumanSeat] = useState(initial.humanSeat);
  const humanSeat = Math.min(seat, count - 1);
  const [settings, setSettings] = useState(initial.settings);
  useEffect(() => {
    savePreferences({ count, humanSeat, settings });
  }, [count, humanSeat, settings]);
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);
  return (
    <main className="game-root">
      <h1 className="sr-only">Citadel</h1>
      <GamePanel
        level={levelFor(progress)}
        bestLevel={progress.best}
        replayTokens={progress.replayTokens}
        onResetProgress={() => {
          setCount(null);
          setProgress(freshProgress());
        }}
        lossLevel={levelAfterLoss(progress, count)}
        previousLevel={progress.recent.at(-1)?.level}
        demotion={progress.demotion}
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
