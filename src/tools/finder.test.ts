import { describe, expect, it } from 'vitest';
import { frequencyOfMidi } from '../theory/frequency';
import { n } from '../theory/fixtures';
import { formatNote } from '../theory/notes';
import { enteredPitchClasses, frequencyRows, halfStepAt, noteForPitchClass, parseInput, resolveEntries, tuningSuggestion, type Entry } from './finder';

describe('reading what is typed', () => {
  it('reads note names, with or without octaves, and frequencies', () => {
    const { entries, unread } = parseInput('A, C# Eb4 55 110hz 165.5Hz');
    expect(entries).toEqual([
      { kind: 'note', note: n('A') },
      { kind: 'note', note: n('C#') },
      { kind: 'note', note: n('Eb') },
      { kind: 'frequency', hz: 55 },
      { kind: 'frequency', hz: 110 },
      { kind: 'frequency', hz: 165.5 },
    ]);
    expect(unread).toEqual([]);
  });

  it('hands back what it cannot read', () => {
    expect(parseInput('C major 3 99999').unread).toEqual(['major', '3', '99999']);
    expect(parseInput('   ').entries).toEqual([]);
  });
});

describe('resolving entries', () => {
  it('labels notes, keys and frequencies, snapping frequencies to the nearest note', () => {
    const resolved = resolveEntries([{ kind: 'note', note: n('Eb') }, { kind: 'key', pc: 1 }, { kind: 'frequency', hz: 49.4 }]);
    expect(resolved.map((r) => [r.pc, r.label, r.nearest])).toEqual([
      [3, 'E♭', null],
      [1, 'C♯ / D♭', null],
      [7, '49.4 Hz', 'G1, +14 cents'],
    ]);
  });

  it('flags frequencies that look like a harmonic of a lower one', () => {
    const entries: Entry[] = [{ kind: 'note', note: n('C') }, { kind: 'frequency', hz: 165 }, { kind: 'frequency', hz: 55 }];
    const resolved = resolveEntries(entries);
    expect(resolved[1]?.harmonicOf).toEqual({ index: 2, harmonic: 3 });
    expect(resolved[2]?.harmonicOf).toBeNull();
  });

  it('snaps at a different tuning', () => {
    const [entry] = resolveEntries([{ kind: 'frequency', hz: 432 }], 432);
    expect(entry?.nearest).toBe('A4, ±0 cents');
  });

  it('collects the pitch classes to match, leaving out what was left out', () => {
    const resolved = resolveEntries([{ kind: 'note', note: n('E') }, { kind: 'frequency', hz: 165 }, { kind: 'note', note: n('C') }]);
    expect(enteredPitchClasses(resolved, new Set())).toEqual([0, 4]);
    expect(enteredPitchClasses(resolved, new Set([0, 1]))).toEqual([0]);
  });

  it('suggests a tuning when every frequency is off the same way', () => {
    const at432: Entry[] = [45, 52, 57].map((m) => ({ kind: 'frequency', hz: frequencyOfMidi(m, 432) }));
    expect(tuningSuggestion(at432)).toBeCloseTo(432, 6);
    expect(tuningSuggestion([{ kind: 'note', note: n('C') }])).toBeNull();
  });
});

describe('the frequency table', () => {
  it('lists each note in octaves 0 to 8, marking the bass range', () => {
    const rows = frequencyRows([n('A'), n('E')]);
    expect(rows).toHaveLength(9);
    expect(rows[1]?.octave).toBe(1);
    expect(rows[1]?.cells[0]?.hz).toBeCloseTo(55, 6);
    expect(rows[1]?.cells.map((c) => c.bass)).toEqual([true, true]);
    expect(rows[4]?.cells[0]?.bass).toBe(false);
  });

  it('shows how close notes are down low', () => {
    expect(halfStepAt(n('E'), 1)).toBeLessThan(2.5);
    expect(halfStepAt(n('A'), 4)).toBeGreaterThan(25);
  });

  it('uses the typed spelling for the table when there is one', () => {
    const resolved = resolveEntries([{ kind: 'note', note: n('D#') }]);
    expect(formatNote(noteForPitchClass(3, resolved))).toBe('D♯');
    expect(formatNote(noteForPitchClass(10, resolved))).toBe('B♭');
  });
});
