import { ROUND_QUESTIONS } from '../../constants';
import { levelLabel } from '../../game/packs';
import { continueLevel } from '../../game/progress';
import { useProgress } from '../progress';
import type { Navigate, Route } from '../router';

const DIAL_IN_URL = 'https://brendanauri.github.io/dial-in/';

interface Feature {
  readonly title: string;
  readonly description: string;
  /** Where it opens; features without one are still to come. */
  readonly route?: Route;
}

/** The game modes (SPEC §1), in plain words for someone who's new to music. */
const MODES: readonly Feature[] = [
  { title: 'Learn', description: 'Short levels that start from the very beginning: find the notes, then build your first chords.', route: { name: 'learn' } },
  { title: 'Review', description: "A few minutes a day. What you've learned comes back just before you'd forget it." },
  { title: 'Drill', description: 'Endless practice on whatever you choose, like just major against minor.', route: { name: 'drill' } },
  { title: 'Daily', description: 'The same ten questions for everyone each day, with a streak to keep.' },
];

/** The tools (SPEC §1 and §14): useful when you're writing or picking apart music. */
const TOOLS: readonly Feature[] = [
  {
    title: 'Explore',
    description: "Play anything and see what it's called. Light up any chord or scale and hear it.",
    route: { name: 'explore' },
  },
  {
    title: 'Scale Finder',
    description: 'Enter notes, or frequencies from a spectrum analyser, and see which scales they fit.',
    route: { name: 'finder' },
  },
  {
    title: 'Scale Guide',
    description: 'Pick a scale and see its chords, how each one feels and where it likes to go next.',
    route: { name: 'guide' },
  },
];

/** What the app holds: where to continue, then modes and tools, those still to come marked "Coming soon". */
export function Home({ navigate }: { readonly navigate: Navigate }) {
  const progress = useProgress();
  const resume = continueLevel(progress);
  return (
    <main className="screen home">
      <p className="tagline">Learn chords, scales and the theory behind them, starting from the very beginning.</p>

      {resume && (
        <section className="card continue-card" aria-labelledby="continue-title">
          <h2 id="continue-title" className="card-kicker">
            Continue
          </h2>
          <p className="card-title">
            {levelLabel(resume.ref)}: {resume.ref.level.title}
          </p>
          <p className="card-note">{resume.run ? `${resume.run.results.length} of ${ROUND_QUESTIONS} questions answered.` : resume.ref.level.summary}</p>
          <button type="button" className="button primary" onClick={() => navigate({ name: 'learn', pack: resume.ref.pack.id, level: resume.ref.level.id })}>
            {resume.run ? 'Pick up the round' : 'Continue'}
          </button>
        </section>
      )}

      <h2 className="section-title">Play</h2>
      <FeatureList features={MODES} navigate={navigate} />

      <h2 className="section-title">Tools</h2>
      <FeatureList features={TOOLS} navigate={navigate} />

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

function FeatureList({ features, navigate }: { readonly features: readonly Feature[]; readonly navigate: Navigate }) {
  return (
    <ul className="feature-list">
      {features.map((feature) => {
        const body = (
          <>
            <span className="feature-head">
              <span className="feature-title">{feature.title}</span>
              <span className={feature.route ? 'tag ready' : 'tag'}>{feature.route ? 'Open' : 'Coming soon'}</span>
            </span>
            <span className="feature-description">{feature.description}</span>
          </>
        );
        const route = feature.route;
        return (
          <li key={feature.title}>
            {route ? (
              <button type="button" className="feature-card ready" onClick={() => navigate(route)}>
                {body}
              </button>
            ) : (
              <div className="feature-card">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
