/**
 * Naming what's played: keys in, every reasonable chord name out. C, E, G and A
 * together are both C6 and Am7/C, so both come back, with the name that fits
 * the bass note first. Keys on a keyboard carry no spelling, so each name is
 * spelled the simplest way (D♭ major rather than C♯ major).
 */
import { SEMITONES_PER_OCTAVE } from '../constants';
import { CHORD_TYPES, buildChord, chordSemitones, chordSymbol, type ChordType } from './chords';
import { intervalFromSemitones, type Interval } from './intervals';
import { maskOf, mod, noteFromPitchClass, pitchClass, rotateMask, simplestSpelling, type Note } from './notes';

export interface ChordMatch {
  readonly root: Note;
  readonly chordTypeId: string;
  /** The lowest note, when it isn't the root: an inversion or a slash chord. */
  readonly bass: Note | null;
  /** "Am7/C". */
  readonly symbol: string;
}

export type Description =
  | { readonly kind: 'empty' }
  /** One note, perhaps in several octaves. */
  | { readonly kind: 'note'; readonly note: Note }
  /** Two different notes: the interval up from the lower one, and any chord they make (C and G: a C5 power chord). */
  | { readonly kind: 'interval'; readonly interval: Interval; readonly chords: readonly ChordMatch[] }
  /** Three or more different notes. `chords` is empty when no chord type fits. */
  | { readonly kind: 'chord'; readonly chords: readonly ChordMatch[] };

/** Each chord type's pitch classes up from its root, as a 12-bit set (`maskOf`). */
const TYPE_MASKS: readonly { readonly type: ChordType; readonly rank: number; readonly mask: number }[] = CHORD_TYPES.map((type, rank) => ({
  type,
  rank,
  mask: maskOf(chordSemitones(type)),
}));

/**
 * The bass note as the chord spells it (A♯ in F♯/A♯), unless a plainer spelling
 * exists: E augmented is E G♯ B♯, but over a C it reads better as Eaug/C.
 */
function bassSpelling(bassPc: number, chordNotes: readonly Note[]): Note {
  const plain = noteFromPitchClass(bassPc, 'flat');
  const member = chordNotes.find((n) => pitchClass(n) === bassPc) ?? plain;
  return Math.abs(member.accidental) <= Math.abs(plain.accidental) ? member : plain;
}

/**
 * Every chord that has exactly these pitch classes, best first: names with the
 * bass note as the root come first, then the more common chord types.
 */
export function chordsFromPitchClasses(pitchClasses: readonly number[], bassPc: number | null = null): ChordMatch[] {
  const mask = maskOf(pitchClasses);
  const found: { match: ChordMatch; order: number }[] = [];
  for (let rootPc = 0; rootPc < SEMITONES_PER_OCTAVE; rootPc++) {
    if (!(mask & (1 << rootPc))) continue;
    // The set as seen from this root, so it can be compared with each chord type's recipe.
    const turned = rotateMask(mask, rootPc);
    for (const { type, rank, mask: typeMask } of TYPE_MASKS) {
      if (typeMask !== turned) continue;
      const root = simplestSpelling(rootPc, (r) => buildChord(r, type.id));
      const notes = buildChord(root, type.id);
      const bass = bassPc === null || bassPc === rootPc ? null : bassSpelling(bassPc, notes);
      const order = (bass ? CHORD_TYPES.length : 0) + rank;
      found.push({ match: { root, chordTypeId: type.id, bass, symbol: chordSymbol(root, type.id, bass) }, order });
    }
  }
  return found.sort((a, b) => a.order - b.order).map((f) => f.match);
}

/** Every chord name for these keys (MIDI numbers), the lowest key as the bass. */
export function nameChord(midiNumbers: readonly number[]): ChordMatch[] {
  if (midiNumbers.length === 0) return [];
  return chordsFromPitchClasses(midiNumbers.map((m) => mod(m, SEMITONES_PER_OCTAVE)), mod(Math.min(...midiNumbers), SEMITONES_PER_OCTAVE));
}

/** What these keys are: nothing, a note, an interval or a chord (Explore, SPEC §13). */
export function describeNotes(midiNumbers: readonly number[]): Description {
  const pcs = [...new Set(midiNumbers.map((m) => mod(m, SEMITONES_PER_OCTAVE)))];
  const lowest = Math.min(...midiNumbers);
  const bassPc = mod(lowest, SEMITONES_PER_OCTAVE);
  if (pcs.length === 0) return { kind: 'empty' };
  if (pcs.length === 1) return { kind: 'note', note: noteFromPitchClass(bassPc, 'flat') };
  const chords = nameChord(midiNumbers);
  if (pcs.length === 2) {
    const other = pcs.find((pc) => pc !== bassPc) ?? bassPc;
    return { kind: 'interval', interval: intervalFromSemitones(mod(other - bassPc, SEMITONES_PER_OCTAVE)), chords };
  }
  return { kind: 'chord', chords };
}
