/**
 * A level's round (SPEC §9.1): ten questions from one seed, about 70% on the
 * level's new items and 30% going back over earlier levels. The level's own
 * questions with the most help come first, and earlier levels mix in only
 * after the first few, so new items appear on their own briefly before
 * they're mixed (SPEC §21).
 */
import { NEW_ITEMS_FIRST, REVIEW_SHARE, ROUND_QUESTIONS } from '../constants';
import { generateQuestion } from '../exercises/questions';
import type { Guide, Question, QuestionSpec } from '../exercises/types';
import type { LevelRef } from './packs';
import { createRng, pick, shuffle, weightedPick, type Rng } from './rng';

/** How many tries to find an item not yet asked in the round before accepting a repeat. */
const REPEAT_TRIES = 8;
const HELP_ORDER: Readonly<Record<Guide, number>> = { full: 0, hint: 1, none: 2 };

/** How many of `total` each weight gets, by largest remainder, so every kind of question gets its share. */
export function apportion(weights: readonly number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (sum > 0 ? (w / sum) * total : 0));
  const counts = exact.map(Math.floor);
  let left = total - counts.reduce((a, b) => a + b, 0);
  const byRemainder = exact.map((e, i) => ({ i, rest: e - Math.floor(e) })).sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    counts[i] = (counts[i] ?? 0) + 1;
    left--;
  }
  return counts;
}

/** The same spec with no more help than `most`: going back over a level, or testing out of one. */
export function withHelpAtMost(spec: QuestionSpec, most: Guide): QuestionSpec {
  if (spec.guide === undefined || HELP_ORDER[spec.guide] >= HELP_ORDER[most]) return spec;
  return { ...spec, guide: most };
}

/** What each question of a round asks, in order. A test out asks only the level's own, with no help. */
export function roundSpecs(ref: LevelRef, rng: Rng, testOut: boolean): QuestionSpec[] {
  const own = ref.level.questions;
  const earlier = ref.pack.levels.slice(0, ref.index).filter((l) => l.questions.length > 0);
  const reviewCount = testOut || earlier.length === 0 ? 0 : Math.round(ROUND_QUESTIONS * REVIEW_SHARE);
  const counts = apportion(
    own.map((q) => q.weight),
    ROUND_QUESTIONS - reviewCount,
  );
  const drawn = shuffle(
    rng,
    own.flatMap((q, i) => Array.from({ length: counts[i] ?? 0 }, () => q.spec)),
  );
  // Full help first (sort is stable, so the rest keep their shuffled order).
  const ownSpecs = drawn.sort((a, b) => Number(a.guide !== 'full') - Number(b.guide !== 'full'));
  const review = Array.from({ length: reviewCount }, () => {
    const level = pick(rng, earlier);
    const spec = weightedPick(
      rng,
      level.questions.map((q) => q.spec),
      level.questions.map((q) => q.weight),
    );
    return withHelpAtMost(spec, 'hint');
  });
  const slots = new Set(
    shuffle(
      rng,
      Array.from({ length: ROUND_QUESTIONS - NEW_ITEMS_FIRST }, (_, i) => i + NEW_ITEMS_FIRST),
    ).slice(0, reviewCount),
  );
  const specs: QuestionSpec[] = [];
  for (let i = 0; i < ROUND_QUESTIONS; i++) {
    const next = slots.has(i) ? review.shift() : ownSpecs.shift();
    if (next) specs.push(next);
  }
  return testOut ? specs.map((s) => withHelpAtMost(s, 'none')) : specs;
}

/** The round's questions, all from one seed, so a round left halfway can be made again and picked up. */
export function buildRound(ref: LevelRef, seed: number, testOut: boolean): Question[] {
  const rng = createRng(seed);
  const used = new Set<string>();
  let last = '';
  return roundSpecs(ref, rng, testOut).map((spec) => {
    let q = generateQuestion(spec, rng);
    // Something not asked yet in this round if possible, and never the same twice in a row if that can be helped.
    for (let i = 0; i < REPEAT_TRIES && used.has(q.item); i++) q = generateQuestion(spec, rng);
    for (let i = 0; i < REPEAT_TRIES && q.item === last; i++) q = generateQuestion(spec, rng);
    used.add(q.item);
    last = q.item;
    return q;
  });
}
