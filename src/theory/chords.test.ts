import { describe, expect, it } from 'vitest';
import { CHORD_TYPES, buildChord, chordName, chordSymbol, inversionName, spokenChordName, voiceChord } from './chords';
import { n, p, spelled } from './fixtures';
import { semitones } from './intervals';
import { formatPitch } from './notes';

describe('chord types', () => {
  it('has unique ids and symbols, each built up from the root', () => {
    expect(new Set(CHORD_TYPES.map((t) => t.id)).size).toBe(CHORD_TYPES.length);
    expect(new Set(CHORD_TYPES.map((t) => t.symbol)).size).toBe(CHORD_TYPES.length);
    for (const type of CHORD_TYPES) {
      const sizes = type.intervals.map(semitones);
      expect(sizes[0], type.id).toBe(0);
      expect([...sizes].sort((a, b) => a - b), type.id).toEqual(sizes);
    }
  });
});

describe('building chords', () => {
  it('spells every note for its job in the chord', () => {
    expect(spelled(buildChord(n('C'), 'major'))).toBe('C E G');
    expect(spelled(buildChord(n('C'), 'minor'))).toBe('C Eb G');
    expect(spelled(buildChord(n('Ab'), 'major'))).toBe('Ab C Eb');
    expect(spelled(buildChord(n('C'), 'augmented'))).toBe('C E G#');
    expect(spelled(buildChord(n('B'), 'diminished7'))).toBe('B D F Ab');
    expect(spelled(buildChord(n('C'), 'diminished7'))).toBe('C Eb Gb Bbb');
    expect(spelled(buildChord(n('F#'), 'halfDiminished7'))).toBe('F# A C E');
    expect(spelled(buildChord(n('G'), 'dominant9'))).toBe('G B D F A');
  });

  it('writes symbols spelled out, as settled in SPEC §19', () => {
    expect(chordSymbol(n('C#'), 'minor7')).toBe('C♯m7');
    expect(chordSymbol(n('A'), 'minor7', n('C'))).toBe('Am7/C');
    expect(chordSymbol(n('C'), 'diminished')).toBe('Cdim');
    expect(chordSymbol(n('C'), 'augmented')).toBe('Caug');
    expect(chordSymbol(n('B'), 'halfDiminished7')).toBe('Bm7♭5');
    expect(chordSymbol(n('Bb'), 'halfDiminished7', null, 'ascii')).toBe('Bbm7b5');
    expect(chordSymbol(n('C'), 'major')).toBe('C');
  });

  it('names chords in words', () => {
    expect(chordName(n('C#'), 'minor7')).toBe('C♯ minor 7th');
    expect(chordName(n('C'), 'major')).toBe('C major');
    expect(spokenChordName(n('Eb'), 'minor')).toBe('E flat minor');
  });
});

describe('voicing chords', () => {
  const voiced = (inversion: number) => voiceChord(p('C4'), 'major', inversion).map((x) => formatPitch(x)).join(' ');

  it('stacks close together from the root', () => {
    expect(voiced(0)).toBe('C4 E4 G4');
  });

  it('moves the lowest notes up an octave for each inversion', () => {
    expect(voiced(1)).toBe('E4 G4 C5');
    expect(voiced(2)).toBe('G4 C5 E5');
    expect(voiceChord(p('G3'), 'dominant7', 3).map((x) => formatPitch(x)).join(' ')).toBe('F4 G4 B4 D5');
  });

  it('names inversions', () => {
    expect(inversionName(0)).toBe('root position');
    expect(inversionName(2)).toBe('second inversion');
  });
});
