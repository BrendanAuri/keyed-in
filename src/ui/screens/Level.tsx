import { useMemo, useState } from 'react';
import type { LiveAudio } from '../../audio/live';
import { soundOf } from '../../audio/patches';
import { ROUND_QUESTIONS, STAR_THRESHOLDS } from '../../constants';
import { findLevel, levelLabel, nextLevel, refKey, resolveLevel, type LevelRef } from '../../game/packs';
import {
  abandonRun,
  finishRun,
  introSeen,
  isUnlocked,
  levelRecord,
  markIntroSeen,
  recordAnswer,
  roundOutcome,
  runFor,
  startRun,
  type LevelRecord,
  type RoundOutcome,
} from '../../game/progress';
import { randomSeed } from '../../game/rng';
import { buildRound } from '../../game/round';
import { IntroView } from '../components/IntroView';
import { QuestionView } from '../components/QuestionView';
import { RoundDots, Stars } from '../components/Stars';
import { useMediaQuery, useSettings } from '../hooks';
import { TWO_OCTAVES, useInstrument } from '../instrument';
import { progressStore, useProgress } from '../progress';
import type { Navigate } from '../router';

const PERCENT = 100;

/** Right answers out of a round needed for a star threshold: 7, 9 and 10 of 10. */
function rightNeeded(threshold: number): number {
  return Math.ceil((threshold / PERCENT) * ROUND_QUESTIONS);
}

interface LevelProps {
  readonly audio: LiveAudio;
  readonly navigate: Navigate;
  readonly packId: string;
  readonly levelId: string;
}

/** One level (SPEC §9): its page, then the intro, the round and how it went. */
export function Level({ audio, navigate, packId, levelId }: LevelProps) {
  const ref = findLevel(packId, levelId);
  if (!ref) {
    return (
      <main className="screen">
        <div className="screen-head">
          <h1 className="screen-title">Level not found</h1>
          <p className="screen-note">That level doesn't exist, or it has moved.</p>
        </div>
        <button type="button" className="button primary" onClick={() => navigate({ name: 'learn' })}>
          All levels
        </button>
      </main>
    );
  }
  return <LevelScreen key={refKey(ref)} levelRef={ref} audio={audio} navigate={navigate} />;
}

type Stage =
  | { readonly kind: 'page' }
  | { readonly kind: 'intro'; readonly thenRound: boolean }
  | { readonly kind: 'round' }
  | { readonly kind: 'result'; readonly outcome: RoundOutcome; readonly testOut: boolean };

