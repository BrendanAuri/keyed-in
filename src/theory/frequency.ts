/**
 * Notes and frequencies, for the Scale Finder (SPEC §14.1): what frequency a
 * note is, which note a frequency read off a spectrum analyser is, and whether
 * a peak is really a harmonic of a lower note.
 */
import {
  A4_MIDI,
  CENTS_PER_OCTAVE,
  DEFAULT_A4_HZ,
  HARMONIC_TOLERANCE_CENTS,
  MAX_HARMONIC,
  SEMITONES_PER_OCTAVE,
  TUNING_MAX_SPREAD_CENTS,
  TUNING_MIN_FREQUENCIES,
  TUNING_MIN_OFFSET_CENTS,
} from '../constants';
import { midi, pitch, pitchFromMidi, type Note, type Pitch, type Spelling } from './notes';

/** How far apart two frequencies are in cents; positive when `hz` is higher. */
export function centsBetween(hz: number, referenceHz: number): number {
  return CENTS_PER_OCTAVE * Math.log2(hz / referenceHz);
}

/** Frequency of a MIDI note (fractions allowed): 69 is 440 Hz at the usual tuning. */
export function frequencyOfMidi(midiNumber: number, a4Hz = DEFAULT_A4_HZ): number {
  return a4Hz * 2 ** ((midiNumber - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

export function frequencyOf(p: Pitch, a4Hz = DEFAULT_A4_HZ): number {
  return frequencyOfMidi(midi(p), a4Hz);
}

/** The MIDI number of a frequency, with a fraction for anything between notes: 452 Hz is about 69.47. */
export function midiOfFrequency(hz: number, a4Hz = DEFAULT_A4_HZ): number {
  return A4_MIDI + SEMITONES_PER_OCTAVE * Math.log2(hz / a4Hz);
}

export interface NearestNote {
  readonly pitch: Pitch;
  /** The note's exact frequency. */
  readonly noteHz: number;
  /** How far the frequency is from it, −50 to +50; positive means sharp of the note. */
  readonly cents: number;
}

/** The note a frequency is closest to: 49.4 Hz is G1, 14 cents sharp. */
export function nearestNote(hz: number, a4Hz = DEFAULT_A4_HZ, spelling: Spelling = 'sharp'): NearestNote {
  const midiNumber = Math.round(midiOfFrequency(hz, a4Hz));
  const noteHz = frequencyOfMidi(midiNumber, a4Hz);
  return { pitch: pitchFromMidi(midiNumber, spelling), noteHz, cents: centsBetween(hz, noteHz) };
}

/**
 * Which harmonic of `baseHz` this frequency is (2 for an octave up, 3 for an
 * octave and a fifth), or null if it isn't one within the tolerance.
 */
export function harmonicNumber(hz: number, baseHz: number, toleranceCents = HARMONIC_TOLERANCE_CENTS): number | null {
  const n = Math.round(hz / baseHz);
  if (n < 2 || n > MAX_HARMONIC) return null;
  return Math.abs(centsBetween(hz, baseHz * n)) <= toleranceCents ? n : null;
}

export interface HarmonicLink {
  /** Index of the frequency that looks like a harmonic. */
  readonly index: number;
  /** Index of the lower frequency it's a harmonic of. */
  readonly of: number;
  readonly harmonic: number;
}

/**
 * For a list of frequencies, the ones that look like harmonics of a lower one
 * in the list ("165 Hz is the 3rd harmonic of 55 Hz"). Each is linked to the
 * lowest frequency it fits, since that's most likely the note being played.
 */
export function findHarmonics(frequencies: readonly number[], toleranceCents = HARMONIC_TOLERANCE_CENTS): HarmonicLink[] {
  const byPitch = frequencies.map((hz, index) => ({ hz, index })).sort((a, b) => a.hz - b.hz);
  const links: HarmonicLink[] = [];
  for (const { hz, index } of byPitch) {
    for (const base of byPitch) {
      if (base.hz >= hz) break;
      const harmonic = harmonicNumber(hz, base.hz, toleranceCents);
      if (harmonic !== null) {
        links.push({ index, of: base.index, harmonic });
        break;
      }
    }
  }
  return links.sort((a, b) => a.index - b.index);
}

/**
 * If every frequency is off its nearest note by about the same amount, the A4
 * that would put them in tune (a song tuned to 432 Hz, say). Otherwise null.
 */
export function suggestedA4(frequencies: readonly number[], a4Hz = DEFAULT_A4_HZ): number | null {
  if (frequencies.length < TUNING_MIN_FREQUENCIES) return null;
  const offsets = frequencies.map((hz) => nearestNote(hz, a4Hz).cents);
  const lowest = Math.min(...offsets);
  const highest = Math.max(...offsets);
  if (highest - lowest > TUNING_MAX_SPREAD_CENTS) return null;
  const average = offsets.reduce((sum, cents) => sum + cents, 0) / offsets.length;
  if (Math.abs(average) < TUNING_MIN_OFFSET_CENTS) return null;
  return a4Hz * 2 ** (average / CENTS_PER_OCTAVE);
}

/** A note's frequency in each octave from `lowest` to `highest` (0 to 8 by default). */
export function octaveFrequencies(n: Note, a4Hz = DEFAULT_A4_HZ, lowest = 0, highest = 8): { pitch: Pitch; hz: number }[] {
  const rows: { pitch: Pitch; hz: number }[] = [];
  for (let octave = lowest; octave <= highest; octave++) {
    const p = pitch(n.letter, n.accidental, octave);
    rows.push({ pitch: p, hz: frequencyOf(p, a4Hz) });
  }
  return rows;
}
