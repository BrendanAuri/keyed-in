/**
 * The shapes every question type shares (SPEC §8). A question is plain data,
 * made from a spec and a seeded RNG, so any question can be made again from
 * its seed.
 */
import type { Note } from '../theory/notes';

export type ExerciseType = 'spell' | 'change' | 'fix' | 'echo' | 'identify' | 'hearQuality' | 'fact';

/** What a question is about. Not every type takes every one (see catalogue.ts). */
export type About = 'notes' | 'chords' | 'intervals' | 'scales' | 'facts';

/** How much help a keyboard question gives: the recipe shown, behind a Hint button, or not at all. */
export type Guide = 'full' | 'hint' | 'none';

/** The facts `fact` questions ask about. */
export type FactKind = 'keySignature' | 'relativeMinor' | 'scaleDegree' | 'halfStep' | 'wholeStep';

/** What to make a question from: a pack level or the Drill picker writes one of these. */
export interface QuestionSpec {
  readonly type: ExerciseType;
  readonly about: About;
  /** Which chord types, intervals ("M3"), scale types or fact kinds; ignored for notes. */
  readonly set: readonly string[];
  /** Roots to choose from, as ASCII note names; every common root when left out. */
  readonly roots?: readonly string[];
  readonly guide?: Guide;
}

/** Something to build, name or hear. */
export type Target =
  | { readonly kind: 'note'; readonly note: Note }
  | { readonly kind: 'chord'; readonly root: Note; readonly chordTypeId: string }
  /** `interval` is written like "M3". */
  | { readonly kind: 'interval'; readonly root: Note; readonly interval: string }
  | { readonly kind: 'scale'; readonly root: Note; readonly scaleTypeId: string };

/** Answered by lighting keys on the keyboard, then Check. */
export interface KeysQuestion {
  readonly type: 'spell' | 'change' | 'fix' | 'echo';
  /** What the review queue will schedule: "spell:minor@F#", "echo:minor". */
  readonly item: string;
  readonly prompt: string;
  readonly target: Target;
  /** Keys lit as part of the question, MIDI. Keyboard questions light nothing: what's given starts chosen instead. */
  readonly shown: readonly number[];
  /**
   * Keys already chosen at the start: the root with full help, the given note
   * in echo, and the chord to edit in change and fix.
   */
  readonly start: readonly number[];
  readonly guide: Guide;
  /** The recipe in plain words: shown at once (full help), behind Hint, or null. */
  readonly recipe: string | null;
  /** Notes to hear (echo), MIDI. */
  readonly sound: readonly number[] | null;
  /** Hide note names on the keys, when they'd give the answer away. */
  readonly hideNames: boolean;
}

/** Answered with one of a few buttons. */
export interface ChoiceQuestion {
  readonly type: 'identify' | 'hearQuality' | 'fact';
  readonly item: string;
  readonly prompt: string;
  readonly choices: readonly string[];
  /** Index of the right choice. */
  readonly correct: number;
  /** What each choice stands for, so a wrong pick can be compared and heard; null for facts. */
  readonly choiceTargets: readonly Target[] | null;
  /** Keys lit as the question (identify), MIDI. */
  readonly shown: readonly number[];
  /** Notes heard as the question (hearQuality), MIDI, and how to play them. */
  readonly sound: { readonly midis: readonly number[]; readonly style: 'chord' | 'interval' | 'scale' } | null;
  /** The root the sounds are on, MIDI, so choices can be played on it too. */
  readonly rootMidi: number | null;
  /** Said after any answer (facts). */
  readonly explanation: string | null;
  readonly hideNames: boolean;
}

export type Question = KeysQuestion | ChoiceQuestion;

export type Answer = { readonly kind: 'keys'; readonly midis: readonly number[] } | { readonly kind: 'choice'; readonly index: number };

export interface Result {
  readonly correct: boolean;
  /** Some of the right notes and none of the wrong ones, like two of three. Counts as wrong for review. */
  readonly partial: boolean;
}

export interface Feedback {
  readonly headline: string;
  readonly lines: readonly string[];
  /** Your answer and the right one as notes (MIDI), for Yours, Correct and A-B. Empty when there's nothing to hear. */
  readonly yours: readonly number[];
  readonly correct: readonly number[];
}

export function isKeysQuestion(q: Question): q is KeysQuestion {
  return q.type === 'spell' || q.type === 'change' || q.type === 'fix' || q.type === 'echo';
}
