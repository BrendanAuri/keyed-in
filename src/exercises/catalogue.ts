/**
 * What each question type is called, what it can be about, and what can go in
 * its set: the Drill picker builds its choices from this, and pack checks
 * (Milestone 5) can test content against it.
 */
import { CHORD_TYPES } from '../theory/chords';
import { intervalName, intervalOf } from '../theory/intervals';
import { SCALE_TYPES } from '../theory/scales';
import { CHANGE_PAIRS } from './keys';
import type { About, ExerciseType, FactKind } from './types';

export interface ExerciseInfo {
  readonly type: ExerciseType;
  /** In plain words, for the Drill picker. */
  readonly name: string;
  readonly description: string;
  readonly abouts: readonly About[];
  /** Whether it takes a level of help (full, hint or none). */
  readonly guided: boolean;
}

export const EXERCISES: readonly ExerciseInfo[] = [
  { type: 'spell', name: 'Build it', description: 'See a name, tap its notes on the keyboard.', abouts: ['chords', 'notes', 'scales'], guided: true },
  { type: 'identify', name: 'Name it', description: 'See keys lit up, say what they are.', abouts: ['chords', 'notes', 'intervals'], guided: false },
  { type: 'change', name: 'Change one note', description: 'Turn one chord into another by moving a single note.', abouts: ['chords'], guided: true },
  { type: 'fix', name: 'Fix it', description: 'One note is wrong: find it and fix it.', abouts: ['chords', 'scales'], guided: true },
  { type: 'hearQuality', name: 'Hear it', description: 'Listen and say what kind of chord, interval or scale it is.', abouts: ['chords', 'intervals', 'scales'], guided: false },
  { type: 'echo', name: 'Play it back', description: 'Hear a chord or interval, then play it on the keyboard.', abouts: ['chords', 'intervals'], guided: false },
  { type: 'fact', name: 'Facts', description: 'Key signatures, relative minors, steps and the notes of a key.', abouts: ['facts'], guided: false },
];

/** Intervals within an octave, smallest first, as questions use them. */
export const INTERVALS: readonly string[] = ['m2', 'M2', 'm3', 'M3', 'P4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];

export const FACTS: readonly { readonly id: FactKind; readonly name: string }[] = [
  { id: 'halfStep', name: 'Half steps' },
  { id: 'wholeStep', name: 'Whole steps' },
  { id: 'scaleDegree', name: 'Notes of a major key' },
  { id: 'keySignature', name: 'Key signatures' },
  { id: 'relativeMinor', name: 'Relative minors' },
];

export interface SetOption {
  readonly id: string;
  readonly name: string;
}

/** What a question set can hold, for a type and what it's about. Empty for notes, which have no set. */
export function setOptions(type: ExerciseType, about: About): SetOption[] {
  switch (about) {
    case 'notes':
      return [];
    case 'chords': {
      // Change questions need chords with a one-note partner.
      const usable = type === 'change' ? new Set(CHANGE_PAIRS.flat()) : null;
      return CHORD_TYPES.filter((t) => !usable || usable.has(t.id)).map((t) => ({ id: t.id, name: t.name }));
    }
    case 'intervals':
      return INTERVALS.map((id) => ({ id, name: intervalName(intervalOf(id)) }));
    case 'scales':
      return SCALE_TYPES.map((t) => ({ id: t.id, name: t.name }));
    case 'facts':
      return FACTS.map((f) => ({ id: f.id, name: f.name }));
  }
}

/** A sensible first set for the picker: the easiest few, for beginners. */
export function defaultSet(about: About): string[] {
  switch (about) {
    case 'notes':
      return [];
    case 'chords':
      return ['major', 'minor'];
    case 'intervals':
      return ['M3', 'P5', 'P8'];
    case 'scales':
      return ['major', 'naturalMinor'];
    case 'facts':
      return ['halfStep', 'wholeStep'];
  }
}
