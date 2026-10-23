/**
 * Explore's logic (SPEC §13), apart from React: what to call whatever's being
 * played, and where a chord or scale lights up on the keyboard.
 */
import { SEMITONES_PER_OCTAVE } from '../constants';
import { buildChord, chordName, chordTypeOf, inversionName, voiceChord } from '../theory/chords';
import { degreeLabel, intervalName, intervalOf, semitones, transpose, transposePitch } from '../theory/intervals';
import type { KeyMode } from '../theory/keys';
import { describeNotes } from '../theory/naming';
import { bothSpellings, formatNote, midi, mod, noteFromPitchClass, pitch, pitchClass, type Note, type Pitch } from '../theory/notes';
import { scaleSteps } from '../theory/scales';

export type Selection =
  | { readonly kind: 'chord'; readonly root: Note; readonly chordTypeId: string; readonly inversion: number }
  | { readonly kind: 'scale'; readonly root: Note; readonly scaleTypeId: string };

export interface Described {
  /** "C major", "Major 3rd", "C♯ / D♭". */
  readonly title: string;
  /** "C/E · first inversion · also Am7/C". */
  readonly detail: string;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** What to call the keys being played (MIDI numbers), in plain words. Null for nothing. */
export function describePlayed(midis: readonly number[]): Described | null {
  const description = describeNotes(midis);
  switch (description.kind) {
    case 'empty':
      return null;
    case 'note': {
      const octaves = new Set(midis).size;
      return {
        title: bothSpellings(pitchClass(description.note)),
        detail: octaves > 1 ? `The same note in ${octaves} octaves` : 'One note',
      };
    }
    case 'interval': {
      const low = noteFromPitchClass(Math.min(...midis), 'flat');
      const high = transpose(low, description.interval);
      const halfSteps = semitones(description.interval);
      const power = description.chords[0];
      const parts = [
        `${formatNote(low)} up to ${formatNote(high)}`,
        `${halfSteps} half ${halfSteps === 1 ? 'step' : 'steps'}`,
        ...(power ? [`also ${power.symbol}, a power chord`] : []),
      ];
      return { title: capitalise(intervalName(description.interval)), detail: parts.join(' · ') };
    }
    case 'chord': {
      const [best, ...others] = description.chords;
      if (!best) {
        const pcs = [...new Set(midis.map((m) => mod(m, SEMITONES_PER_OCTAVE)))].sort((a, b) => a - b);
        return { title: 'No chord name', detail: pcs.map((pc) => formatNote(noteFromPitchClass(pc, 'flat'))).join(', ') };
      }
      const parts = [best.symbol];
      if (best.bass) {
        const notes = buildChord(best.root, best.chordTypeId).map(pitchClass);
        parts.push(inversionName(notes.indexOf(pitchClass(best.bass))));
      }
      if (others.length > 0) parts.push(`also ${others.map((m) => m.symbol).join(', ')}`);
      return { title: chordName(best.root, best.chordTypeId), detail: parts.join(' · ') };
    }
  }
}

/**
 * The selection's pitches, lowest first, starting from the keyboard's lowest
 * C in `octave`. A root spelled below that C (C♭ is B) moves up an octave.
 */
export function selectionPitches(selection: Selection, octave: number): Pitch[] {
  const lowestC = midi(pitch('C', 0, octave));
  const atOctave = pitch(selection.root.letter, selection.root.accidental, octave);
  const root = midi(atOctave) < lowestC ? pitch(atOctave.letter, atOctave.accidental, octave + 1) : atOctave;
  if (selection.kind === 'chord') return voiceChord(root, selection.chordTypeId, selection.inversion);
  const steps = scaleSteps(selection.root, selection.scaleTypeId).map((step) => transposePitch(root, step.interval));
  return [...steps, transposePitch(root, intervalOf('P8'))];
}

/** Each note of the selection with its degree, in recipe order: C (1), E♭ (♭3), G (5). */
export function selectionDegrees(selection: Selection): { readonly note: string; readonly degree: string }[] {
  const intervals =
    selection.kind === 'chord'
      ? chordTypeOf(selection.chordTypeId).intervals
      : scaleSteps(selection.root, selection.scaleTypeId).map((step) => step.interval);
  return intervals.map((i) => ({ note: formatNote(transpose(selection.root, i)), degree: degreeLabel(i) }));
}

/** The key a scale sets, for playing its cadence: major for major, minor for the minors. Null for the rest. */
export function scaleKeyMode(scaleTypeId: string): KeyMode | null {
  if (scaleTypeId === 'major') return 'major';
  if (scaleTypeId === 'naturalMinor' || scaleTypeId === 'harmonicMinor' || scaleTypeId === 'melodicMinor') return 'minor';
  return null;
}
