import { describe, expect, it } from 'vitest';
import type { Pack } from '../content/schema';
import { memoryStore } from '../storage/storage';
import type { LevelRef } from './packs';
import {
  EMPTY_PROGRESS,
  abandonRun,
  chooseStart,
  continueLevel,
  finishRun,
  isPassed,
  isUnlocked,
  markIntroSeen,
  packSummary,
  passLevels,
  recordAnswer,
  roundOutcome,
  runFor,
  starsFor,
  startRun,
  suggestedLevel,
  type Progress,
} from './progress';
import { PROGRESS_KEY, PROGRESS_RESCUE_PREFIX, createProgressStore, loadProgress, saveProgress } from './progressStore';

const LEVEL = { title: 'x', summary: 'x', intro: [{ kind: 'read' as const, text: 'x' }], questions: [{ spec: { type: 'fact' as const, about: 'facts' as const, set: ['halfStep'] }, weight: 1 }] };
const PACK: Pack = {
  id: 'test',
  title: 'Test',
  description: 'x',
  version: 2,
  levels: [
    { id: 'one', ...LEVEL },
    { id: 'two', ...LEVEL },
    { id: 'three', ...LEVEL },
  ],
};
const ref = (index: number): LevelRef => {
  const level = PACK.levels[index];
  if (!level) throw new Error('no level');
  return { pack: PACK, level, index };
};

/** Play a whole round of `right` right answers out of 10. */
function play(progress: Progress, r: LevelRef, right: number, testOut = false): Progress {
  let p = startRun(progress, r, 1, testOut);
  for (let i = 0; i < 10; i++) p = recordAnswer(p, i < right);
  return finishRun(p, r);
}

describe('scoring', () => {
  it('gives stars at 70, 85 and 95%', () => {
    expect([0, 69, 70, 84, 85, 94, 95, 100].map(starsFor)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(roundOutcome([true, true, true, true, true, true, true, false, false, false])).toEqual({ right: 7, total: 10, score: 70, stars: 1, passed: true });
    expect(roundOutcome([true, false]).passed).toBe(false);
  });
});

describe('levels', () => {
  it('unlock one after another', () => {
    expect(isUnlocked(EMPTY_PROGRESS, ref(0))).toBe(true);
    expect(isUnlocked(EMPTY_PROGRESS, ref(1))).toBe(false);
    const p = play(EMPTY_PROGRESS, ref(0), 7);
    expect(isPassed(p, ref(0))).toBe(true);
    expect(isUnlocked(p, ref(1))).toBe(true);
    expect(isUnlocked(p, ref(2))).toBe(false);
    expect(suggestedLevel(p, [PACK])?.level.id).toBe('two');
  });

  it('keep the best round and never lose a pass', () => {
    let p = play(EMPTY_PROGRESS, ref(0), 9);
    p = play(p, ref(0), 3);
    expect(p.levels['test/one']).toEqual({ best: 90, stars: 2, passed: true, runs: 2 });
    expect(p.run).toBeNull();
    expect(p.lastLevel).toBe('test/one');
  });

  it('record a failed round without passing', () => {
    const p = play(EMPTY_PROGRESS, ref(0), 6);
    expect(p.levels['test/one']).toEqual({ best: 60, stars: 0, passed: false, runs: 1 });
  });

  it('pass a tested-out level and every level before it', () => {
    const p = play(EMPTY_PROGRESS, ref(2), 8, true);
    expect(p.levels['test/three']?.stars).toBe(1);
    expect(p.levels['test/one']).toEqual({ best: 0, stars: 0, passed: true, runs: 0 });
    expect(isPassed(p, ref(1))).toBe(true);
  });

  it('leave a level locked when its test out fails', () => {
    const p = play(EMPTY_PROGRESS, ref(2), 5, true);
    expect(p.levels['test/three']).toBeUndefined();
    expect(isUnlocked(p, ref(2))).toBe(false);
  });

  it('can be passed out of order by the placement check, which unlocks the next one', () => {
    const p = passLevels(EMPTY_PROGRESS, [ref(0), ref(2)]);
    expect(isUnlocked(p, ref(1))).toBe(true);
    expect(isUnlocked(p, ref(2))).toBe(true);
    expect(suggestedLevel(p, [PACK])?.level.id).toBe('two');
    expect(packSummary(p, PACK)).toEqual({ passed: 2, total: 3, stars: 0, maxStars: 9 });
  });
});

describe('a round in progress', () => {
  it('is kept answer by answer, and belongs to one level', () => {
    let p = startRun(EMPTY_PROGRESS, ref(0), 42, false);
    p = recordAnswer(recordAnswer(p, true), false);
    expect(runFor(p, ref(0))).toEqual({ level: 'test/one', packVersion: 2, seed: 42, testOut: false, results: [true, false] });
    expect(runFor(p, ref(1))).toBeNull();
    expect(abandonRun(p).run).toBeNull();
  });

  it('is dropped when the pack has changed since', () => {
    const p = startRun(EMPTY_PROGRESS, ref(0), 42, false);
    expect(runFor(p, { ...ref(0), pack: { ...PACK, version: 3 } })).toBeNull();
  });

  it('is where Continue goes, and after that the next level once Learn has begun', () => {
    expect(continueLevel(EMPTY_PROGRESS, [PACK])).toBeNull();
    const started = chooseStart(EMPTY_PROGRESS, 'beginner');
    expect(continueLevel(started, [PACK])?.ref.level.id).toBe('one');
    const running = recordAnswer(startRun(started, ref(0), 5, false), true);
    expect(continueLevel(running, [PACK])?.run?.results).toEqual([true]);
  });
});

describe('saved progress', () => {
  it('round-trips', () => {
    const store = memoryStore();
    let p = markIntroSeen(chooseStart(play(EMPTY_PROGRESS, ref(0), 8), 'placed'), ref(0));
    p = recordAnswer(startRun(p, ref(1), 7, false), true);
    saveProgress(store, p);
    expect(loadProgress(store, 0).progress).toEqual(p);
  });

  it('drops what it can’t read, field by field', () => {
    const store = memoryStore({
      [PROGRESS_KEY]: JSON.stringify({
        v: 1,
        levels: { 'test/one': { best: 80, stars: 9, passed: true, runs: 1 }, 'test/two': { best: 'lots' } },
        start: 'sideways',
        introsSeen: ['test/one', 4],
        run: { level: 'test/one', packVersion: 1, seed: -1, testOut: false, results: [] },
      }),
    });
    expect(loadProgress(store, 0).progress).toEqual({
      levels: { 'test/one': { best: 80, stars: 3, passed: true, runs: 1 } },
      start: null,
      introsSeen: ['test/one'],
      lastLevel: null,
      run: null,
    });
  });

  it('keeps a copy of progress it can’t read at all', () => {
    const store = memoryStore({ [PROGRESS_KEY]: '{not json' });
    const loaded = loadProgress(store, 123);
    expect(loaded.progress).toEqual(EMPTY_PROGRESS);
    expect(store.read(`${PROGRESS_RESCUE_PREFIX}123`)).toBe('{not json');
  });

  it('saves and tells listeners on every change', () => {
    const store = memoryStore();
    const progress = createProgressStore(store);
    let heard = 0;
    progress.subscribe(() => heard++);
    progress.update((p) => chooseStart(p, 'beginner'));
    progress.update((p) => p);
    expect(heard).toBe(1);
    expect(loadProgress(store, 0).progress.start).toBe('beginner');
  });
});
