import { useState } from "react";
import { GamePanel } from "./GamePanel";

export function App() {
  const [seed, setSeed] = useState(2026);
  const [humanSeat, setHumanSeat] = useState(0);
  return (
    <main className="game-root">
      <h1 className="sr-only">Neon Citadel</h1>
      <GamePanel
        key={`${seed}-${humanSeat}`}
        seed={seed}
        humanSeat={humanSeat}
        onRematch={() => setSeed((value) => value + 1)}
        onSeat={setHumanSeat}
      />
    </main>
  );
}
