/** Where each key of the on-screen keyboard goes, as percentages, so it can be tested without a DOM. */
import { SEMITONES_PER_OCTAVE } from '../constants';
import { mod } from '../theory/notes';

const BLACK_PITCH_CLASSES: ReadonlySet<number> = new Set([1, 3, 6, 8, 10]);
/** Black key width as a fraction of a white key. */
const BLACK_KEY_WIDTH_RATIO = 0.6;

export interface KeyShape {
  /** MIDI note. */
  readonly midi: number;
  readonly black: boolean;
  /** Distance from the left edge, in % of the keyboard's width. */
  readonly left: number;
  /** In % of the keyboard's width. */
  readonly width: number;
}

export function isBlackKey(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(mod(midi, SEMITONES_PER_OCTAVE));
}

/** The C at or below a MIDI note. */
export function cAtOrBelow(midi: number): number {
  return midi - mod(midi, SEMITONES_PER_OCTAVE);
}

/**
 * Keys for `octaves` octaves from `lowestC`, plus the C on top, so a scale
 * from C reaches its octave. White keys come first, so black keys draw over them.
 */
export function keyboardLayout(lowestC: number, octaves: number): KeyShape[] {
  const notes = Array.from({ length: octaves * SEMITONES_PER_OCTAVE + 1 }, (_, i) => lowestC + i);
  const whites = notes.filter((midi) => !isBlackKey(midi));
  const whiteWidth = 100 / whites.length;
  const blackWidth = whiteWidth * BLACK_KEY_WIDTH_RATIO;
  const whiteKeys = whites.map((midi, i) => ({ midi, black: false, left: i * whiteWidth, width: whiteWidth }));
  const blackKeys = notes.filter(isBlackKey).map((midi) => {
    const whiteBelow = whites.indexOf(midi - 1);
    return { midi, black: true, left: (whiteBelow + 1) * whiteWidth - blackWidth / 2, width: blackWidth };
  });
  return [...whiteKeys, ...blackKeys];
}

/** How many octaves from `lowestC` it takes to show `highest`, at least `minimum` and at most `maximum`. */
export function octavesToShow(lowestC: number, highest: number, minimum: number, maximum: number): number {
  const needed = Math.ceil((highest - lowestC) / SEMITONES_PER_OCTAVE);
  return Math.min(maximum, Math.max(minimum, needed));
}
