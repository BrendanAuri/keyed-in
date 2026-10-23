import { describe, expect, it } from 'vitest';
import { chance, createRng, hashString, integer, pick, shuffle, weightedPick } from './rng';

describe('rng', () => {
  it('repeats exactly for the same seed', () => {
    const a = createRng(99);
    const b = createRng(99);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it('stays in [0, 1)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 10000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('draws whole numbers at both ends of the range', () => {
    const rng = createRng(5);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(integer(rng, 2, 4));
    expect([...seen].sort()).toEqual([2, 3, 4]);
  });

  it('picks items, respecting weights', () => {
    const rng = createRng(11);
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 4000; i++) counts[weightedPick(rng, ['a', 'b'] as const, [3, 1])]++;
    expect(counts.a / counts.b).toBeGreaterThan(2.5);
    expect(counts.a / counts.b).toBeLessThan(3.5);
    expect(['x', 'y']).toContain(pick(rng, ['x', 'y']));
    expect(() => pick(rng, [])).toThrow();
    expect(chance(rng, 0)).toBe(false);
    expect(chance(rng, 1)).toBe(true);
  });

  it('shuffles into a repeatable order, keeping every item', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const a = shuffle(createRng(3), items);
    expect([...a].sort()).toEqual(items);
    expect(shuffle(createRng(3), items)).toEqual(a);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('hashes strings the same way every time', () => {
    expect(hashString('daily-2026-10-24')).toBe(hashString('daily-2026-10-24'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
