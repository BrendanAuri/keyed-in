import { describe, expect, it } from 'vitest';
import { PACKS } from '../content';
import { introEvents, introKeyboard, introKeys, isPlayRight, playDone, playStart, playTip } from './intro';

describe('intro keys', () => {
  it('light a chord from the question octave with its spelled names and root', () => {
    const keys = introKeys({ kind: 'chord', root: 'C', chord: 'minor' });
    expect(keys.keys).toEqual([60, 63, 67]);
    expect([...keys.labels.values()]).toEqual(['C', 'E♭', 'G']);
    expect([...keys.roots]).toEqual([60]);
  });

  it('light a list of notes as written, with no root', () => {
    const keys = introKeys({ kind: 'notes', notes: ['Db4', 'D4'] });
    expect(keys.keys).toEqual([61, 62]);
    expect(keys.labels.get(61)).toBe('D♭');
    expect(keys.roots.size).toBe(0);
  });

  it('play a chord together or one note at a time, and a list of notes one after another', () => {
    const chord = { kind: 'chord' as const, root: 'C', chord: 'major' };
    expect(new Set(introEvents(chord).map((e) => e.at)).size).toBe(1);
    expect(new Set(introEvents(chord, true).map((e) => e.at)).size).toBe(3);
    expect(new Set(introEvents({ kind: 'notes', notes: ['C4', 'D4'] }).map((e) => e.at)).size).toBe(2);
  });
});

describe('a your-turn step', () => {
  const dMajor = { kind: 'chord' as const, root: 'D', chord: 'major' };

  it('is right with exactly the notes, in any octave', () => {
    expect(isPlayRight(dMajor, [62, 66, 69])).toBe(true);
    expect(isPlayRight(dMajor, [50, 66, 81])).toBe(true);
    expect(isPlayRight(dMajor, [62, 66])).toBe(false);
    expect(isPlayRight(dMajor, [62, 66, 69, 70])).toBe(false);
    expect(isPlayRight({ kind: 'notes', notes: ['C4'] }, [72])).toBe(true);
  });

  it('says why a wrong key is wrong, and what was built', () => {
    expect(playTip(dMajor, 65)).toBe("F isn't in D major. Start on D. Count up 4 keys to the next note, then 3 more. Count every key, black and white.");
    expect(playTip(dMajor, 66)).toBeNull();
    expect(playTip({ kind: 'notes', notes: ['C4'] }, 62)).toBe("That's D. C is the white key just left of the two black keys.");
    expect(playDone(dMajor)).toBe("Yes, that's it. D major is D, F♯ and A.");
    expect(playDone({ kind: 'notes', notes: ['G4'] })).toBe("Yes, that's G.");
  });

  it('starts with its given keys chosen', () => {
    expect(playStart({ kind: 'play', text: 'x', target: dMajor, start: ['D4', 'F#4', 'A4'] })).toEqual([62, 66, 69]);
  });
});

describe('every shipped intro', () => {
  it('fits one keyboard of at most three octaves, from middle C or below', () => {
    for (const pack of PACKS) {
      for (const level of pack.levels) {
        const board = introKeyboard(level.intro, 1);
        expect(board.lowestNote, level.id).toBeLessThanOrEqual(60);
        expect(board.octaves, level.id).toBeLessThanOrEqual(3);
      }
    }
  });

  it('asks for something its starting keys don’t already answer', () => {
    for (const pack of PACKS) {
      for (const level of pack.levels) {
        for (const step of level.intro) if (step.kind === 'play') expect(isPlayRight(step.target, playStart(step)), `${level.id}: ${step.text}`).toBe(false);
      }
    }
  });
});
