import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QUESTION_OCTAVE } from '../../constants';
import type { IntroStep } from '../../content/schema';
import { isTypingTarget } from '../hooks';
import { useComputerKeys, type Instrument } from '../instrument';
import { introEvents, introKeyboard, introKeys, introSequence, isPlayRight, playDone, playStart, playTip, type IntroKeys } from '../intro';
import { Keyboard } from './Keyboard';

interface IntroViewProps {
  readonly steps: readonly IntroStep[];
  readonly instrument: Instrument;
  readonly showNames: boolean;
  readonly showKeyHints: boolean;
  /** Two octaves fit on screen. */
  readonly wide: boolean;
  /** The last step's button, like "Start the round". */
  readonly doneLabel: string;
  readonly onDone: () => void;
}

/**
 * A level's intro (SPEC §9.1): a few guided steps to read, see lit and hear,
 * compare by ear, and play yourself, before the round. The keyboard keeps one
 * size for the whole intro; within a step, only what's below it changes.
 */
export function IntroView({ steps, instrument, showNames, showKeyHints, wide, doneLabel, onDone }: IntroViewProps) {
  const [index, setIndex] = useState(0);
  const board = useMemo(() => introKeyboard(steps, wide ? 2 : 1), [steps, wide]);
  const step = steps[index];
  if (!step) return null;
  const last = index === steps.length - 1;
  return (
    <StepView
      key={index}
      step={step}
      number={index + 1}
      count={steps.length}
      board={board}
      instrument={instrument}
      showNames={showNames}
      showKeyHints={showKeyHints}
      nextLabel={last ? doneLabel : 'Next'}
      onBack={index > 0 ? () => setIndex(index - 1) : null}
      onNext={() => {
        instrument.stop();
        if (last) onDone();
        else setIndex(index + 1);
      }}
    />
  );
}

interface StepViewProps {
  readonly step: IntroStep;
  readonly number: number;
  readonly count: number;
  readonly board: { readonly lowestNote: number; readonly octaves: number };
  readonly instrument: Instrument;
  readonly showNames: boolean;
  readonly showKeyHints: boolean;
  readonly nextLabel: string;
  readonly onBack: (() => void) | null;
  readonly onNext: () => void;
}

const NOTHING_LIT: IntroKeys = { keys: [], labels: new Map(), roots: new Set() };
const noOctaveChange = (): void => undefined;

function StepView({ step, number, count, board, instrument, showNames, showKeyHints, nextLabel, onBack, onNext }: StepViewProps) {
  const { play, noteOn, noteOff, pressed } = instrument;
  const playStep = step.kind === 'play' ? step : null;
  const [chosen, setChosen] = useState<ReadonlySet<number>>(() => new Set(playStep ? playStart(playStep) : []));
  const [tip, setTip] = useState<string | null>(null);
  const [heard, setHeard] = useState<number | null>(null);
  const solved = playStep ? isPlayRight(playStep.target, chosen) : true;

  // What a step shows plays as it opens; a "your turn" step only plays first when it's about listening.
  const opening = step.kind === 'see' ? step.target : playStep?.listen ? playStep.target : null;
  useEffect(() => {
    if (opening) play(introEvents(opening));
  }, [opening, play]);

  function toggle(n: number): void {
    noteOn(n);
    if (!playStep || solved) return;
    const next = new Set(chosen);
    if (next.has(n)) {
      next.delete(n);
      setTip(null);
    } else {
      next.add(n);
      setTip(playTip(playStep.target, n));
    }
    setChosen(next);
    if (isPlayRight(playStep.target, next)) {
      setTip(null);
      play(introEvents(playStep.target));
    }
  }

  function showMe(): void {
    if (!playStep) return;
    setChosen(new Set(introKeys(playStep.target).keys));
    setTip(null);
    play(introEvents(playStep.target));
  }

  const latestToggle = useRef(toggle);
  latestToggle.current = toggle;
  const stableToggle = useCallback((n: number) => latestToggle.current(n), []);
  useComputerKeys({ octave: QUESTION_OCTAVE, setOctave: noOctaveChange, noteOn: playStep ? stableToggle : noteOn, noteOff });

  // Enter moves on, once a "your turn" step is done.
  const latestEnter = useRef<(event: KeyboardEvent) => void>(() => undefined);
  latestEnter.current = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    if (solved) onNext();
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => latestEnter.current(event);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const lit = step.kind === 'see' ? introKeys(step.target) : step.kind === 'hear' && heard !== null && step.sounds[heard] ? introKeys(step.sounds[heard].target) : NOTHING_LIT;
  const hideNames = playStep?.hideNames ?? false;

  return (
    <>
      <section className="card intro-step" aria-live="polite">
        <p className="card-kicker">
          Step {number} of {count}
        </p>
        <p className="intro-text">{step.text}</p>
        {step.kind === 'see' && (
          <div className="play-row">
            <button type="button" className="button" onClick={() => play(introEvents(step.target))}>
              Play
            </button>
            {step.target.kind === 'chord' && (
              <button type="button" className="button" onClick={() => play(introEvents(step.target, true))}>
                One at a time
              </button>
            )}
          </div>
        )}
        {step.kind === 'hear' && (
          <div className="play-row">
            {step.sounds.map((sound, i) => (
              <button
                key={sound.label}
                type="button"
                className={heard === i ? 'button toggle' : 'button'}
                aria-pressed={heard === i}
                onClick={() => {
                  setHeard(i);
                  play(introEvents(sound.target));
                }}
              >
                {sound.label}
              </button>
            ))}
            {step.sounds.length === 2 && (
              <button type="button" className="button" onClick={() => play(introSequence(step.sounds.map((s) => s.target)))}>
                One then the other
              </button>
            )}
          </div>
        )}
        {playStep?.listen && (
          <div className="play-row">
            <button type="button" className="button" onClick={() => play(introEvents(playStep.target))}>
              Play again
            </button>
          </div>
        )}
      </section>

      {step.kind !== 'read' && (
        <Keyboard
          lowestNote={board.lowestNote}
          octaves={board.octaves}
          pressed={pressed}
          marked={lit.labels}
          roots={lit.roots}
          selected={playStep ? chosen : undefined}
          showNames={showNames && !hideNames}
          showKeyHints={showKeyHints}
          onNoteOn={playStep ? toggle : noteOn}
          onNoteOff={noteOff}
        />
      )}

      {playStep && (
        <div className="play-row question-actions">
          {!solved && (
            <button type="button" className="button" onClick={showMe}>
              Show me
            </button>
          )}
          <button
            type="button"
            className="button"
            onClick={() => {
              setChosen(new Set(playStart(playStep)));
              setTip(null);
            }}
          >
            {playStep.start ? 'Start again' : 'Clear'}
          </button>
        </div>
      )}

      {playStep && (solved || tip) && (
        <section className={solved ? 'card feedback right' : 'card question-help'} aria-live="polite">
          {solved ? (
            <p className="feedback-headline">{playDone(playStep.target)}</p>
          ) : (
            <p className="question-tip" role="status">
              {tip}
            </p>
          )}
        </section>
      )}

      <div className="play-row intro-nav">
        {onBack && (
          <button type="button" className="button" onClick={onBack}>
            Back
          </button>
        )}
        <button type="button" className="button primary" disabled={!solved} onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </>
  );
}
