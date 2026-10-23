const DIAL_IN_URL = 'https://brendanauri.github.io/dial-in/';

interface Feature {
  readonly title: string;
  readonly description: string;
}

/** The game modes (SPEC §1), in plain words for someone who's new to music. */
const MODES: readonly Feature[] = [
  { title: 'Learn', description: 'Short levels that start from the very beginning: find the notes, then build your first chords.' },
  { title: 'Review', description: "A few minutes a day. What you've learned comes back just before you'd forget it." },
  { title: 'Drill', description: 'Endless practice on whatever you choose, like just major against minor.' },
  { title: 'Daily', description: 'The same ten questions for everyone each day, with a streak to keep.' },
];

/** The tools (SPEC §1 and §14): useful when you're writing or picking apart music. */
const TOOLS: readonly Feature[] = [
  { title: 'Explore', description: "Play anything and see what it's called. Light up any chord or scale and hear it." },
  { title: 'Scale Finder', description: 'Enter notes, or frequencies from a spectrum analyser, and see which scales they fit.' },
  { title: 'Scale Guide', description: 'Pick a scale and see its chords, how each one feels and where it likes to go next.' },
];

/** What the app will hold, each mode and tool marked "Coming soon" until it's built. */
export function Home() {
  return (
    <main className="screen home">
      <p className="tagline">Learn chords, scales and the theory behind them, starting from the very beginning.</p>

      <h2 className="section-title">Play</h2>
      <FeatureList features={MODES} />

      <h2 className="section-title">Tools</h2>
      <FeatureList features={TOOLS} />

      <section className="card sibling-card" aria-labelledby="dial-in-title">
        <h2 id="dial-in-title" className="card-kicker">
          Also try
        </h2>
        <p className="card-title">Dial In</p>
        <p className="card-note">Learn synthesis by ear: hear a sound, then recreate it on a synth.</p>
        <a className="button" href={DIAL_IN_URL}>
          Open Dial In
        </a>
      </section>
    </main>
  );
}

function FeatureList({ features }: { readonly features: readonly Feature[] }) {
  return (
    <ul className="feature-list">
      {features.map((feature) => (
        <li key={feature.title} className="feature-card">
          <span className="feature-head">
            <span className="feature-title">{feature.title}</span>
            <span className="tag">Coming soon</span>
          </span>
          <span className="feature-description">{feature.description}</span>
        </li>
      ))}
    </ul>
  );
}
