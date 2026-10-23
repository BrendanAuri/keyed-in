/**
 * Intervals as a number and a quality (m3, P5, A4, d5), the way theory names
 * them, so the distance between two spelled notes is spelled too: C to E♭ is a
 * minor 3rd, C to D♯ an augmented 2nd, though both are 3 semitones.
 */
import { LETTERS_PER_OCTAVE, SEMITONES_PER_OCTAVE } from '../constants';
import { accidentalText, letterAt, letterIndex, midi, noteOf, pitch, type Note, type NoteStyle, type Pitch } from './notes';

export type IntervalQuality = 'dd' | 'd' | 'm' | 'M' | 'P' | 'A' | 'AA';

export interface Interval {
  /** 1 is a unison, 3 a 3rd, 8 an octave, 9 a 9th. */
  readonly number: number;
  readonly quality: IntervalQuality;
}

export type Direction = 'up' | 'down';

/** Semitones in the major or perfect interval of each number from unison to 7th. */
const BASE_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const;
/** Unisons, 4ths, 5ths and octaves are perfect; the rest are major or minor. */
const PERFECT_NUMBERS: ReadonlySet<number> = new Set([1, 4, 5]);

/** Semitones each quality adds to the perfect or major size. */
const PERFECT_OFFSETS: Readonly<Partial<Record<IntervalQuality, number>>> = { dd: -2, d: -1, P: 0, A: 1, AA: 2 };
const MAJOR_OFFSETS: Readonly<Partial<Record<IntervalQuality, number>>> = { dd: -3, d: -2, m: -1, M: 0, A: 1, AA: 2 };

/** The interval most people mean by each number of semitones within an octave (6 is the diminished 5th). */
const COMMON_INTERVALS = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7'] as const;

const INTERVAL_PATTERN = /^(dd|d|m|M|P|A|AA)(\d+)$/;

const QUALITY_WORDS: Readonly<Record<IntervalQuality, string>> = {
  dd: 'doubly diminished',
  d: 'diminished',
  m: 'minor',
  M: 'major',
  P: 'perfect',
  A: 'augmented',
  AA: 'doubly augmented',
};

/** The same number within one octave: a 9th is a 2nd, an octave is a unison. */
export function simpleNumber(number: number): number {
  return ((number - 1) % LETTERS_PER_OCTAVE) + 1;
}

export function isPerfectNumber(number: number): boolean {
  return PERFECT_NUMBERS.has(simpleNumber(number));
}

/** Semitones in the major or perfect interval of this number: 4 for a 3rd, 14 for a 9th. */
export function baseSemitones(number: number): number {
  const octaves = Math.floor((number - 1) / LETTERS_PER_OCTAVE);
  return (BASE_SEMITONES[simpleNumber(number) - 1] ?? 0) + octaves * SEMITONES_PER_OCTAVE;
}

function offsets(number: number): Readonly<Partial<Record<IntervalQuality, number>>> {
  return isPerfectNumber(number) ? PERFECT_OFFSETS : MAJOR_OFFSETS;
}

/** Null for a quality the number can't have, such as a major 5th or a perfect 3rd. */
export function interval(number: number, quality: IntervalQuality): Interval | null {
  if (!Number.isInteger(number) || number < 1) return null;
  return offsets(number)[quality] === undefined ? null : { number, quality };
}

export function semitones(i: Interval): number {
  return baseSemitones(i.number) + (offsets(i.number)[i.quality] ?? 0);
}

/** The interval with this number that spans this many semitones, or null if no quality fits. */
export function intervalFromSize(number: number, size: number): Interval | null {
  const offset = size - baseSemitones(number);
  const table = offsets(number);
  for (const quality of Object.keys(table) as IntervalQuality[]) {
    if (table[quality] === offset) return { number, quality };
  }
  return null;
}

/** The usual name for a distance in semitones: 3 is a minor 3rd, 7 a perfect 5th, 15 a minor 10th. */
export function intervalFromSemitones(size: number): Interval {
  const octaves = Math.floor(size / SEMITONES_PER_OCTAVE);
  const simple = parseInterval(COMMON_INTERVALS[size - octaves * SEMITONES_PER_OCTAVE] ?? 'P1') ?? { number: 1, quality: 'P' };
  return { number: simple.number + octaves * LETTERS_PER_OCTAVE, quality: simple.quality };
}

