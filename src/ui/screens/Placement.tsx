import { useState } from 'react';
import type { LiveAudio } from '../../audio/live';
import { soundOf } from '../../audio/patches';
import { PLACEMENT_MAX_MISSES } from '../../constants';
import { levelLabel, type LevelRef } from '../../game/packs';
import { buildPlacement, placedLevels, placementOver } from '../../game/placement';
import { chooseStart, passLevels, suggestedLevel } from '../../game/progress';
import { randomSeed } from '../../game/rng';
import { QuestionView } from '../components/QuestionView';
import { RoundDots } from '../components/Stars';
import { useMediaQuery, useSettings } from '../hooks';
import { TWO_OCTAVES, useInstrument } from '../instrument';
import { progressStore } from '../progress';
import type { Navigate } from '../router';

type Stage = { readonly kind: 'about' } | { readonly kind: 'asking' } | { readonly kind: 'done'; readonly placed: readonly LevelRef[] };

/**
 * The placement check (SPEC §9.4), for "I know some basics": a couple of
 * questions from each early level, in order, with no help, stopping after a
 * couple of misses. Every level answered all right is passed, with no stars.
 */
export function Placement({ audio, navigate }: { readonly audio: LiveAudio; readonly navigate: Navigate }) {
  const [settings] = useSettings();
  const instrument = useInstrument(audio, soundOf(settings.soundId).patch);
  const wide = useMediaQuery(TWO_OCTAVES);
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const [plan] = useState(() => buildPlacement(randomSeed()));
  const [stage, setStage] = useState<Stage>({ kind: 'about' });
  const [results, setResults] = useState<readonly boolean[]>([]);
  const [showing, setShowing] = useState(0);

  /** Pass what's been shown, and say Learn has begun. */
  function finish(answered: readonly boolean[]): void {
    instrument.stop();
    const placed = placedLevels(plan, answered);
    progressStore().update((p) => chooseStart(passLevels(p, placed), 'placed'));
    setStage({ kind: 'done', placed });
  }

  if (stage.kind === 'about') {
    return (
      <main className="screen placement">
        <div className="screen-head">
          <h1 className="screen-title">Placement check</h1>
          <p className="screen-note">Skip the levels you already know.</p>
        </div>
        <section className="card">
          <p className="card-note">
            You'll get a couple of questions from each level, in order, with no help. It stops after {PLACEMENT_MAX_MISSES} misses, and every level you get all right is
            passed. Not sure of one? Stop whenever you like.
          </p>
          <div className="play-row">
            <button type="button" className="button primary" onClick={() => setStage({ kind: 'asking' })}>
              Start
            </button>
            <button type="button" className="button" onClick={() => navigate({ name: 'learn' })}>
              Back
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (stage.kind === 'done') {
    const next = suggestedLevel(progressStore().getSnapshot());
    return (
      <main className="screen placement">
        <section className="card result-card right" aria-live="polite">
          <p className="card-kicker">Placement check</p>
          <p className="result-headline">{stage.placed.length === 0 ? 'No levels passed this time' :`${stage.placed.length} ${stage.placed.length === 1 ? 'level' : 'levels'} passed`}</p>
          {stage.placed.length === 0 ? (
            <p className="card-note">That's fine: the first levels go quickly when some of it is familiar.</p>
          ) : (
            <ul className="placed-list">
              {stage.placed.map((ref) => (
                <li key={`${ref.pack.id}/${ref.level.id}`}>
                  {levelLabel(ref)}: {ref.level.title}
                </li>
              ))}
            </ul>
          )}
          <div className="play-row">
            {next && (
              <button type="button" className="button primary" onClick={() => navigate({ name: 'learn', pack: next.pack.id, level: next.level.id })}>
                Go to level {next.index + 1}
              </button>
            )}
            <button type="button" className="button" onClick={() => navigate({ name: 'learn' })}>
              All levels
            </button>
          </div>
        </section>
      </main>
    );
  }

  const current = plan[showing];
  if (!current) return null;
  return (
    <main className="screen placement">
      <div className="drill-bar">
        <div>
          <p className="card-kicker">Placement check</p>
          <h1 className="screen-title">{current.ref.level.title}</h1>
          <p className="screen-note">
            Level {current.ref.index + 1} · question {showing + 1} of {plan.length}
          </p>
        </div>
        <button type="button" className="button" onClick={() => finish(results)}>
          Stop here
        </button>
      </div>
      <RoundDots results={results.slice(0, showing)} total={plan.length} />
      <QuestionView
        key={showing}
        question={current.question}
        instrument={instrument}
        showNames={settings.noteNames}
        showKeyHints={canHover}
        wide={wide}
        onAnswer={(result) => setResults((r) => (r.length === showing ? [...r, result.correct] : r))}
        onNext={() => {
          if (placementOver(plan, results)) finish(results);
          else setShowing(showing + 1);
        }}
      />
    </main>
  );
}