function LevelScreen({ levelRef: ref, audio, navigate }: { readonly levelRef: LevelRef; readonly audio: LiveAudio; readonly navigate: Navigate }) {
  const progress = useProgress();
  const store = progressStore();
  const [settings] = useSettings();
  const instrument = useInstrument(audio, soundOf(settings.soundId).patch);
  const wide = useMediaQuery(TWO_OCTAVES);
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const [stage, setStage] = useState<Stage>({ kind: 'page' });

  const run = runFor(progress, ref);
  // Made again from the seed whenever a round begins or is picked up; answering doesn't change them.
  const seed = run?.seed;
  const testOut = run?.testOut ?? false;
  const questions = useMemo(() => (seed === undefined ? [] : buildRound(ref, seed, testOut)), [ref, seed, testOut]);
  // The question on screen: it moves on at Next, after the answer has been saved.
  const [showing, setShowing] = useState(() => run?.results.length ?? 0);

  function startRound(testOut: boolean): void {
    store.update((p) => startRun(p, ref, randomSeed(), testOut));
    setShowing(0);
    setStage({ kind: 'round' });
  }

  function leave(): void {
    instrument.stop();
    setStage({ kind: 'page' });
  }

  const title = (
    <div>
      <p className="card-kicker">{levelLabel(ref)}</p>
      <h1 className="screen-title">{ref.level.title}</h1>
    </div>
  );

  if (stage.kind === 'intro') {
    return (
      <main className="screen level">
        <div className="drill-bar">
          {title}
          <button
            type="button"
            className="button"
            onClick={() => {
              store.update((p) => markIntroSeen(p, ref));
              if (stage.thenRound) startRound(false);
              else leave();
            }}
          >
            {stage.thenRound ? 'Skip intro' : 'Close'}
          </button>
        </div>
        <IntroView
          steps={ref.level.intro}
          instrument={instrument}
          showNames={settings.noteNames}
          showKeyHints={canHover}
          wide={wide}
          doneLabel={stage.thenRound ? 'Start the round' : 'Done'}
          onDone={() => {
            store.update((p) => markIntroSeen(p, ref));
            if (stage.thenRound) startRound(false);
            else setStage({ kind: 'page' });
          }}
        />
      </main>
    );
  }

  if (stage.kind === 'round' && run) {
    const question = questions[showing];
    if (question) {
      // Counted up to the question on screen, so the line above the keyboard doesn't change when it's answered.
      const before = run.results.slice(0, showing);
      const right = before.filter(Boolean).length;
      return (
        <main className="screen level">
          <div className="drill-bar">
            <div>
              <p className="card-kicker">{run.testOut ? `Testing out of ${levelLabel(ref)}` : levelLabel(ref)}</p>
              <h1 className="screen-title">
                Question {showing + 1} of {questions.length}
              </h1>
              <p className="screen-note">{showing === 0 ? 'Take your time: there is no clock.' : `${right} of ${showing} right so far`}</p>
            </div>
            <button type="button" className="button" onClick={leave}>
              Leave
            </button>
          </div>
          <RoundDots results={before} total={questions.length} />
          <QuestionView
            key={`${run.seed}-${showing}`}
            question={question}
            instrument={instrument}
            showNames={settings.noteNames}
            showKeyHints={canHover}
            wide={wide}
            onAnswer={(result) => {
              // Saved at once, so leaving after checking can't take an answer back.
              if (run.results.length === showing) store.update((p) => recordAnswer(p, result.correct));
            }}
            onNext={() => {
              if (showing + 1 < questions.length) {
                setShowing(showing + 1);
                return;
              }
              const latest = runFor(store.getSnapshot(), ref);
              const outcome = roundOutcome(latest?.results ?? run.results);
              store.update((p) => finishRun(p, ref));
              setStage({ kind: 'result', outcome, testOut: run.testOut });
            }}
          />
        </main>
      );
    }
  }

  if (stage.kind === 'result') {
    return <ResultView levelRef={ref} outcome={stage.outcome} testOut={stage.testOut} record={levelRecord(progress, ref)} navigate={navigate} onAgain={() => startRound(stage.testOut && !stage.outcome.passed)} />;
  }

  // The level's page.
  const unlocked = isUnlocked(progress, ref);
  const record = levelRecord(progress, ref);
  const seen = introSeen(progress, ref);
  const other = progress.run && !run ? resolveLevel(progress.run.level) : null;
  const previous = ref.pack.levels[ref.index - 1];
  const stars = `Get ${rightNeeded(STAR_THRESHOLDS[0])} right to pass, ${rightNeeded(STAR_THRESHOLDS[1])} for two stars and ${rightNeeded(STAR_THRESHOLDS[2])} for three.`;

  return (
    <main className="screen level">
      <div className="drill-bar">
        {title}
        <button type="button" className="button" onClick={() => navigate({ name: 'learn' })}>
          All levels
        </button>
      </div>
      <p className="screen-note">{ref.level.summary}</p>

      <section className="card level-card">
        <RecordLine record={record} />
        {!unlocked ? (
          <>
            <p className="card-note">Locked: pass {previous ? `“${previous.title}”` : 'the level before'} to open it.</p>
            <p className="card-note">
              Already know this? Test out: one round of {ROUND_QUESTIONS} questions on this level, with no intro and no help. Get {rightNeeded(STAR_THRESHOLDS[0])} right to
              pass it and every level before it.
            </p>
            <div className="play-row">
              <button type="button" className="button primary" onClick={() => (run ? setStage({ kind: 'round' }) : startRound(true))}>
                {run ? 'Continue the test' : 'Test out'}
              </button>
              {run && (
                <button type="button" className="button" onClick={() => store.update(abandonRun)}>
                  Stop the test
                </button>
              )}
            </div>
          </>
        ) : run ? (
          <>
            <p className="card-note">
              You're partway through a round: {run.results.length} of {ROUND_QUESTIONS} answered.
            </p>
            <div className="play-row">
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  setShowing(run.results.length);
                  setStage({ kind: 'round' });
                }}
              >
                Continue
              </button>
              <button type="button" className="button" onClick={() => startRound(false)}>
                Start over
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="card-note">
              {seen ? `${ROUND_QUESTIONS} questions.` : `A short intro, then ${ROUND_QUESTIONS} questions.`} {stars}
            </p>
            {other && <p className="card-note">Starting this ends your unfinished round on “{other.level.title}”.</p>}
            <div className="play-row">
              <button type="button" className="button primary" onClick={() => (seen ? startRound(false) : setStage({ kind: 'intro', thenRound: true }))}>
                Start
              </button>
              {seen && (
                <button type="button" className="button" onClick={() => setStage({ kind: 'intro', thenRound: false })}>
                  See the intro again
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

/** How the level has gone so far: stars and best round, or how it was passed. */
function RecordLine({ record }: { readonly record: LevelRecord | undefined }) {
  if (!record) return <p className="card-note">Not played yet.</p>;
  if (record.runs === 0) return <p className="card-note">Passed without playing it. Play a round to earn stars.</p>;
  return (
    <p className="level-record">
      <Stars count={record.stars} />
      <span>
        Best round: {Math.round((record.best / PERCENT) * ROUND_QUESTIONS)} of {ROUND_QUESTIONS} right{record.passed ? '' : ', not passed yet'}
      </span>
    </p>
  );
}

interface ResultViewProps {
  readonly levelRef: LevelRef;
  readonly outcome: RoundOutcome;
  readonly testOut: boolean;
  readonly record: LevelRecord | undefined;
  readonly navigate: Navigate;
  readonly onAgain: () => void;
}

function ResultView({ levelRef: ref, outcome, testOut, record, navigate, onAgain }: ResultViewProps) {
  const next = nextLevel(ref);
  const needed = rightNeeded(STAR_THRESHOLDS[0]);
  const headline = outcome.passed ? (testOut ? 'Tested out!' : 'Passed!') : 'Not this time';
  let message: string;
  if (testOut) {
    message = outcome.passed ? 'This level and every level before it are passed.' : `You need ${needed} right to test out. Try again, or play the levels before it.`;
  } else if (outcome.passed) {
    message = outcome.stars < STAR_THRESHOLDS.length ? 'Play it again any time for more stars.' : "That's every star.";
  } else {
    message = `You need ${needed} right to pass. Have another go: the questions are different each time.`;
  }
  return (
    <main className="screen level">
      <section className={outcome.passed ? 'card result-card right' : 'card result-card'} aria-live="polite">
        <p className="card-kicker">
          {levelLabel(ref)}: {ref.level.title}
        </p>
        <p className="result-headline">{headline}</p>
        <Stars count={outcome.stars} large />
        <p className="result-score">
          {outcome.right} of {outcome.total} right
        </p>
        <p className="card-note">{message}</p>
        {record && record.runs > 1 && <p className="card-note">Your best: {Math.round((record.best / PERCENT) * ROUND_QUESTIONS)} of {ROUND_QUESTIONS}.</p>}
        <div className="play-row">
          {outcome.passed && next && (
            <button type="button" className="button primary" onClick={() => navigate({ name: 'learn', pack: next.pack.id, level: next.level.id })}>
              Next level
            </button>
          )}
          <button type="button" className={outcome.passed && next ? 'button' : 'button primary'} onClick={onAgain}>
            {outcome.passed ? 'Play again' : 'Try again'}
          </button>
          <button type="button" className="button" onClick={() => navigate({ name: 'learn' })}>
            All levels
          </button>
        </div>
      </section>
    </main>
  );
}
