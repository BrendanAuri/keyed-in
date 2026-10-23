/**
 * When each note of a chord, scale, cadence or progression starts and how long
 * it lasts (SPEC §6). Pure, so it's tested without Web Audio; player.ts turns
 * the events into voices.
 */
import {
  ARPEGGIO_STEP_SECONDS,
  BASS_RANGE,
  CADENCE_BEATS,
  CADENCE_BPM,
  CHORD_SECONDS,
  LEGATO,
  SCALE_STEP_SECONDS,
  SECONDS_PER_MINUTE,
  SEMITONES_PER_OCTAVE,
  STRUM_STEP_SECONDS,
  VOICING_CENTRE_MIDI,
} from '../constants';
import { buildChord } from '../theory/chords';
import type { Key, KeyMode } from '../theory/keys';
import { mod, pitchClass, type Note } from '../theory/notes';
import { numeralChord, parseNumeral } from '../theory/numerals';

export interface NoteEvent {
  /** MIDI note. */
  readonly midi: number;
  /** Seconds after playback starts. */
  readonly at: number;
  /** Seconds the note is held before its release. */
  readonly duration: number;
}

export type ChordStyle = 'together' | 'strum' | 'arpeggio';

/** A chord to voice: its root and chord type. */
export interface ChordSpec {
  readonly root: Note;
  readonly chordTypeId: string;
}

/** The chords that set a key: I–IV–V–I, or i–iv–V–i in minor (with harmonic minor's major V, which pulls home). */
const CADENCE_NUMERALS: Readonly<Record<KeyMode, readonly string[]>> = {
  major: ['I', 'IV', 'V', 'I'],
  minor: ['i', 'iv', 'V', 'i'],
};

/** Notes one after another, `step` seconds apart, each held for most of the gap. */
export function stepEvents(midis: readonly number[], step: number): NoteEvent[] {
  return midis.map((midi, i) => ({ midi, at: i * step, duration: step * LEGATO }));
}

/** A chord's notes played together, strummed (each a little later, all ending together) or one at a time. */
export function chordEvents(midis: readonly number[], style: ChordStyle = 'together'): NoteEvent[] {
  const notes = [...midis].sort((a, b) => a - b);
  switch (style) {
    case 'together':
      return notes.map((midi) => ({ midi, at: 0, duration: CHORD_SECONDS }));
    case 'strum':
      return notes.map((midi, i) => ({ midi, at: i * STRUM_STEP_SECONDS, duration: CHORD_SECONDS - i * STRUM_STEP_SECONDS }));
    case 'arpeggio':
      return stepEvents(notes, ARPEGGIO_STEP_SECONDS);
  }
}

/** A scale going up, or up and back down with the top note played once. Give the notes lowest first. */
export function scaleEvents(midis: readonly number[], direction: 'up' | 'upAndDown' = 'up'): NoteEvent[] {
  const notes = direction === 'up' ? [...midis] : [...midis, ...midis.slice(0, -1).reverse()];
  return stepEvents(notes, SCALE_STEP_SECONDS);
}

/** When the last note of some events has been released. */
export function eventsEnd(events: readonly NoteEvent[]): number {
  return events.reduce((end, e) => Math.max(end, e.at + e.duration), 0);
}

/** Pitch classes stacked upwards in close position, the first at `lowest`. */
function stack(pcs: readonly number[], lowest: number): number[] {
  const notes: number[] = [];
  let below = lowest - 1;
  for (const pc of pcs) {
    const next = below + 1 + mod(pc - (below + 1), SEMITONES_PER_OCTAVE);
    notes.push(next);
    below = next;
  }
  return notes;
}

/** How far the voices move between two chords: each note's distance to the nearest note of the other, both ways. */
function movement(a: readonly number[], b: readonly number[]): number {
  const nearest = (x: number, others: readonly number[]) => Math.min(...others.map((y) => Math.abs(x - y)));
  return a.reduce((sum, x) => sum + nearest(x, b), 0) + b.reduce((sum, y) => sum + nearest(y, a), 0);
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * The chord's notes as MIDI numbers, close to the chord before (so C, F and G
 * come out as C E G, C F A, B D G, the way a pianist would play them), or
 * around E4 for the first chord. Lowest first. Ties go to the lower inversion.
 */
export function voiceNear(chord: ChordSpec, previous: readonly number[] | null): number[] {
  const pcs = buildChord(chord.root, chord.chordTypeId).map(pitchClass);
  // The lowest note stays within about an octave below the centre, so a long progression can't drift away.
  const lowestFrom = VOICING_CENTRE_MIDI - SEMITONES_PER_OCTAVE - SEMITONES_PER_OCTAVE / 2;
  let best: number[] = [];
  let bestScore = Infinity;
  for (let inversion = 0; inversion < pcs.length; inversion++) {
    const order = [...pcs.slice(inversion), ...pcs.slice(0, inversion)];
    const first = order[0] ?? 0;
    for (let lowest = lowestFrom + mod(first - lowestFrom, SEMITONES_PER_OCTAVE); lowest < VOICING_CENTRE_MIDI + SEMITONES_PER_OCTAVE / 2; lowest += SEMITONES_PER_OCTAVE) {
      const candidate = stack(order, lowest);
      const score = previous && previous.length > 0 ? movement(candidate, previous) : Math.abs(mean(candidate) - VOICING_CENTRE_MIDI);
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
  }
  return best;
}

/** The chord's root as a bass note, between E2 and D♯3. */
export function bassNote(root: Note): number {
  const [low] = BASS_RANGE;
  return low + mod(pitchClass(root) - low, SEMITONES_PER_OCTAVE);
}

/**
 * Chords one after another at a tempo, each voiced close to the one before,
 * with its root in the bass. `beats` is how long each chord lasts: one number
 * for all of them, or one per chord.
 */
export function progressionEvents(chords: readonly ChordSpec[], bpm: number, beats: number | readonly number[]): NoteEvent[] {
  const secondsPerBeat = SECONDS_PER_MINUTE / bpm;
  const events: NoteEvent[] = [];
  let at = 0;
  let previous: number[] | null = null;
  chords.forEach((chord, i) => {
    const length = (typeof beats === 'number' ? beats : (beats[i] ?? beats[beats.length - 1] ?? 1)) * secondsPerBeat;
    const upper = voiceNear(chord, previous);
    for (const midi of [bassNote(chord.root), ...upper]) events.push({ midi, at, duration: length * LEGATO });
    previous = upper;
    at += length;
  });
  return events;
}

/** The cadence's chords in a key: C major gives C, F, G, C; A minor gives Am, Dm, E, Am. */
export function cadenceChords(k: Key): ChordSpec[] {
  return CADENCE_NUMERALS[k.mode].flatMap((text) => {
    const numeral = parseNumeral(text);
    const chord = numeral && numeralChord(k.tonic, numeral);
    return chord ? [chord] : [];
  });
}

/** A short cadence that sets the key before an ear question (SPEC §2). */
export function cadenceEvents(k: Key): NoteEvent[] {
  return progressionEvents(cadenceChords(k), CADENCE_BPM, CADENCE_BEATS);
}
