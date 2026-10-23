/**
 * Helpers for what a question asks for: its notes, its name in words, where
 * it sits on the keyboard, and the recipe for building it, in plain words for
 * beginners (SPEC §2: no term before it's been shown).
 */
import { SEMITONES_PER_OCTAVE } from '../constants';
import { buildChord, chordName, voiceChord } from '../theory/chords';
import { intervalName, intervalOf, semitones, transpose, transposePitch } from '../theory/intervals';
import { formatNote, midi, noteFromPitchClass, parseNote, pitch, pitchClass, type Letter, type Note, type Pitch } from '../theory/notes';
import { scaleName, scaleSteps } from '../theory/scales';
import type { Target } from './types';

/** The twelve roots questions use unless told otherwise, spelled the usual way. */
export const COMMON_ROOTS: readonly string[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Parses a root from content; content is checked, so a typo is a bug. */
export function rootNote(text: string): Note {
  const n = parseNote(text);
  if (!n) throw new Error(`Not a root: "${text}"`);
  return n;
}

export function targetNotes(t: Target): Note[] {
  switch (t.kind) {
    case 'note':
      return [t.note];
    case 'chord':
      return buildChord(t.root, t.chordTypeId);
    case 'interval':
      return [t.root, transpose(t.root, intervalOf(t.interval))];
    case 'scale':
      return scaleSteps(t.root, t.scaleTypeId).map((s) => s.note);
  }
}

/** The pitch classes to match, lowest first, with no repeats. */
export function targetPitchClasses(t: Target): number[] {
  return [...new Set(targetNotes(t).map(pitchClass))].sort((a, b) => a - b);
}

/** "E♭", "C minor", "a major 3rd above C", "the D major scale". */
export function targetName(t: Target): string {
  switch (t.kind) {
    case 'note':
      return formatNote(t.note);
    case 'chord':
      return chordName(t.root, t.chordTypeId);
    case 'interval':
      return `a ${intervalName(intervalOf(t.interval))} above ${formatNote(t.root)}`;
    case 'scale':
      return `the ${scaleName(t.root, t.scaleTypeId)} scale`;
  }
}

/** A root's pitch in an octave, moved up if its spelling puts it below that octave's C (C♭ is B). */
function rootPitch(root: Note, octave: number): Pitch {
  const p = pitch(root.letter, root.accidental, octave);
  return midi(p) < midi(pitch('C', 0, octave)) ? pitch(root.letter, root.accidental, octave + 1) : p;
}

/** The target as keys (MIDI), lowest first, starting in `octave`. Scales go up to the octave. */
export function voiceTarget(t: Target, octave: number): number[] {
  switch (t.kind) {
    case 'note':
      return [midi(rootPitch(t.note, octave))];
    case 'chord':
      return voiceChord(rootPitch(t.root, octave), t.chordTypeId).map(midi);
    case 'interval': {
      const low = rootPitch(t.root, octave);
      return [midi(low), midi(transposePitch(low, intervalOf(t.interval)))];
    }
    case 'scale': {
      const low = rootPitch(t.root, octave);
      return [...scaleSteps(t.root, t.scaleTypeId).map((s) => midi(transposePitch(low, s.interval))), midi(low) + SEMITONES_PER_OCTAVE];
    }
  }
}

/** "C", "C and E", "C, E♭ and G". */
export function listNotes(notes: readonly Note[]): string {
  const names = notes.map((n) => formatNote(n));
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] ?? ''}`;
}

const WHITE_KEY_PLACES: Readonly<Record<Letter, string>> = {
  C: 'the white key just left of the two black keys',
  D: 'the white key between the two black keys',
  E: 'the white key just right of the two black keys',
  F: 'the white key just left of the three black keys',
  G: 'the white key between the first two of the three black keys',
  A: 'the white key between the last two of the three black keys',
  B: 'the white key just right of the three black keys',
};

/** Where a note is on the keyboard, for beginners: "D♭ is the black key just left of D." */
export function whereIs(n: Note): string {
  const name = formatNote(n);
  if (n.accidental === 0) return `${name} is ${WHITE_KEY_PLACES[n.letter]}.`;
  const sameKey = noteFromPitchClass(pitchClass(n), n.accidental > 0 ? 'sharp' : 'flat');
  if (Math.abs(n.accidental) === 1 && sameKey.accidental !== 0) {
    const side = n.accidental > 0 ? 'right' : 'left';
    return `${name} is the black key just ${side} of ${n.letter}.`;
  }
  // E♯, C♭ and double sharps or flats land on a key with a plainer name.
  return `${name} is the same key as ${formatNote(sameKey)}.`;
}

function stepWord(size: number): string {
  if (size === 1) return 'half';
  if (size === 2) return 'whole';
  return `${size} keys`;
}

/** The target's recipe in plain words, counting keys rather than naming intervals. */
export function recipe(t: Target): string {
  switch (t.kind) {
    case 'note':
      return whereIs(t.note);
    case 'chord': {
      const sizes = buildChord(t.root, t.chordTypeId).map((n, i, all) => {
        const below = all[i - 1];
        return below ? semitonesBetween(below, n) : 0;
      });
      const [, first, ...rest] = sizes;
      const more = rest.map((s) => `then ${s} more`).join(', ');
      return `Start on ${formatNote(t.root)}. Count up ${first ?? 0} keys to the next note${more ? `, ${more}` : ''}. Count every key, black and white.`;
    }
    case 'interval':
      return `Start on ${formatNote(t.root)} and count up ${semitones(intervalOf(t.interval))} keys. Count every key, black and white.`;
    case 'scale': {
      const steps = scaleSteps(t.root, t.scaleTypeId).map((s) => semitones(s.interval));
      const gaps = [...steps.slice(1), SEMITONES_PER_OCTAVE].map((s, i) => s - (steps[i] ?? 0));
      return `Start on ${formatNote(t.root)}, then go up in steps: ${gaps.map(stepWord).join(', ')}. A half step is the very next key; a whole step skips one.`;
    }
  }
}

/** Semitones from one note up to the next note of that name. */
function semitonesBetween(low: Note, high: Note): number {
  return (pitchClass(high) - pitchClass(low) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE || SEMITONES_PER_OCTAVE;
}

/** "3rd", "5th", "9th": for talking about a chord's notes. */
export function ordinal(n: number): string {
  const last = n % 10;
  if (n >= 11 && n <= 13) return `${n}th`;
  return `${n}${last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'}`;
}
