import { useState } from 'react';
import type { LiveAudio } from '../../audio/live';
import { soundOf } from '../../audio/patches';
import { EXERCISES, defaultSet, setOptions } from '../../exercises/catalogue';
import type { About, ExerciseType, Guide, Question, QuestionSpec } from '../../exercises/types';
import { createDrill, type Drill as DrillRun } from '../../game/drill';
import { randomSeed } from '../../game/rng';
import { QuestionView } from '../components/QuestionView';
import { Segmented } from '../components/Segmented';
import { useMediaQuery, useSettings } from '../hooks';
import { TWO_OCTAVES, useInstrument } from '../instrument';

const ABOUT_NAMES: Readonly<Record<About, string>> = {
  chords: 'Chords',
  notes: 'Single notes',
  intervals: 'Intervals',
  scales: 'Scales',
  facts: 'Facts',
};

const GUIDES: readonly { readonly value: Guide; readonly label: string }[] = [
  { value: 'full', label: 'Lots of help' },
  { value: 'hint', label: 'A hint' },
  { value: 'none', label: 'No help' },
];

interface Running {
  readonly spec: QuestionSpec;
  readonly run: DrillRun;
  readonly question: Question;
  /** Counts the questions, so each one gets a fresh question view. */
  readonly number: number;
  readonly right: number;
  readonly asked: number;
}

/**
 * Drill (SPEC §11): pick a question type and what it's about, then answer as
 * many as you like. Every type is open until Learn arrives (Milestone 5).
 */
export function Drill({ audio }: { readonly audio: LiveAudio }) {
  const [settings] = useSettings();
  const instrument = useInstrument(audio, soundOf(settings.soundId).patch);
  const wide = useMediaQuery(TWO_OCTAVES);
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');

  const [type, setType] = useState<ExerciseType>('spell');
  const info = EXERCISES.find((e) => e.type === type) ?? EXERCISES[0];
  const [about, setAbout] = useState<About>('chords');
  const [set, setSet] = useState<readonly string[]>(() => defaultSet('chords'));
  const [guide, setGuide] = useState<Guide>('full');
  const [running, setRunning] = useState<Running | null>(null);

  const abouts = info?.abouts ?? ['chords'];
  const currentAbout = abouts.includes(about) ? about : (abouts[0] ?? 'chords');
  const options = setOptions(type, currentAbout);
  const chosen = options.filter((o) => set.includes(o.id)).map((o) => o.id);
  const ready = options.length === 0 || chosen.length > 0;

  function chooseType(next: ExerciseType): void {
    setType(next);
    const nextAbouts = EXERCISES.find((e) => e.type === next)?.abouts ?? ['chords'];
    const nextAbout = nextAbouts.includes(currentAbout) ? currentAbout : (nextAbouts[0] ?? 'chords');
    setAbout(nextAbout);
    setSet(defaultSet(nextAbout));
  }

  function chooseAbout(next: About): void {
    setAbout(next);
    setSet(defaultSet(next));
  }

  function toggleItem(id: string): void {
    setSet((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function start(): void {
    const spec: QuestionSpec = { type, about: currentAbout, set: chosen, guide: info?.guided ? guide : 'none' };
    const run = createDrill(spec, randomSeed());
    setRunning({ spec, run, question: run.next(), number: 1, right: 0, asked: 0 });
  }

  if (running) {
    const runningInfo = EXERCISES.find((e) => e.type === running.spec.type);
    return (
      <main className="screen drill">
        <div className="drill-bar">
          <div>
            <h1 className="screen-title">{runningInfo?.name ?? 'Drill'}</h1>
            <p className="screen-note">{running.asked === 0 ? 'Answer as many as you like.' : `${running.right} of ${running.asked} right`}</p>
          </div>
          <button
            type="button"
            className="button"
            onClick={() => {
              instrument.stop();
              setRunning(null);
            }}
          >
            End drill
          </button>
        </div>
        <QuestionView
          key={running.number}
          question={running.question}
          instrument={instrument}
          showNames={settings.noteNames}
          showKeyHints={canHover}
          wide={wide}
          onNext={(result) =>
            setRunning({
              ...running,
              question: running.run.next(),
              number: running.number + 1,
              asked: running.asked + 1,
              right: running.right + (result.correct ? 1 : 0),
            })
          }
        />
      </main>
    );
  }

  return (
    <main className="screen drill">
      <div className="screen-head">
        <h1 className="screen-title">Drill</h1>
        <p className="screen-note">Practise one thing over and over, for as long as you like. No scores to keep.</p>
      </div>

      <section className="card picker" aria-labelledby="drill-type-title">
        <h2 id="drill-type-title" className="card-kicker">
          What to practise
        </h2>
        <ul className="drill-types">
          {EXERCISES.map((e) => (
            <li key={e.type}>
              <button type="button" className={e.type === type ? 'drill-type selected' : 'drill-type'} aria-pressed={e.type === type} onClick={() => chooseType(e.type)}>
                <span className="drill-type-name">{e.name}</span>
                <span className="drill-type-description">{e.description}</span>
              </button>
            </li>
          ))}
        </ul>

        {abouts.length > 1 && (
          <Segmented label="About" options={abouts.map((a) => ({ value: a, label: ABOUT_NAMES[a] }))} value={currentAbout} onChange={chooseAbout} />
        )}

        {options.length > 0 && (
          <fieldset className="chip-field">
            <legend className="segmented-label">Which ones</legend>
            <div className="chips">
              {options.map((o) => (
                <button key={o.id} type="button" className={chosen.includes(o.id) ? 'chip selected' : 'chip'} aria-pressed={chosen.includes(o.id)} onClick={() => toggleItem(o.id)}>
                  {o.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {info?.guided && <Segmented label="Help" options={GUIDES} value={guide} onChange={setGuide} />}

        <button type="button" className="button primary" disabled={!ready} onClick={start}>
          Start
        </button>
        {!ready && <p className="card-note">Pick at least one.</p>}
      </section>
    </main>
  );
}
