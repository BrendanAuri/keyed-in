import { useCallback, useEffect, useRef, useState } from 'react';
import { abEvents, chordEvents, eventsEnd, keysEvents, scaleEvents, type KeysStyle, type NoteEvent } from '../../audio/schedule';
import { QUESTION_OCTAVE } from '../../constants';
import { rate, type Rating } from '../../exercises/grading';
import { wrongKeyTip } from '../../exercises/keys';
import { checkAnswer, feedbackFor } from '../../exercises/questions';
import { isKeysQuestion, type Answer, type Feedback, type Question, type Result } from '../../exercises/types';
import { isTypingTarget } from '../hooks';
import { useComputerKeys, type Instrument } from '../instrument';
import { questionKeyboard } from '../question';
import { Keyboard } from './Keyboard';

interface QuestionViewProps {
  readonly question: Question;
  readonly instrument: Instrument;
  readonly showNames: boolean;
  readonly showKeyHints: boolean;
  /** Two octaves fit on screen. */
  readonly wide: boolean;
  /** Moving on, with how it went. */
  readonly onNext: (result: Result, rating: Rating) => void;
}

interface Answered {
  readonly answer: Answer;
  readonly result: Result;
  readonly feedback: Feedback;
  readonly seconds: number;
}

/** What a question plays: chords together, scales up, intervals one note then both. */
function soundEvents(q: Question): NoteEvent[] {
  const midis = isKeysQuestion(q) ? (q.sound ?? []) : (q.sound?.midis ?? []);
  const style = isKeysQuestion(q) ? (q.target.kind === 'interval' ? 'interval' : 'chord') : (q.sound?.style ?? 'chord');
  if (style === 'scale') return scaleEvents(midis);
  if (style === 'interval') {
    const apart = chordEvents(midis, 'arpeggio');
    return [...apart, ...chordEvents(midis).map((e) => ({ ...e, at: e.at + eventsEnd(apart) }))];
  }
  return chordEvents(midis);
}

function keysStyle(q: Question): KeysStyle {
  if (isKeysQuestion(q)) return q.target.kind === 'scale' ? 'scale' : 'chord';
  return q.sound?.style === 'scale' ? 'scale' : 'chord';
}

const noOctaveChange = (): void => undefined;

/**
 * One question (SPEC §8): the prompt, any help, the keyboard or the answer
 * buttons, and then feedback with Yours, Correct and A-B. On a computer,
 * A to K play keys, 1 to 4 pick an answer, and Enter checks or moves on.
 */
