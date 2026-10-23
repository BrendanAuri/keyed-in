/**
 * Seeded random numbers, so any question can be replayed from its seed
 * (SPEC §4). From Dial In, plus `shuffle`.
 */

/** Returns numbers in [0, 1). */
export type Rng = () => number;

/** mulberry32: small, fast and good enough for game content. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32-bit hash of a string (FNV-1a), for seeds everyone derives the same way. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A fresh 32-bit seed. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

/** A whole number from `min` to `max`, both included. */
export function integer(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error('pick() needs at least one item');
  return item;
}

/** Pick with relative weights (they don't need to sum to 1). */
export function weightedPick<T>(rng: Rng, items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i] ?? 0;
    const item = items[i];
    if (roll < 0 && item !== undefined) return item;
  }
  return pick(rng, items.slice(-1));
}

/** A shuffled copy (Fisher–Yates), so answer buttons don't always come in the same order. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}
