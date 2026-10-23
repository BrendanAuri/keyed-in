/**
 * Scales and modes as interval recipes from a root. Seven-note scales use each
 * letter once, so F major has B♭, not A♯. The blues scales' blue notes are the
 * exception (SPEC §19): a ♭5 or ♭3 that would need a double flat is written as
 * the sharp of the note below, so E♭ blues has A rather than B♭♭.
 */
import { LETTERS_PER_OCTAVE } from '../constants';
import { degreeLabel, intervalBetween, intervalOf, transpose, type Interval } from './intervals';
import { formatNote, letterAt, letterIndex, pitchClass, spellWithLetter, type Note, type NoteStyle } from './notes';

export interface ScaleType {
  readonly id: string;
  /** "natural minor", "Dorian". */
  readonly name: string;
  /** Other names for the same scale: natural minor is also the Aeolian mode. */
  readonly aliases: readonly string[];
  readonly intervals: readonly Interval[];
  /** How often it turns up, 1 (most) to 3. The Scale Finder lists common scales first. */
  readonly commonness: 1 | 2 | 3;
  /** Respell double flats as the sharp of the note below (the blues scales' blue notes). */
  readonly avoidDoubleFlats: boolean;
}

export interface ScaleStep {
  readonly note: Note;
  /** From the root to this note, as spelled: E♭ blues's A is an augmented 4th. */
  readonly interval: Interval;
}

type ScaleRow = [id: string, name: string, aliases: readonly string[], intervals: string, commonness: 1 | 2 | 3, avoidDoubleFlats?: boolean];

/** Most common first; within the same commonness, this order breaks ties. */
const SCALE_ROWS: readonly ScaleRow[] = [
  ['major', 'major', ['Ionian'], 'P1 M2 M3 P4 P5 M6 M7', 1],
  ['naturalMinor', 'natural minor', ['Aeolian', 'minor'], 'P1 M2 m3 P4 P5 m6 m7', 1],
  ['majorPentatonic', 'major pentatonic', [], 'P1 M2 M3 P5 M6', 2],
  ['minorPentatonic', 'minor pentatonic', [], 'P1 m3 P4 P5 m7', 2],
  ['blues', 'blues', ['minor blues'], 'P1 m3 P4 d5 P5 m7', 2, true],
  ['dorian', 'Dorian', [], 'P1 M2 m3 P4 P5 M6 m7', 3],
  ['mixolydian', 'Mixolydian', [], 'P1 M2 M3 P4 P5 M6 m7', 3],
  ['harmonicMinor', 'harmonic minor', [], 'P1 M2 m3 P4 P5 m6 M7', 3],
  ['phrygian', 'Phrygian', [], 'P1 m2 m3 P4 P5 m6 m7', 3],
  ['lydian', 'Lydian', [], 'P1 M2 M3 A4 P5 M6 M7', 3],
  ['melodicMinor', 'melodic minor', ['jazz minor'], 'P1 M2 m3 P4 P5 M6 M7', 3],
  ['majorBlues', 'major blues', [], 'P1 M2 m3 M3 P5 M6', 3, true],
  ['locrian', 'Locrian', [], 'P1 m2 m3 P4 d5 m6 m7', 3],
];

export const SCALE_TYPES: readonly ScaleType[] = SCALE_ROWS.map(([id, name, aliases, intervals, commonness, avoidDoubleFlats]) => ({
  id,
  name,
  aliases,
  intervals: intervals.split(' ').map(intervalOf),
  commonness,
  avoidDoubleFlats: avoidDoubleFlats ?? false,
}));

const BY_ID: ReadonlyMap<string, ScaleType> = new Map(SCALE_TYPES.map((type) => [type.id, type]));

export function getScaleType(id: string): ScaleType | undefined {
  return BY_ID.get(id);
}

/** Like `getScaleType`, for ids written into the code or content. */
export function scaleTypeOf(id: string): ScaleType {
  const type = BY_ID.get(id);
  if (!type) throw new Error(`Unknown scale type: "${id}"`);
  return type;
}

/** The scale's notes from the root up, with the interval to each as it's spelled. */
export function scaleSteps(root: Note, typeId: string): ScaleStep[] {
  const type = scaleTypeOf(typeId);
  return type.intervals.map((interval) => {
    const note = transpose(root, interval);
    if (!type.avoidDoubleFlats || note.accidental > -2) return { note, interval };
    const respelled = spellWithLetter(pitchClass(note), letterAt(letterIndex(note.letter) - 1));
    return { note: respelled, interval: intervalBetween(root, respelled) ?? interval };
  });
}

/** The scale's notes from the root up, spelled: A natural minor is A B C D E F G. */
export function buildScale(root: Note, typeId: string): Note[] {
  return scaleSteps(root, typeId).map((step) => step.note);
}

export function scalePitchClasses(root: Note, typeId: string): number[] {
  return buildScale(root, typeId).map(pitchClass);
}

/** "A natural minor", "D Dorian". */
export function scaleName(root: Note, typeId: string): string {
  return `${formatNote(root)} ${scaleTypeOf(typeId).name}`;
}

/**
 * Each note as a degree of the major scale: natural minor is 1 2 ♭3 4 5 ♭6 ♭7.
 * The same for every root; for one root's spelling (E♭ blues's ♯4), use `scaleSteps`.
 */
export function scaleDegreeLabels(typeId: string, style: NoteStyle = 'unicode'): string[] {
  return scaleTypeOf(typeId).intervals.map((i) => degreeLabel(i, style));
}

/** Seven notes on seven different letters, so chords can be built by stacking every other note. */
export function isHeptatonic(typeId: string): boolean {
  const letters = new Set(buildScale({ letter: 'C', accidental: 0 }, typeId).map((n) => letterIndex(n.letter)));
  return scaleTypeOf(typeId).intervals.length === LETTERS_PER_OCTAVE && letters.size === LETTERS_PER_OCTAVE;
}
