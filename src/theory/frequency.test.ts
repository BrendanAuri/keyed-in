import { describe, expect, it } from 'vitest';
import {
  centsBetween,
  findHarmonics,
  frequencyOf,
  frequencyOfMidi,
  harmonicNumber,
  midiOfFrequency,
  nearestNote,
  octaveFrequencies,
  suggestedA4,
} from './frequency';
import { formatPitch, note, pitch } from './notes';

describe('note frequencies', () => {
  it('tunes A4 to 440 Hz and halves each octave down', () => {
    expect(frequencyOfMidi(69)).toBe(440);
    expect(frequencyOf(pitch('A', 0, 1))).toBeCloseTo(55, 10);
    expect(frequencyOf(pitch('C', 0, 4))).toBeCloseTo(261.6256, 3);
    expect(frequencyOf(pitch('A', 0, 4), 432)).toBe(432);
  });

  it('turns frequencies back into MIDI numbers', () => {
    expect(midiOfFrequency(440)).toBe(69);
    expect(midiOfFrequency(110)).toBeCloseTo(45, 10);
    expect(midiOfFrequency(frequencyOfMidi(69.5))).toBeCloseTo(69.5, 10);
  });

  it('lists a note in every octave', () => {
    const rows = octaveFrequencies(note('A'));
    expect(rows).toHaveLength(9);
    expect(rows[0]?.hz).toBeCloseTo(27.5, 10);
    expect(rows[8]?.hz).toBeCloseTo(7040, 6);
    expect(rows.map((row) => formatPitch(row.pitch))[1]).toBe('A1');
  });
});

describe('the nearest note to a frequency', () => {
  it('finds the note and how far off it is', () => {
    const near = nearestNote(49.4);
    expect(formatPitch(near.pitch)).toBe('G1');
    expect(near.cents).toBeCloseTo(14.1, 1);
    expect(near.noteHz).toBeCloseTo(48.999, 3);
  });

  it('spells black keys as asked', () => {
    expect(formatPitch(nearestNote(277.2).pitch)).toBe('C♯4');
    expect(formatPitch(nearestNote(277.2, 440, 'flat').pitch)).toBe('D♭4');
  });

  it('measures cents both ways', () => {
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 10);
    expect(centsBetween(440, 880)).toBeCloseTo(-1200, 10);
  });

  it('shows how close low notes are: a half step at 41 Hz is under 2.5 Hz', () => {
    const e1 = frequencyOf(pitch('E', 0, 1));
    const f1 = frequencyOf(pitch('F', 0, 1));
    expect(e1).toBeCloseTo(41.2, 1);
    expect(f1 - e1).toBeLessThan(2.5);
  });
});

describe('harmonics', () => {
  it('recognises whole-number multiples within the tolerance', () => {
    expect(harmonicNumber(110, 55)).toBe(2);
    expect(harmonicNumber(165, 55)).toBe(3);
    expect(harmonicNumber(166, 55)).toBe(3);
    expect(harmonicNumber(58.3, 55)).toBeNull();
    expect(harmonicNumber(55 * 9, 55)).toBeNull();
  });

  it("doesn't mistake a note a half step away for a harmonic", () => {
    const halfStepAboveThird = 165 * 2 ** (1 / 12);
    expect(harmonicNumber(halfStepAboveThird, 55)).toBeNull();
  });

  it('links each harmonic in a list to the lowest note it fits', () => {
    expect(findHarmonics([165, 55, 73.4, 110, 220])).toEqual([
      { index: 0, of: 1, harmonic: 3 },
      { index: 3, of: 1, harmonic: 2 },
      { index: 4, of: 1, harmonic: 4 },
    ]);
  });
});

describe('suggesting a different tuning', () => {
  const at432 = [frequencyOfMidi(45, 432), frequencyOfMidi(52, 432), frequencyOfMidi(57, 432), frequencyOfMidi(64, 432)];

  it('spots a song tuned to 432 Hz', () => {
    expect(suggestedA4(at432)).toBeCloseTo(432, 6);
  });

  it('stays quiet when the notes are in tune, too few, or scattered', () => {
    expect(suggestedA4([110, 220, frequencyOfMidi(64)])).toBeNull();
    expect(suggestedA4(at432.slice(0, 2))).toBeNull();
    expect(suggestedA4([frequencyOfMidi(45.2), frequencyOfMidi(52.4), frequencyOfMidi(57)])).toBeNull();
  });
});
