/**
 * The question screen's keyboard, apart from React: which keys show, which are
 * lit and what they're labelled, before and after answering.
 */
import { KEYBOARD_MAX_OCTAVES, QUESTION_OCTAVE, SEMITONES_PER_OCTAVE } from '../constants';
import { targetNotes, voiceTarget } from '../exercises/targets';
import { isKeysQuestion, type Question } from '../exercises/types';
import { formatNote, mod, pitchClass } from '../theory/notes';
import { cAtOrBelow, octavesToShow } from './keyboardLayout';
import { lowestNoteForOctave } from './keyboardMap';

export interface QuestionKeyboard {
  readonly lowestNote: number;
  readonly octaves: number;
  /** Lit keys and their labels; an empty label lights a key without naming it. */
  readonly marked: ReadonlyMap<number, string>;
  readonly roots: ReadonlySet<number>;
}

/** Keys lit by the question, labelled with their spelled names unless the names would give the answer away. */
function shownKeys(q: Question): Map<number, string> {
  const answer = isKeysQuestion(q) ? q.target : q.choiceTargets?.[q.correct];
  const spelled = answer ? targetNotes(answer) : [];
  return new Map(
    q.shown.map((m) => {
      const n = spelled.find((s) => pitchClass(s) === mod(m, SEMITONES_PER_OCTAVE));
      return [m, q.hideNames || !n ? '' : formatNote(n)] as const;
    }),
  );
}

/**
 * Before answering, the keys the question lights; after, the right answer, so
 * it can be seen next to yours. The keyboard stretches to fit them all.
 */
export function questionKeyboard(q: Question, answered: boolean, minimumOctaves: number): QuestionKeyboard {
  let marked = shownKeys(q);
  let roots = new Set<number>(isKeysQuestion(q) ? q.shown : []);
  if (answered && isKeysQuestion(q)) {
    const notes = targetNotes(q.target);
    const keys = q.sound ?? voiceTarget(q.target, QUESTION_OCTAVE);
    marked = new Map(
      keys.map((m) => {
        const n = notes.find((s) => pitchClass(s) === mod(m, SEMITONES_PER_OCTAVE));
        return [m, n ? formatNote(n) : ''] as const;
      }),
    );
    roots = new Set(keys.slice(0, 1));
  }
  const involved = [...marked.keys(), ...(isKeysQuestion(q) ? [...q.start, ...voiceTarget(q.target, QUESTION_OCTAVE)] : [])];
  const lowestNote = Math.min(lowestNoteForOctave(QUESTION_OCTAVE), cAtOrBelow(Math.min(...involved, lowestNoteForOctave(QUESTION_OCTAVE))));
  const octaves = octavesToShow(lowestNote, Math.max(...involved, lowestNote), minimumOctaves, KEYBOARD_MAX_OCTAVES);
  return { lowestNote, octaves, marked, roots };
}