/** Reads "m3", "P5", "A4", "d7" or "M9". Null if it isn't an interval. */
export function parseInterval(text: string): Interval | null {
  const match = INTERVAL_PATTERN.exec(text.trim());
  if (!match?.[1] || !match[2]) return null;
  return interval(Number(match[2]), match[1] as IntervalQuality);
}

/** Like `parseInterval`, for intervals written into the code. */
export function intervalOf(text: string): Interval {
  const parsed = parseInterval(text);
  if (!parsed) throw new Error(`Not an interval: "${text}"`);
  return parsed;
}

/** "m3". */
export function formatInterval(i: Interval): string {
  return `${i.quality}${i.number}`;
}

export function sameInterval(a: Interval, b: Interval): boolean {
  return a.number === b.number && a.quality === b.quality;
}

function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const last = n % 10;
  return `${n}${last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'}`;
}

/** "minor 3rd", "perfect 5th", "octave", "augmented unison". */
export function intervalName(i: Interval): string {
  const size = i.number === 1 ? 'unison' : i.number === 8 ? 'octave' : ordinal(i.number);
  if (i.quality === 'P' && (i.number === 1 || i.number === 8)) return size;
  return `${QUALITY_WORDS[i.quality]} ${size}`;
}

/** Semitones away from the major or perfect size: −1 for a minor 3rd or a diminished 5th. */
export function degreeOffset(i: Interval): number {
  return semitones(i) - baseSemitones(i.number);
}

/** The interval as a scale degree measured against the major scale: "♭3" for m3, "♯4" for A4, "5" for P5. */
export function degreeLabel(i: Interval, style: NoteStyle = 'unicode'): string {
  return `${accidentalText(degreeOffset(i), style)}${i.number}`;
}

/** Steps up from C0's letter, counting letters rather than semitones. */
function letterPosition(p: Pitch): number {
  return p.octave * LETTERS_PER_OCTAVE + letterIndex(p.letter);
}

/**
 * The interval from the lower of two pitches up to the higher, in either order.
 * Lower means lower by letter, so B♯3 to C4 is a diminished 2nd even though the
 * two sound the same. Compound intervals keep their size: C4 to D5 is a major 9th.
 */
export function intervalBetweenPitches(a: Pitch, b: Pitch): Interval | null {
  const [low, high] = letterPosition(a) <= letterPosition(b) ? [a, b] : [b, a];
  return intervalFromSize(letterPosition(high) - letterPosition(low) + 1, midi(high) - midi(low));
}

/**
 * The interval going up from one note to the next one of that name: E up to C
 * is a minor 6th. Up from C, the next C♭ is nearly an octave higher, so that's
 * a diminished octave (and E♯ up to F♭ is a doubly diminished 9th).
 */
export function intervalBetween(from: Note, to: Note): Interval | null {
  const low = pitch(from.letter, from.accidental, 4);
  const sameOctave = pitch(to.letter, to.accidental, letterIndex(to.letter) < letterIndex(from.letter) ? 5 : 4);
  // Spelled notes can sound lower than where their letter puts them (C♭ below C), so go up an octave.
  const high = midi(sameOctave) < midi(low) ? pitch(to.letter, to.accidental, sameOctave.octave + 1) : sameOctave;
  return intervalBetweenPitches(low, high);
}

/** The pitch an interval away: E4 up a minor 3rd is G4; C4 down a perfect 5th is F3. */
export function transposePitch(p: Pitch, i: Interval, direction: Direction = 'up'): Pitch {
  const sign = direction === 'up' ? 1 : -1;
  const position = letterPosition(p) + sign * (i.number - 1);
  const octave = Math.floor(position / LETTERS_PER_OCTAVE);
  const letter = letterAt(position);
  const target = midi(p) + sign * semitones(i);
  return pitch(letter, target - midi(pitch(letter, 0, octave)), octave);
}

/** The note an interval away, with no octave: E up a minor 3rd is G. */
export function transpose(n: Note, i: Interval, direction: Direction = 'up'): Note {
  return noteOf(transposePitch(pitch(n.letter, n.accidental, 4), i, direction));
}
