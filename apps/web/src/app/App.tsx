import { useState } from "react";
import { GamePanel } from "./GamePanel";

export function App() {
  const [seed, setSeed] = useState(2026);
  const [humanSeat, setHumanSeat] = useState(0);
  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">An arena worth defending</p>
          <h1>
            NEON <span>CITADEL</span>
          </h1>
        </div>
        <p className="build-label">
          LOCAL PROTOTYPE <span>01 / FOUR FORTRESSES</span>
        </p>
      </header>
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
