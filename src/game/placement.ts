/**
 * The placement check (SPEC §9.4), for "I know some basics": a question or
 * two from each level that has placement questions, in order, stopping after
 * a couple of misses. Every level whose questions all come out right is passed.
 */
import { PACKS } from '../content';
import type { Pack } from '../content/schema';
import { PLACEMENT_MAX_MISSES } from '../constants';
import { generateQuestion } from '../exercises/questions';
import type { Question } from '../exercises/types';
import { allLevels, refKey, type LevelRef } from './packs';
import { createRng } from './rng';

export interface PlacementQuestion {
  readonly ref: LevelRef;
  readonly question: Question;
}

/** Every placement question, in level order, from one seed. */
export function buildPlacement(seed: number, packs: readonly Pack[] = PACKS): PlacementQuestion[] {
  const rng = createRng(seed);
  return allLevels(packs).flatMap((ref) => (ref.level.placement ?? []).map((spec) => ({ ref, question: generateQuestion(spec, rng) })));
}

/** Over after enough misses, or once every question is answered. */
export function placementOver(plan: readonly PlacementQuestion[], results: readonly boolean[]): boolean {
  return results.filter((r) => !r).length >= PLACEMENT_MAX_MISSES || results.length >= plan.length;
}

/** Levels whose placement questions were all answered, and all right. */
export function placedLevels(plan: readonly PlacementQuestion[], results: readonly boolean[]): LevelRef[] {
  const levels = new Map<string, { ref: LevelRef; passed: boolean }>();
  plan.forEach(({ ref }, i) => {
    const key = refKey(ref);
    const answered = results[i];
    const passed = answered === true && (levels.get(key)?.passed ?? true);
    levels.set(key, { ref, passed });
  });
  return [...levels.values()].filter((l) => l.passed).map((l) => l.ref);
}
