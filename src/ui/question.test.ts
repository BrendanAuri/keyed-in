import { describe, expect, it } from 'vitest';
import { generateQuestion } from '../exercises/questions';
import { createRng } from '../game/rng';
import { formatPitch, pitchFromMidi } from '../theory/notes';
import { questionKeyboard } from './question';

const names = (keys: Iterable<number>) => [...keys].map((m) => formatPitch(pitchFromMidi(m, 'flat'))).join(' ');

describe("the question screen's keyboard", () => {
  it('lights nothing before answering, then shows the answer once answered', () => {
    const q = generateQuestion({ type: 'spell', about: 'chords', set: ['minor'], roots: ['C'], guide: 'full' }, createRng(1));
    const before = questionKeyboard(q, false, 1);
    expect([...before.marked]).toEqual([]);
    expect(before.lowestNote).toBe(60);
    const after = questionKeyboard(q, true, 1);
    expect([...after.marked.values()]).toEqual(['C', 'E♭', 'G']);
    expect(names(after.roots)).toBe('C4');
  });

  it('names the keys of a chord to identify, spelled for the chord', () => {
    const q = generateQuestion({ type: 'identify', about: 'chords', set: ['minor'], roots: ['G'] }, createRng(4));
    expect([...questionKeyboard(q, false, 1).marked.values()]).toEqual(['G', 'B♭', 'D']);
  });

  it("lights keys without names when the names would give the answer away", () => {
    const q = generateQuestion({ type: 'identify', about: 'notes', set: [], roots: ['Eb'] }, createRng(2));
    expect([...questionKeyboard(q, false, 1).marked]).toEqual([[63, '']]);
  });

  it('stretches to fit a chord that goes past the top C', () => {
    const q = generateQuestion({ type: 'spell', about: 'chords', set: ['major'], roots: ['B'], guide: 'none' }, createRng(3));
    expect(questionKeyboard(q, false, 1).octaves).toBe(2);
    expect(questionKeyboard(q, false, 2).octaves).toBe(2);
  });
});
