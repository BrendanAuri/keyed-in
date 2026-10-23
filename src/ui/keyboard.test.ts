import { describe, expect, it } from 'vitest';
import { cAtOrBelow, isBlackKey, keyboardLayout, octavesToShow } from './keyboardLayout';
import { keyLabelForOffset, lowestNoteForOctave, noteForKey } from './keyboardMap';

describe('keyboard layout', () => {
  it('lays out an octave and the C on top', () => {
    const keys = keyboardLayout(60, 1);
    expect(keys).toHaveLength(13);
    const whites = keys.filter((k) => !k.black);
    expect(whites).toHaveLength(8);
    expect(whites[0]?.left).toBe(0);
    expect(whites[7]?.left).toBeCloseTo(87.5, 10);
  });

  it('centres each black key on the line between two white keys', () => {
    const keys = keyboardLayout(60, 1);
    const cSharp = keys.find((k) => k.midi === 61);
    expect(cSharp?.black).toBe(true);
    expect((cSharp?.left ?? 0) + (cSharp?.width ?? 0) / 2).toBeCloseTo(12.5, 10);
  });

  it('knows black keys and finds the C below', () => {
    expect([60, 61, 62, 63, 64, 65, 66].map(isBlackKey)).toEqual([false, true, false, true, false, false, true]);
    expect(cAtOrBelow(67)).toBe(60);
    expect(cAtOrBelow(60)).toBe(60);
  });

  it('stretches to fit what has to show, within limits', () => {
    expect(octavesToShow(60, 72, 1, 3)).toBe(1);
    expect(octavesToShow(60, 76, 1, 3)).toBe(2);
    expect(octavesToShow(60, 64, 2, 3)).toBe(2);
    expect(octavesToShow(60, 110, 1, 3)).toBe(3);
  });
});

describe('computer keys', () => {
  it('maps the A row to white keys and the row above to black keys', () => {
    expect(lowestNoteForOctave(4)).toBe(60);
    expect(noteForKey('KeyA', 4)).toBe(60);
    expect(noteForKey('KeyW', 4)).toBe(61);
    expect(noteForKey('KeyK', 3)).toBe(60);
    expect(noteForKey('KeyQ', 4)).toBeNull();
    expect(keyLabelForOffset(1)).toBe('W');
  });
});
