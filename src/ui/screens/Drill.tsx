import { useMemo, useState } from 'react';
import type { LiveAudio } from '../../audio/live';
import { soundOf } from '../../audio/patches';
import { EXERCISES } from '../../exercises/catalogue';
import type { About, ExerciseType, Guide, Question, QuestionSpec } from '../../exercises/types';
import { createDrill, learnedFrom, offeredAbouts, offeredRoots, offeredSet, offeredTypes, startingSet, type Drill as DrillRun } from '../../game/drill';
import { passedLevels } from '../../game/progress';
import { randomSeed } from '../../game/rng';
import { QuestionView } from '../components/QuestionView';
import { Segmented } from '../components/Segmented';
import { useMediaQuery, useSettings } from '../hooks';
import { TWO_OCTAVES, useInstrument } from '../instrument';
import { useProgress } from '../progress';

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

type Scope = 'learned' | 'everything';

const SCOPES: readonly { readonly value: Scope; readonly label: string }[] = [
  { value: 'learned', label: "What you've learned" },
  { value: 'everything', label: 'Everything' },
];

/**
 * Drill (SPEC §11): pick a question type and what it's about, then answer as
 * many as you like. Once levels are passed it offers what they taught, with
 * a way to show everything; until then, everything is open.
 */
export function Drill({ audio }: { readonly audio: LiveAudio }) {
  const [settings] = useSettings();
  const instrument = useInstrument(audio, soundOf(settings.soundId).patch);
  const wide = useMediaQuery(TWO_OCTAVES);
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const progress = useProgress();
  const taught = useMemo(() => learnedFrom(passedLevels(progress)), [progress]);

  const [scope, setScope] = useState<Scope>('learned');
  const [type, setType] = useState<ExerciseType>('spell');
  const [about, setAbout] = useState<About>('chords');
  // Null until a chip is tapped: then the starting set for whatever's picked.
  const [set, setSet] = useState<readonly string[] | null>(null);
  const [guide, setGuide] = useState<Guide>('full');
  const [running, setRunning] = useState<Running | null>(null);

  const learned = taught.size > 0 && scope === 'learned' ? taught : null;
  const types = offeredTypes(learned);
  const currentType = types.some((e) => e.type === type) ? type : (types[0]?.type ?? 'spell');
  const info = EXERCISES.find((e) => e.type === currentType);
  const abouts = offeredAbouts(currentType, learned);
  const currentAbout = abouts.includes(about) ? about : (abouts[0] ?? 'chords');
  const options = offeredSet(currentType, currentAbout, learned);
  const picked = set ?? startingSet(currentAbout, options);
  const chosen = options.filter((o) => picked.includes(o.id)).map((o) => o.id);
  const ready = options.length === 0 || chosen.length > 0;

  function chooseType(next: ExerciseType): void {
    setType(next);
    setSet(null);
  }

  function chooseAbout(next: About): void {
    setAbout(next);
    setSet(null);
  }

  function chooseScope(next: Scope): void {
    setScope(next);
    setSet(null);
  }

  function toggleItem(id: string): void {
    setSet(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  }

  function start(): void {
    const spec: QuestionSpec = {
      type: currentType,
      about: currentAbout,
      set: chosen,
      roots: offeredRoots(currentType, currentAbout, learned),
      guide: info?.guided ? guide : 'none',
      // Naming a single chord type asks for its root, rather than adding a type that may not have been learned.
      ...(currentType === 'identify' && currentAbout === 'chords' && chosen.length === 1 ? { choices: 'root' as const } : {}),
    };
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
        {taught.size > 0 ? (
          <Segmented label="Show" options={SCOPES} value={scope} onChange={chooseScope} hideLabel />
        ) : (
          <p className="card-note">Pass a level in Learn and Drill offers what it taught. Until then, everything is open.</p>
        )}
        <ul className="drill-types">
          {types.map((e) => (
            <li key={e.type}>
              <button
                type="button"
                className={e.type === currentType ? 'drill-type selected' : 'drill-type'}
                aria-pressed={e.type === currentType}
                onClick={() => chooseType(e.type)}
              >
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
