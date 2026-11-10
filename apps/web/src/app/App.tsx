import { ArenaPreview } from "./ArenaPreview";

export function App() {
  return (
    <main className="shell">
      <header className="masthead">
        <p className="eyebrow">An arena worth defending</p>
        <h1>
          NEON <span>CITADEL</span>
        </h1>
        <p className="intro">Read the angle. Make the return. Get your revenge.</p>
      </header>
      <ArenaPreview />
      <footer className="status">
        <span className="status-label">Prototype in development</span>
        <p>The arena is taking shape. Playable rounds are next.</p>
      </footer>
    </main>
  );
}
