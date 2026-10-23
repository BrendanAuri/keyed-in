import { describe, expect, it } from 'vitest';
import { chordSymbol } from './chords';
import { n } from './fixtures';
import { formatNumeral, numeralChord, numeralFor, parseNumeral, parseProgression, type RomanNumeral } from './numerals';

const symbolOf = (tonic: string, numeral: string) => {
  const parsed = parseNumeral(numeral);
  const chord = parsed && numeralChord(n(tonic), parsed);
  return chord ? chordSymbol(chord.root, chord.chordTypeId) : null;
};

describe('reading and writing numerals', () => {
  it('round-trips the numerals the app uses', () => {
    for (const text of ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', '♭III', '♭VI', '♭VII', 'V7', 'ii7', 'Imaj7', 'viiø7', 'vii°7', '♭III+', '♯iv°', 'i(maj7)']) {
      const parsed = parseNumeral(text);
      expect(parsed, text).not.toBeNull();
      expect(formatNumeral(parsed as RomanNumeral), text).toBe(text);
    }
  });

  it('accepts typed shorthand', () => {
    expect(parseNumeral('bVII')).toEqual({ degree: 7, accidental: -1, chordTypeId: 'major' });
    expect(parseNumeral('viio')).toEqual({ degree: 7, accidental: 0, chordTypeId: 'diminished' });
    expect(parseNumeral('iim7b5')).toEqual({ degree: 2, accidental: 0, chordTypeId: 'halfDiminished7' });
    expect(formatNumeral({ degree: 6, accidental: -1, chordTypeId: 'major' }, 'ascii')).toBe('bVI');
  });

  it('rejects mixed case and unknown endings', () => {
    expect(parseNumeral('Vi')).toBeNull();
    expect(parseNumeral('V13')).toBeNull();
    expect(parseNumeral('X')).toBeNull();
  });
});

describe('numerals in a key', () => {
  it('finds the chord a numeral stands for', () => {
    expect(symbolOf('C', 'bVII')).toBe('B♭');
    expect(symbolOf('C', 'ii')).toBe('Dm');
    expect(symbolOf('C', 'V7')).toBe('G7');
    expect(symbolOf('A', 'bVI')).toBe('F');
    expect(symbolOf('A', 'bIII')).toBe('C');
    expect(symbolOf('Eb', 'vii°')).toBe('Ddim');
    expect(symbolOf('F#', 'IV')).toBe('B');
  });

  it('finds the numeral for a chord', () => {
    const numeral = numeralFor(n('C'), n('Bb'), 'major');
    expect(numeral && formatNumeral(numeral)).toBe('♭VII');
    const borrowed = numeralFor(n('C'), n('F'), 'minor');
    expect(borrowed && formatNumeral(borrowed)).toBe('iv');
  });

  it('splits progressions on dashes and spaces', () => {
    expect(parseProgression('I–V–vi–IV')?.map((x) => formatNumeral(x))).toEqual(['I', 'V', 'vi', 'IV']);
    expect(parseProgression('i - bVI - bIII - bVII')?.map((x) => formatNumeral(x))).toEqual(['i', '♭VI', '♭III', '♭VII']);
    expect(parseProgression('I X')).toBeNull();
  });
});
