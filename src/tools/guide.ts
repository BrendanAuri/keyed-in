/**
 * The Scale Guide (SPEC §14.2), apart from React: a scale's chords with how
 * they tend to feel, where each likes to go next, its colour notes,
 * progressions to loop and its bass frequencies. Pure TypeScript, built from
 * the theory engine and the feel words in content/feel.ts.
 */
import { DEFAULT_A4_HZ, GUIDE_BASS_OCTAVES } from '../constants';
import { CHORD_FEELS, CHORD_TYPE_FEELS, MOVES, PROGRESSIONS, SCALE_FEELS, type Move, type ProgressionInfo } from '../content/feel';
import { chordSymbol } from '../theory/chords';
import { degreeLabel } from '../theory/intervals';
import { frequencyOf } from '../theory/frequency';
import { scaleChords, type ScaleChord } from '../theory/keys';
import { formatNote, pitch, type Note } from '../theory/notes';
import { numeralChord, parseNumeral, parseProgression, type NumeralChord as ChordSpec } from '../theory/numerals';
import { scaleSteps, scaleTypeOf } from '../theory/scales';

export interface GuideChord extends ScaleChord {
  /** "Am", "Bm7♭5". Empty when no chord type fits. */
  readonly symbol: string;
  /** How it tends to feel in this scale. */
  readonly feel: string;
}

export interface GuideMove {
  readonly move: Move;
  readonly to: ChordSpec;
  /** The second chord's symbol in this key: "F", "B♭". */
  readonly symbol: string;
}

export interface ColourNote {
  /** The note in this scale: "B" in D Dorian. */
  readonly note: string;
  /** Its degree here and in the scale it's compared with: "6" where natural minor has "♭6". */
  readonly degree: string;
  readonly comparedDegree: string;
}

export interface GuideProgression {
  readonly info: ProgressionInfo;
  readonly chords: readonly ChordSpec[];
  /** "C–G–Am–F". */
  readonly symbols: string;
}

/** A few words on how the scale tends to feel. */
export function scaleFeel(scaleTypeId: string): string {
  return SCALE_FEELS[scaleTypeId]?.feel ?? '';
}

/** The scale this one is compared with for its colour notes (Dorian: natural minor), or null. */
export function comparedScale(scaleTypeId: string): string | null {
  return SCALE_FEELS[scaleTypeId]?.compareWith ?? null;
}

/** For a scale without seven letters, the seven-note scale whose chords go with it (major pentatonic: major). */
export function chordsSource(scaleTypeId: string): string | null {
  return SCALE_FEELS[scaleTypeId]?.chordsFrom ?? null;
}

/** The scale's chords, triads or sevenths, each with its symbol and feel. Empty for scales without seven letters. */
export function guideChords(root: Note, scaleTypeId: string, size: 'triad' | 'seventh' = 'triad'): GuideChord[] {
  const triads = scaleChords(root, scaleTypeId, 'triad');
  return scaleChords(root, scaleTypeId, size).map((chord, i) => {
    const triadType = triads[i]?.chordTypeId ?? '';
    const feel = CHORD_FEELS[scaleTypeId]?.[i] ?? CHORD_TYPE_FEELS[triadType] ?? '';
    return { ...chord, symbol: chord.chordTypeId ? chordSymbol(chord.root, chord.chordTypeId) : '', feel };
  });
}

/** The chord a numeral stands for in a key, or null. */
function chordFor(tonic: Note, numeral: string): ChordSpec | null {
  const parsed = parseNumeral(numeral);
  return parsed ? numeralChord(tonic, parsed) : null;
}

/**
 * Where the triad on `degree` likes to go next (What next?): the named moves
 * that start on it, whose second chord is in the scale or is borrowed.
 */
export function movesFrom(root: Note, scaleTypeId: string, degree: number): GuideMove[] {
  const numerals = scaleChords(root, scaleTypeId, 'triad').map((chord) => chord.numeral);
  const from = numerals[degree - 1];
  if (!from) return [];
  return MOVES.filter((move) => move.from === from && (move.borrowed || numerals.includes(move.to))).flatMap((move) => {
    const to = chordFor(root, move.to);
    return to ? [{ move, to, symbol: chordSymbol(to.root, to.chordTypeId) }] : [];
  });
}

/**
 * The notes that set a scale apart from the one it's compared with: Dorian's 6
 * where natural minor has ♭6, Lydian's ♯4 where major has 4. Empty for
 * scales that aren't compared with another.
 */
export function colourNotes(root: Note, scaleTypeId: string): ColourNote[] {
  const compareWith = SCALE_FEELS[scaleTypeId]?.compareWith;
  if (!compareWith) return [];
  const mine = scaleSteps(root, scaleTypeId);
  const theirs = scaleSteps(root, compareWith);
  return mine.flatMap((step, i) => {
    const other = theirs[i];
    const degree = degreeLabel(step.interval);
    const comparedDegree = other ? degreeLabel(other.interval) : '';
    return degree === comparedDegree ? [] : [{ note: formatNote(step.note), degree, comparedDegree }];
  });
}

/** The listed progressions for this scale, spelled in its key. */
export function progressionsFor(root: Note, scaleTypeId: string): GuideProgression[] {
  return PROGRESSIONS.filter((info) => info.scales.includes(scaleTypeId)).flatMap((info) => {
    const numerals = parseProgression(info.numerals) ?? [];
    const chords = numerals.flatMap((n) => {
      const chord = numeralChord(root, n);
      return chord ? [chord] : [];
    });
    if (chords.length === 0 || chords.length !== numerals.length) return [];
    return [{ info, chords, symbols: chords.map((c) => chordSymbol(c.root, c.chordTypeId)).join('–') }];
  });
}

/** Each of the scale's notes in the bass octaves (about 32–130 Hz), for tuning a kick, sub or 808 to the key. */
export function bassFrequencies(root: Note, scaleTypeId: string, a4Hz = DEFAULT_A4_HZ): { readonly note: string; readonly hz: readonly number[] }[] {
  const [low, high] = GUIDE_BASS_OCTAVES;
  return scaleSteps(root, scaleTypeId).map(({ note }) => ({
    note: formatNote(note),
    hz: Array.from({ length: high - low + 1 }, (_, i) => frequencyOf(pitch(note.letter, note.accidental, low + i), a4Hz)),
  }));
}

/** "E♭ natural minor is also called Aeolian." */
export function aliasesText(scaleTypeId: string): string {
  const { aliases } = scaleTypeOf(scaleTypeId);
  return aliases.length > 0 ? `Also called ${aliases.join(' or ')}.` : '';
}
