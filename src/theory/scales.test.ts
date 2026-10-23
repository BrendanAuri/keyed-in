import { describe, expect, it } from 'vitest';
import { n, spelled } from './fixtures';
import { LETTERS, noteFromPitchClass } from './notes';
import { SCALE_TYPES, buildScale, isHeptatonic, scaleDegreeLabels, scaleName } from './scales';

describe('building scales', () => {
  it('uses each letter once in seven-note scales', () => {
    expect(spelled(buildScale(n('F'), 'major'))).toBe('F G A Bb C D E');
    expect(spelled(buildScale(n('A'), 'naturalMinor'))).toBe('A B C D E F G');
    expect(spelled(buildScale(n('Eb'), 'harmonicMinor'))).toBe('Eb F Gb Ab Bb Cb D');
    expect(spelled(buildScale(n('F#'), 'major'))).toBe('F# G# A# B C# D# E#');

    const roots = [...LETTERS.map((letter) => ({ letter, accidental: 0 })), ...[1, 3, 6, 8, 10].map((pc) => noteFromPitchClass(pc, 'flat'))];
    for (const type of SCALE_TYPES.filter((t) => isHeptatonic(t.id))) {
      for (const root of roots) {
        const letters = new Set(buildScale(root, type.id).map((x) => x.letter));
        expect(letters.size, `${type.id} on ${root.letter}`).toBe(7);
      }
    }
  });

  it('builds the shorter scales too', () => {
    expect(spelled(buildScale(n('A'), 'minorPentatonic'))).toBe('A C D E G');
    expect(spelled(buildScale(n('C'), 'blues'))).toBe('C Eb F Gb G Bb');
    expect(spelled(buildScale(n('C'), 'majorBlues'))).toBe('C D Eb E G A');
  });

  it('knows which scales have seven letters', () => {
    expect(isHeptatonic('major')).toBe(true);
    expect(isHeptatonic('locrian')).toBe(true);
    expect(isHeptatonic('majorPentatonic')).toBe(false);
    expect(isHeptatonic('blues')).toBe(false);
    expect(isHeptatonic('majorBlues')).toBe(false);
  });

  it('labels degrees against the major scale', () => {
    expect(scaleDegreeLabels('naturalMinor').join(' ')).toBe('1 2 ♭3 4 5 ♭6 ♭7');
    expect(scaleDegreeLabels('dorian').join(' ')).toBe('1 2 ♭3 4 5 6 ♭7');
    expect(scaleDegreeLabels('lydian').join(' ')).toBe('1 2 3 ♯4 5 6 7');
    expect(scaleDegreeLabels('blues', 'ascii').join(' ')).toBe('1 b3 4 b5 5 b7');
  });

  it('names scales', () => {
    expect(scaleName(n('A'), 'naturalMinor')).toBe('A natural minor');
    expect(scaleName(n('D'), 'dorian')).toBe('D Dorian');
  });

  it('has unique ids, most common first', () => {
    expect(new Set(SCALE_TYPES.map((t) => t.id)).size).toBe(SCALE_TYPES.length);
    const commonness = SCALE_TYPES.map((t) => t.commonness);
    expect([...commonness].sort()).toEqual(commonness);
  });
});
