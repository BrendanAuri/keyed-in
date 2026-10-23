/**
 * Chords as interval recipes from a root. Building from intervals spells every
 * note for its job in the chord: A♭ major is A♭ C E♭, and C augmented is C E G♯,
 * never A♭.
 */
import { SEMITONES_PER_OCTAVE } from '../constants';
import { intervalOf, semitones, transpose, transposePitch, type Interval } from './intervals';
import { formatNote, mod, pitchClass, spokenNote, type Note, type NoteStyle, type Pitch } from './notes';

export interface ChordType {
  readonly id: string;
  /** In words, for beginners: "minor", "dominant 7th". */
  readonly name: string;
  /** What follows the root in a chord symbol: "m" in Cm, nothing in C. */
  readonly symbol: string;
  readonly intervals: readonly Interval[];
  /** Roman numerals are upper case for chords with a major 3rd (or none) and lower case for a minor 3rd. */
  readonly numeralCase: 'upper' | 'lower';
  /** What follows a Roman numeral: "°" in vii°, "7" in V7. */
  readonly numeralSuffix: string;
}

type ChordRow = [id: string, name: string, symbol: string, intervals: string, numeralCase: 'upper' | 'lower', numeralSuffix: string];

/**
 * Most common first: when several names fit the same notes, the earlier type
 * is listed first.
 */
const CHORD_ROWS: readonly ChordRow[] = [
  ['major', 'major', '', 'P1 M3 P5', 'upper', ''],
  ['minor', 'minor', 'm', 'P1 m3 P5', 'lower', ''],
  ['dominant7', 'dominant 7th', '7', 'P1 M3 P5 m7', 'upper', '7'],
  ['minor7', 'minor 7th', 'm7', 'P1 m3 P5 m7', 'lower', '7'],
  ['major7', 'major 7th', 'maj7', 'P1 M3 P5 M7', 'upper', 'maj7'],
  ['power', 'power chord', '5', 'P1 P5', 'upper', '5'],
  ['sus4', 'suspended 4th', 'sus4', 'P1 P4 P5', 'upper', 'sus4'],
  ['sus2', 'suspended 2nd', 'sus2', 'P1 M2 P5', 'upper', 'sus2'],
  ['diminished', 'diminished', 'dim', 'P1 m3 d5', 'lower', '°'],
  ['augmented', 'augmented', 'aug', 'P1 M3 A5', 'upper', '+'],
  ['major6', 'major 6th', '6', 'P1 M3 P5 M6', 'upper', '6'],
  ['minor6', 'minor 6th', 'm6', 'P1 m3 P5 M6', 'lower', '6'],
  ['add9', 'add 9', 'add9', 'P1 M3 P5 M9', 'upper', 'add9'],
  ['minorAdd9', 'minor add 9', 'madd9', 'P1 m3 P5 M9', 'lower', 'add9'],
  ['halfDiminished7', 'half-diminished 7th', 'm7♭5', 'P1 m3 d5 m7', 'lower', 'ø7'],
  ['diminished7', 'diminished 7th', 'dim7', 'P1 m3 d5 d7', 'lower', '°7'],
  ['dominant7sus4', '7th, suspended 4th', '7sus4', 'P1 P4 P5 m7', 'upper', '7sus4'],
  ['dominant9', 'dominant 9th', '9', 'P1 M3 P5 m7 M9', 'upper', '9'],
  ['major9', 'major 9th', 'maj9', 'P1 M3 P5 M7 M9', 'upper', 'maj9'],
  ['minor9', 'minor 9th', 'm9', 'P1 m3 P5 m7 M9', 'lower', '9'],
  ['minorMajor7', 'minor-major 7th', 'm(maj7)', 'P1 m3 P5 M7', 'lower', '(maj7)'],
  ['augmentedMajor7', 'augmented major 7th', 'maj7♯5', 'P1 M3 A5 M7', 'upper', '+maj7'],
];

export const CHORD_TYPES: readonly ChordType[] = CHORD_ROWS.map(([id, name, symbol, intervals, numeralCase, numeralSuffix]) => ({
  id,
  name,
  symbol,
  intervals: intervals.split(' ').map(intervalOf),
  numeralCase,
  numeralSuffix,
}));

const BY_ID: ReadonlyMap<string, ChordType> = new Map(CHORD_TYPES.map((type) => [type.id, type]));

export function getChordType(id: string): ChordType | undefined {
  return BY_ID.get(id);
}

/** Like `getChordType`, for ids written into the code or content. */
export function chordTypeOf(id: string): ChordType {
  const type = BY_ID.get(id);
  if (!type) throw new Error(`Unknown chord type: "${id}"`);
  return type;
}

/** The chord's notes from the root up, spelled: C minor is C E♭ G. */
export function buildChord(root: Note, typeId: string): Note[] {
  return chordTypeOf(typeId).intervals.map((i) => transpose(root, i));
}

/** The pitch classes a chord type covers, measured up from its root (0 to 11, so a 9th is 2). */
export function chordSemitones(type: ChordType): number[] {
  return type.intervals.map((i) => mod(semitones(i), SEMITONES_PER_OCTAVE));
}

export function chordPitchClasses(root: Note, typeId: string): number[] {
  return buildChord(root, typeId).map(pitchClass);
}

/** "C♯m7", or "C♯m7/E" with a different bass note. ASCII style gives "C#m7/E". */
export function chordSymbol(root: Note, typeId: string, bass: Note | null = null, style: NoteStyle = 'unicode'): string {
  const symbol = chordTypeOf(typeId).symbol;
  const suffix = style === 'unicode' ? symbol : symbol.replaceAll('♭', 'b').replaceAll('♯', '#');
  return `${formatNote(root, style)}${suffix}${bass ? `/${formatNote(bass, style)}` : ''}`;
}

/** "C♯ minor 7th", "C major". */
export function chordName(root: Note, typeId: string): string {
  return `${formatNote(root)} ${chordTypeOf(typeId).name}`;
}

/** "C sharp minor 7th", for reading aloud. */
export function spokenChordName(root: Note, typeId: string): string {
  return `${spokenNote(root)} ${chordTypeOf(typeId).name}`;
}

const INVERSION_NAMES = ['root position', 'first inversion', 'second inversion', 'third inversion', 'fourth inversion'] as const;

/** "root position", "first inversion" and so on. */
export function inversionName(inversion: number): string {
  return INVERSION_NAMES[inversion] ?? `inversion ${inversion}`;
}

/**
 * The chord as pitches, close together going up from the root. An inversion
 * moves that many of the lowest notes up an octave: C major in first inversion
 * from C4 is E4 G4 C5.
 */
export function voiceChord(root: Pitch, typeId: string, inversion = 0): Pitch[] {
  const pitches = chordTypeOf(typeId).intervals.map((i) => transposePitch(root, i));
  const octave = intervalOf('P8');
  const moved = pitches.slice(0, inversion).map((p) => transposePitch(p, octave));
  return [...pitches.slice(inversion), ...moved];
}
