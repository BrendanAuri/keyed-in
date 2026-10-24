import { describe, expect, it } from 'vitest';
import { PACKS } from '../content';
import { NEW_ITEMS_FIRST, ROUND_QUESTIONS } from '../constants';
import { learnedFrom, offeredAbouts, offeredRoots, offeredSet, offeredTypes, startingSet } from './drill';
import { allLevels } from './packs';
import { buildPlacement, placedLevels, placementOver } from './placement';
import { apportion, buildRound, roundSpecs, withHelpAtMost } from './round';
import { createRng } from './rng';

const levels = allLevels(PACKS);
const first = levels[0];
const later = levels[3];
if (!first || !later) throw new Error('Foundations needs at least four levels');

describe('sharing out a round', () => {
  it('gives each weight its share by largest remainder', () => {
    expect(apportion([3, 3, 2], 7)).toEqual([3, 2, 2]);
    expect(apportion([1, 1], 10)).toEqual([5, 5]);
    expect(apportion([5, 2], 10).reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('caps help without adding any', () => {
    expect(withHelpAtMost({ type: 'spell', about: 'chords', set: ['major'], guide: 'full' }, 'hint').guide).toBe('hint');
    expect(withHelpAtMost({ type: 'spell', about: 'chords', set: ['major'], guide: 'none' }, 'hint').guide).toBe('none');
    expect(withHelpAtMost({ type: 'fact', about: 'facts', set: ['halfStep'] }, 'none').guide).toBeUndefined();
  });
});

describe('a level round', () => {
  it('has ten questions, made the same from the same seed', () => {
    for (const ref of levels) {
      const round = buildRound(ref, 99, false);
      expect(round, ref.level.id).toHaveLength(ROUND_QUESTIONS);
      expect(buildRound(ref, 99, false)).toEqual(round);
    }
  });

  it('is all new items on the first level, and about 30% earlier ones after that', () => {
    const own = new Set(later.level.questions.map((q) => q.spec));
    for (let seed = 0; seed < 50; seed++) {
      expect(roundSpecs(first, createRng(seed), false).every((s) => first.level.questions.some((q) => q.spec === s))).toBe(true);
      const specs = roundSpecs(later, createRng(seed), false);
      const review = specs.filter((s) => !own.has(s));
      expect(review.length, `seed ${seed}`).toBe(3);
      // New items come first, before earlier levels mix in.
      expect(specs.slice(0, NEW_ITEMS_FIRST).every((s) => own.has(s)), `seed ${seed}`).toBe(true);
      expect(review.every((s) => s.guide !== 'full')).toBe(true);
    }
  });

  it('puts the questions with the most help first', () => {
    const ref = levels.find((r) => r.level.questions.some((q) => q.spec.guide === 'full'));
    if (!ref) throw new Error('no level with full help');
    for (let seed = 0; seed < 50; seed++) {
      const guides = roundSpecs(ref, createRng(seed), false)
        .filter((s) => ref.level.questions.some((q) => q.spec === s))
        .map((s) => s.guide === 'full');
      expect(guides.indexOf(false) === -1 || !guides.slice(guides.indexOf(false)).includes(true), `seed ${seed}`).toBe(true);
    }
  });

  it('asks only the level’s own questions, with no help, when testing out', () => {
    for (const ref of levels) {
      const specs = roundSpecs(ref, createRng(3), true);
      expect(specs).toHaveLength(ROUND_QUESTIONS);
      expect(specs.every((s) => s.guide === undefined || s.guide === 'none'), ref.level.id).toBe(true);
    }
  });

  it('avoids asking the same thing twice in a row', () => {
    for (const ref of levels) {
      for (let seed = 0; seed < 20; seed++) {
        const items = buildRound(ref, seed, false).map((q) => q.item);
        const repeats = items.filter((item, i) => i > 0 && items[i - 1] === item);
        expect(repeats, `${ref.level.id} seed ${seed}`).toEqual([]);
      }
    }
  });
});

describe('the placement check', () => {
  const plan = buildPlacement(5);

  it('asks about levels 1 to 9 in order', () => {
    const order = [...new Set(plan.map((p) => p.ref.index))];
    expect(order).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(buildPlacement(5)).toEqual(plan);
    for (const { question } of plan) expect(question.prompt.length).toBeGreaterThan(0);
  });

  it('stops after two misses, or at the end', () => {
    expect(placementOver(plan, [true, false, true])).toBe(false);
    expect(placementOver(plan, [true, false, false])).toBe(true);
    expect(placementOver(plan, plan.map(() => true))).toBe(true);
  });

  it('passes the levels whose questions all came out right', () => {
    // Level 1 right, level 2 half right, level 3 right, then a miss on level 4.
    const results = [true, true, true, false, true, true, false];
    expect(placedLevels(plan, results).map((r) => r.index)).toEqual([0, 2]);
    // A level only partly answered isn't passed.
    expect(placedLevels(plan, [true, true, true]).map((r) => r.index)).toEqual([0]);
  });
});

describe('what Drill offers', () => {
  it('is everything until a level is passed, then what passed levels taught', () => {
    expect(offeredTypes(null).length).toBeGreaterThan(5);
    const taught = learnedFrom(levels.slice(0, 3));
    expect(offeredTypes(taught).map((e) => e.type).sort()).toEqual(['fact', 'identify', 'spell']);
    expect(offeredAbouts('spell', taught).sort()).toEqual(['chords', 'notes']);
    expect(offeredSet('spell', 'chords', taught).map((o) => o.id)).toEqual(['major']);
    expect(startingSet('chords', offeredSet('spell', 'chords', taught))).toEqual(['major']);
    expect(startingSet('chords', offeredSet('spell', 'chords', null))).toEqual(['major', 'minor']);
    // Level 1 stays on the white keys; level 2 adds the black ones and names any note.
    expect(offeredRoots('spell', 'notes', learnedFrom(levels.slice(0, 1)))?.sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(offeredRoots('spell', 'notes', taught)).toHaveLength(17);
    expect(offeredRoots('identify', 'notes', taught)).toBeUndefined();
    expect(offeredRoots('spell', 'notes', null)).toBeUndefined();
  });
});
