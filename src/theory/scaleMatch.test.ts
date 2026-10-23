import { describe, expect, it } from 'vitest';
import { n } from './fixtures';
import { formatNote, pitchClass } from './notes';
import { matchScales, type ScaleGroup } from './scaleMatch';
import { scaleName } from './scales';

const pcs = (...notes: string[]) => notes.map((text) => pitchClass(n(text)));
const optionNames = (group: ScaleGroup | undefined) => (group?.options ?? []).map((o) => scaleName(o.root, o.scaleTypeId));

describe('matching scales', () => {
  it('groups scales that share the same notes', () => {
    const { exact } = matchScales(pcs('C', 'D', 'E', 'F', 'G', 'A', 'B'));
    expect(exact).toHaveLength(1);
    expect(exact[0]?.extraNotes).toBe(0);
    expect(optionNames(exact[0])).toEqual([
      'C major',
      'A natural minor',
      'D Dorian',
      'G Mixolydian',
      'E Phrygian',
      'F Lydian',
      'B Locrian',
    ]);
  });

  it('puts scales on the home note first', () => {
    const { exact } = matchScales(pcs('C', 'D', 'E', 'F', 'G', 'A', 'B'), pitchClass(n('D')));
    expect(optionNames(exact[0])[0]).toBe('D Dorian');
  });

  it('ranks scales with fewer extra notes first', () => {
    const { exact } = matchScales(pcs('C', 'E', 'G'));
    expect(optionNames(exact[0])).toEqual(['C major pentatonic', 'A minor pentatonic']);
    expect(exact[0]?.extraNotes).toBe(2);
    expect(exact.length).toBeGreaterThan(5);
    const extras = exact.map((g) => g.extraNotes);
    expect([...extras].sort((a, b) => a - b)).toEqual(extras);
  });

  it('puts groups with a scale on the home note ahead of the rest', () => {
    const { exact } = matchScales(pcs('C', 'E', 'G'), pitchClass(n('E')));
    expect(formatNote(exact[0]?.options[0]?.root ?? n('C'))).toBe('E');
  });

  it('offers common scales that are one note off', () => {
    const { exact, near } = matchScales(pcs('A', 'B', 'C', 'D', 'E', 'F', 'G#'), pitchClass(n('A')));
    expect(optionNames(exact[0])[0]).toBe('A harmonic minor');
    const naturalMinor = near.find((group) => optionNames(group).includes('A natural minor'));
    expect(naturalMinor?.missing).toBe(pitchClass(n('G#')));
  });

  it('offers no near matches with only a few notes, and nothing for nothing', () => {
    expect(matchScales(pcs('C', 'E', 'G')).near).toEqual([]);
    expect(matchScales([])).toEqual({ exact: [], near: [] });
  });

  it('spells roots the simplest way', () => {
    const { exact } = matchScales(pcs('F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'));
    expect(optionNames(exact[0]).slice(0, 2)).toEqual(['G♭ major', 'E♭ natural minor']);
  });
});
