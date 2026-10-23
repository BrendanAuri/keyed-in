import { describe, expect, it } from 'vitest';
import { n, p } from '../theory/fixtures';
import { formatPitch, midi } from '../theory/notes';
import { describePlayed, scaleKeyMode, selectionDegrees, selectionPitches } from './explore';

const keys = (...pitches: string[]) => pitches.map((text) => midi(p(text)));
const names = (pitches: ReturnType<typeof selectionPitches>) => pitches.map((x) => formatPitch(x)).join(' ');

describe("naming what's played", () => {
  it('says nothing for nothing', () => {
    expect(describePlayed([])).toBeNull();
  });

  it('names one note, with both spellings of a black key', () => {
    expect(describePlayed(keys('C4'))).toEqual({ title: 'C', detail: 'One note' });
    expect(describePlayed(keys('C#4', 'C#5'))).toEqual({ title: 'C♯ / D♭', detail: 'The same note in 2 octaves' });
  });

  it('names two notes as an interval, counting half steps', () => {
    expect(describePlayed(keys('C4', 'E4'))).toEqual({ title: 'Major 3rd', detail: 'C up to E · 4 half steps' });
    expect(describePlayed(keys('E4', 'F4'))).toEqual({ title: 'Minor 2nd', detail: 'E up to F · 1 half step' });
    expect(describePlayed(keys('C3', 'G3'))?.detail).toBe('C up to G · 7 half steps · also C5, a power chord');
  });

  it('names chords in words, with the symbol, the inversion and other names', () => {
    expect(describePlayed(keys('C4', 'E4', 'G4'))).toEqual({ title: 'C major', detail: 'C' });
    expect(describePlayed(keys('E3', 'G3', 'C4'))).toEqual({ title: 'C major', detail: 'C/E · first inversion' });
    expect(describePlayed(keys('C4', 'E4', 'G4', 'A4'))).toEqual({ title: 'C major 6th', detail: 'C6 · also Am7/C' });
  });

  it('lists the notes when no chord fits', () => {
    expect(describePlayed(keys('C4', 'C#4', 'D4'))).toEqual({ title: 'No chord name', detail: 'C, D♭, D' });
  });
});

describe('lighting up a chord or scale', () => {
  it('voices chords from the root in the keyboard octave, with inversions', () => {
    expect(names(selectionPitches({ kind: 'chord', root: n('C'), chordTypeId: 'major', inversion: 0 }, 4))).toBe('C4 E4 G4');
    expect(names(selectionPitches({ kind: 'chord', root: n('A'), chordTypeId: 'minor', inversion: 1 }, 4))).toBe('C5 E5 A5');
  });

  it('moves a root spelled below the C up an octave', () => {
    expect(names(selectionPitches({ kind: 'chord', root: n('Cb'), chordTypeId: 'major', inversion: 0 }, 4))).toBe('C♭5 E♭5 G♭5');
  });

  it('plays scales up to the octave', () => {
    expect(names(selectionPitches({ kind: 'scale', root: n('D'), scaleTypeId: 'dorian' }, 4))).toBe('D4 E4 F4 G4 A4 B4 C5 D5');
  });

  it('follows the blues spelling rule', () => {
    const ebBlues = { kind: 'scale', root: n('Eb'), scaleTypeId: 'blues' } as const;
    expect(names(selectionPitches(ebBlues, 4))).toBe('E♭4 G♭4 A♭4 A4 B♭4 D♭5 E♭5');
    expect(selectionDegrees(ebBlues).map((d) => `${d.note} ${d.degree}`)).toContain('A ♯4');
  });

  it('labels each note with its degree', () => {
    expect(selectionDegrees({ kind: 'chord', root: n('C'), chordTypeId: 'minor7', inversion: 2 })).toEqual([
      { note: 'C', degree: '1' },
      { note: 'E♭', degree: '♭3' },
      { note: 'G', degree: '5' },
      { note: 'B♭', degree: '♭7' },
    ]);
  });

  it('knows which scales set a key for a cadence', () => {
    expect(scaleKeyMode('major')).toBe('major');
    expect(scaleKeyMode('harmonicMinor')).toBe('minor');
    expect(scaleKeyMode('dorian')).toBeNull();
  });
});