export function QuestionView({ question: q, instrument, showNames, showKeyHints, wide, onNext }: QuestionViewProps) {
  const { play, noteOn, noteOff, pressed } = instrument;
  const keysQ = isKeysQuestion(q) ? q : null;
  const choiceQ = isKeysQuestion(q) ? null : q;
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set(keysQ?.start ?? []));
  const [hintShown, setHintShown] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const startedAt = useRef(performance.now());

  const playQuestion = useCallback(() => play(soundEvents(q)), [play, q]);
  const hasSound = keysQ ? keysQ.sound !== null : q.sound !== null;

  // Ear questions play as soon as they appear.
  useEffect(() => {
    if (hasSound) playQuestion();
  }, [hasSound, playQuestion]);

  function submit(answer: Answer): void {
    if (answered) return;
    const result = checkAnswer(q, answer);
    setAnswered({ answer, result, feedback: feedbackFor(q, answer, result), seconds: (performance.now() - startedAt.current) / 1000 });
    setTip(null);
  }

  function next(): void {
    if (!answered) return;
    const usedHint = keysQ !== null && (keysQ.guide === 'full' || hintShown);
    onNext(answered.result, rate(q.type, answered.result, answered.seconds, usedHint));
  }

  /** Toggle mode: tapping a key plays it and chooses it, or clears it if it was chosen. */
  function toggle(n: number): void {
    noteOn(n);
    if (!keysQ || answered) return;
    const next = new Set(selected);
    if (next.has(n)) {
      next.delete(n);
      setTip(null);
    } else {
      next.add(n);
      setTip(wrongKeyTip(keysQ, n));
    }
    setSelected(next);
  }

  const latestToggle = useRef(toggle);
  latestToggle.current = toggle;
  const stableToggle = useCallback((n: number) => latestToggle.current(n), []);
  useComputerKeys({ octave: QUESTION_OCTAVE, setOctave: noOctaveChange, noteOn: keysQ ? stableToggle : noteOn, noteOff });

  // Number keys answer, Enter checks or moves on.
  const latestKeys = useRef<(event: KeyboardEvent) => void>(() => undefined);
  latestKeys.current = (event: KeyboardEvent) => {
    if (isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (answered) next();
      else if (keysQ && selected.size > 0) submit({ kind: 'keys', midis: [...selected] });
    } else if (choiceQ && /^[1-9]$/.test(event.key)) {
      const index = Number(event.key) - 1;
      if (index < choiceQ.choices.length) submit({ kind: 'choice', index });
    }
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => latestKeys.current(event);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const board = questionKeyboard(q, answered !== null, wide ? 2 : 1);
  const showKeyboard = keysQ !== null || q.shown.length > 0;
  const style = keysStyle(q);
  const yourKeys = answered?.answer.kind === 'keys' ? new Set(answered.answer.midis) : selected;

  return (
    <>
      <section className="card question" aria-live="polite">
        <p className="question-prompt">{q.prompt}</p>
        {keysQ?.recipe && (keysQ.guide === 'full' || hintShown) && <p className="question-recipe">{keysQ.recipe}</p>}
        <div className="play-row">
          {hasSound && (
            <button type="button" className="button" onClick={playQuestion}>
              Play again
            </button>
          )}
          {keysQ?.guide === 'hint' && !hintShown && !answered && (
            <button type="button" className="button" onClick={() => setHintShown(true)}>
              Show a hint
            </button>
          )}
        </div>
        {tip && (
          <p className="question-tip" role="status">
            {tip}
          </p>
        )}
      </section>

      {showKeyboard && (
        <Keyboard
          lowestNote={board.lowestNote}
          octaves={board.octaves}
          pressed={pressed}
          marked={board.marked}
          roots={board.roots}
          selected={keysQ ? yourKeys : undefined}
          showNames={showNames && !q.hideNames}
          showKeyHints={showKeyHints}
          onNoteOn={keysQ ? toggle : noteOn}
          onNoteOff={noteOff}
        />
      )}

      {keysQ && !answered && (
        <div className="play-row question-actions">
          <button type="button" className="button primary" disabled={selected.size === 0} onClick={() => submit({ kind: 'keys', midis: [...selected] })}>
            Check
          </button>
          <button
            type="button"
            className="button"
            onClick={() => {
              setSelected(new Set(keysQ.start));
              setTip(null);
            }}
          >
            {keysQ.start.length > 0 ? 'Start again' : 'Clear'}
          </button>
        </div>
      )}

      {choiceQ && (
        <div className="choice-grid">
          {choiceQ.choices.map((choice, i) => {
            const state = answered ? (i === choiceQ.correct ? ' right' : answered.answer.kind === 'choice' && answered.answer.index === i ? ' wrong' : '') : '';
            return (
              <button key={i} type="button" className={`button choice${state}`} disabled={answered !== null} onClick={() => submit({ kind: 'choice', index: i })}>
                {choice}
              </button>
            );
          })}
        </div>
      )}

      {answered && (
        <section className={answered.result.correct ? 'card feedback right' : 'card feedback'} aria-live="polite">
          <p className="feedback-headline">{answered.feedback.headline}</p>
          {answered.feedback.lines.map((line, i) => (
            <p key={i} className="feedback-line">
              {line}
            </p>
          ))}
          <div className="play-row">
            {answered.result.correct ? (
              answered.feedback.correct.length > 0 && (
                <button type="button" className="button" onClick={() => play(keysEvents(answered.feedback.correct, style))}>
                  Hear it
                </button>
              )
            ) : (
              <>
                {answered.feedback.yours.length > 0 && (
                  <button type="button" className="button" onClick={() => play(keysEvents(answered.feedback.yours, style))}>
                    Yours
                  </button>
                )}
                {answered.feedback.correct.length > 0 && (
                  <button type="button" className="button" onClick={() => play(keysEvents(answered.feedback.correct, style))}>
                    Correct
                  </button>
                )}
                {answered.feedback.yours.length > 0 && answered.feedback.correct.length > 0 && (
                  <button type="button" className="button" onClick={() => play(abEvents(answered.feedback.yours, answered.feedback.correct, style))}>
                    A-B
                  </button>
                )}
              </>
            )}
            <button type="button" className="button primary" onClick={next}>
              Next
            </button>
          </div>
        </section>
      )}
    </>
  );
}
