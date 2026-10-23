import { describe, expect, it } from 'vitest';
import {
  degreeLabel,
  formatInterval,
  interval,
  intervalBetween,
  intervalBetweenPitches,
  intervalFromSemitones,
  intervalName,
  intervalOf,
  parseInterval,
  semitones,
  transpose,
  transposePitch,
} from './intervals';
import { n, p } from './fixtures';
import { formatNote, formatPitch } from './notes';

const between = (a: string, b: string) => {
  const i = intervalBetween(n(a), n(b));
  return i ? formatInterval(i) : null;
};

describe('interval sizes', () => {
  it('counts semitones for every quality', () => {
    const expected: Record<string, number> = {
      P1: 0, A1: 1, m2: 1, M2: 2, A2: 3, m3: 3, M3: 4, d4: 4, P4: 5, A4: 6, d5: 6, P5: 7, A5: 8,
      m6: 8, M6: 9, d7: 9, m7: 10, M7: 11, P8: 12, m9: 13, M9: 14, P11: 17, M13: 21,
    };
    for (const [text, size] of Object.entries(expected)) expect(semitones(intervalOf(text)), text).toBe(size);
  });

  it("refuses qualities a number can't have", () => {
    expect(interval(3, 'P')).toBeNull();
    expect(interval(5, 'M')).toBeNull();
    expect(interval(0, 'P')).toBeNull();
    expect(parseInterval('M5')).toBeNull();
    expect(parseInterval('x3')).toBeNull();
  });

  it('gives the usual name for each number of semitones', () => {
    const names = Array.from({ length: 25 }, (_, size) => formatInterval(intervalFromSemitones(size)));
    expect(names.slice(0, 13)).toEqual(['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8']);
    expect(names.slice(13, 15)).toEqual(['m9', 'M9']);
    expect(names[24]).toBe('P15');
  });
});

describe('between two notes', () => {
  it('spells the distance, not just the semitones', () => {
    expect(between('C', 'E')).toBe('M3');
    expect(between('C', 'Eb')).toBe('m3');
    expect(between('C', 'D#')).toBe('A2');
    expect(between('F', 'B')).toBe('A4');
    expect(between('B', 'F')).toBe('d5');
    expect(between('C', 'C#')).toBe('A1');
  });

  it('measures up to the next note of that name', () => {
    expect(between('E', 'C')).toBe('m6');
    expect(between('A', 'G')).toBe('m7');
    expect(between('C', 'C')).toBe('P1');
    expect(between('C', 'Cb')).toBe('d8');
  });

  it('keeps compound intervals between pitches, in either order', () => {
    const i = intervalBetweenPitches(p('C4'), p('D5'));
    expect(i && formatInterval(i)).toBe('M9');
    const j = intervalBetweenPitches(p('G4'), p('C4'));
    expect(j && formatInterval(j)).toBe('P5');
    const k = intervalBetweenPitches(p('B#3'), p('C4'));
    expect(k && formatInterval(k)).toBe('d2');
  });
});

describe('transposing', () => {
  it('moves spelled notes by spelled intervals', () => {
    expect(formatNote(transpose(n('E'), intervalOf('m3')))).toBe('G');
    expect(formatNote(transpose(n('Bb'), intervalOf('M3')))).toBe('D');
    expect(formatNote(transpose(n('C'), intervalOf('A5')))).toBe('G♯');
    expect(formatNote(transpose(n('C'), intervalOf('P5'), 'down'))).toBe('F');
    expect(formatNote(transpose(n('C'), intervalOf('d7')))).toBe('B♭♭');
  });

  it('carries the octave', () => {
    expect(formatPitch(transposePitch(p('Eb4'), intervalOf('P8')))).toBe('E♭5');
    expect(formatPitch(transposePitch(p('C4'), intervalOf('m2'), 'down'))).toBe('B3');
    expect(formatPitch(transposePitch(p('A3'), intervalOf('M3')))).toBe('C♯4');
  });
});

describe('words and degrees', () => {
  it('names intervals in words', () => {
    expect(intervalName(intervalOf('m3'))).toBe('minor 3rd');
    expect(intervalName(intervalOf('P5'))).toBe('perfect 5th');
    expect(intervalName(intervalOf('A4'))).toBe('augmented 4th');
    expect(intervalName(intervalOf('P1'))).toBe('unison');
    expect(intervalName(intervalOf('P8'))).toBe('octave');
    expect(intervalName(intervalOf('A1'))).toBe('augmented unison');
    expect(intervalName(intervalOf('M9'))).toBe('major 9th');
    expect(intervalName(intervalOf('P11'))).toBe('perfect 11th');
    expect(intervalName(intervalOf('P12'))).toBe('perfect 12th');
  });

  it('labels intervals as degrees of the major scale', () => {
    expect(degreeLabel(intervalOf('m3'))).toBe('♭3');
    expect(degreeLabel(intervalOf('A4'))).toBe('♯4');
    expect(degreeLabel(intervalOf('d5'))).toBe('♭5');
    expect(degreeLabel(intervalOf('d7'))).toBe('♭♭7');
    expect(degreeLabel(intervalOf('P5'))).toBe('5');
    expect(degreeLabel(intervalOf('m9'), 'ascii')).toBe('b9');
  });
});
