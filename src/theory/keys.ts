/**
 * Keys: signatures, the circle of fifths, relative and parallel keys, and the
 * chords built from a scale's own notes.
 */
import { LETTERS_PER_OCTAVE, SEMITONES_PER_OCTAVE } from '../constants';
import { CHORD_TYPES } from './chords';
import { formatInterval, intervalBetween, intervalOf, transpose } from './intervals';
import { formatNote, mod, note, type Letter, type Note } from './notes';
import { formatNumeral, numeralFor } from './numerals';
import { buildScale, isHeptatonic } from './scales';

export type KeyMode = 'major' | 'minor';

export interface Key {
  readonly tonic: Note;
  readonly mode: KeyMode;
}

/** Letters in the order their sharps appear in a key signature; flats go the other way. */
const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER: readonly Letter[] = [...SHARP_ORDER].reverse();
/**
 * A minor key shares its signature with the major key a minor 3rd above it
 * (A minor and C major), which is 3 steps along the line of fifths.
 */
const MINOR_FIFTHS_SHIFT = 3;

export function key(tonic: Note, mode: KeyMode): Key {
  return { tonic, mode };
}

/** The scale a key's notes come from. */
export function keyScaleId(k: Key): string {
  return k.mode === 'major' ? 'major' : 'naturalMinor';
}

/** "E♭ major", "C♯ minor". */
export function keyName(k: Key): string {
  return `${formatNote(k.tonic)} ${k.mode}`;
}

/**
 * Where a note sits on the line of fifths, counting from C: G is 1, D is 2,
 * F is −1, B♭ is −2. Each sharp adds 7 and each flat takes 7 away.
 */
export function fifthsFromC(n: Note): number {
  return SHARP_ORDER.indexOf(n.letter) - 1 + LETTERS_PER_OCTAVE * n.accidental;
}

/** The note a number of fifths from C: 2 is D, −3 is E♭, 7 is C♯. */
export function noteFromFifths(fifths: number): Note {
  const step = fifths + 1;
  return note(SHARP_ORDER[mod(step, LETTERS_PER_OCTAVE)] ?? 'C', Math.floor(step / LETTERS_PER_OCTAVE));
}

/** Sharps in the key signature as a positive number, flats as a negative one: E♭ major is −3. */
export function keySignature(k: Key): number {
  return fifthsFromC(k.tonic) - (k.mode === 'minor' ? MINOR_FIFTHS_SHIFT : 0);
}

/** The sharps or flats in the key signature, in the order they're written: D major is F♯ C♯. */
export function keySignatureNotes(k: Key): Note[] {
  const count = keySignature(k);
  if (count >= 0) return accidentalsFrom(SHARP_ORDER, count, 1);
  return accidentalsFrom(FLAT_ORDER, -count, -1);
}

/** Past seven, the letters come round again with a second sharp or flat (as in G♯ major's F♯♯). */
function accidentalsFrom(order: readonly Letter[], count: number, sign: number): Note[] {
  return Array.from({ length: count }, (_, i) => note(order[i % LETTERS_PER_OCTAVE] ?? 'C', sign * (Math.floor(i / LETTERS_PER_OCTAVE) + 1)));
}

/** The key with the same notes and a different home: C major and A minor. */
export function relativeKey(k: Key): Key {
  return k.mode === 'major' ? key(transpose(k.tonic, intervalOf('M6')), 'minor') : key(transpose(k.tonic, intervalOf('m3')), 'major');
}

/** The key with the same home and the other mode: C major and C minor. */
export function parallelKey(k: Key): Key {
  return key(k.tonic, k.mode === 'major' ? 'minor' : 'major');
}

export interface CircleStep {
  readonly major: Key;
  readonly minor: Key;
  /** The same keys spelled the other way, at the bottom of the circle: F♯ and G♭ major. */
  readonly alternative: { readonly major: Key; readonly minor: Key } | null;
}

/**
 * Circle positions whose keys are often spelled the other way, and how far along
 * the line of fifths that spelling is: twelve fifths lands on the same key, so
 * B (5 sharps) is also C♭ (7 flats).
 */
const ALTERNATIVES: Readonly<Record<number, number>> = { 5: -SEMITONES_PER_OCTAVE, 6: -SEMITONES_PER_OCTAVE, 7: SEMITONES_PER_OCTAVE };

/**
 * The circle of fifths, clockwise from C at the top: C, G, D, A, E, B, F♯, D♭,
 * A♭, E♭, B♭, F. Each step adds a sharp or takes away a flat.
 */
export function circleOfFifths(): CircleStep[] {
  // Twelve keys, one for each pitch class.
  const circle = SEMITONES_PER_OCTAVE;
  return Array.from({ length: circle }, (_, position) => {
    const fifths = position <= circle / 2 ? position : position - circle;
    const at = (f: number) => ({ major: key(noteFromFifths(f), 'major'), minor: key(noteFromFifths(f + MINOR_FIFTHS_SHIFT), 'minor') });
    const shift = ALTERNATIVES[position];
    return { ...at(fifths), alternative: shift === undefined ? null : at(fifths + shift) };
  });
}

export interface ScaleChord {
  /** 1 to 7. */
  readonly degree: number;
  readonly root: Note;
  readonly notes: readonly Note[];
  /** Null if the stacked notes aren't a chord type this app knows. */
  readonly chordTypeId: string | null;
  /** "vi", "♭VII", "V7"; empty when there's no chord type. */
  readonly numeral: string;
}

/**
 * The chord on each degree of a seven-note scale, built from the scale's own
 * notes by taking every other one: C, E, G on C; D, F, A on D. `seventh` adds
 * the next one up. Empty for scales without seven letters (pentatonics, blues).
 */
export function scaleChords(root: Note, scaleTypeId: string, size: 'triad' | 'seventh' = 'triad'): ScaleChord[] {
  if (!isHeptatonic(scaleTypeId)) return [];
  const scale = buildScale(root, scaleTypeId);
  const stack = size === 'triad' ? [0, 2, 4] : [0, 2, 4, 6];
  return scale.map((chordRoot, degree) => {
    const notes = stack.map((step) => scale[(degree + step) % LETTERS_PER_OCTAVE] ?? chordRoot);
    const recipe = notes.map((n) => intervalBetween(chordRoot, n)).map((i) => (i ? formatInterval(i) : '?')).join(' ');
    const type = CHORD_TYPES.find((t) => t.intervals.map(formatInterval).join(' ') === recipe) ?? null;
    const numeral = type ? numeralFor(root, chordRoot, type.id) : null;
    return { degree: degree + 1, root: chordRoot, notes, chordTypeId: type?.id ?? null, numeral: numeral ? formatNumeral(numeral) : '' };
  });
}

/** The chords of a major or minor key. Minor uses natural minor; harmonic minor's V is `scaleChords(tonic, 'harmonicMinor')`. */
export function keyChords(k: Key, size: 'triad' | 'seventh' = 'triad'): ScaleChord[] {
  return scaleChords(k.tonic, keyScaleId(k), size);
}
