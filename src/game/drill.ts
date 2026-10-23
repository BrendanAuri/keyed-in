/**
 * Drill (SPEC §11): endless questions from a spec, one seed for the whole run
 * so a drill can be replayed, and never the same item twice in a row.
 */
import { generateQuestion } from '../exercises/questions';
import type { Question, QuestionSpec } from '../exercises/types';
import { createRng } from './rng';

/** How many tries to find a different item before accepting a repeat (a one-item set can only repeat). */
const REPEAT_TRIES = 8;

export interface Drill {
  readonly seed: number;
  next(): Question;
}

export function createDrill(spec: QuestionSpec, seed: number): Drill {
  const rng = createRng(seed);
  let last: string | null = null;
  return {
    seed,
    next() {
      let q = generateQuestion(spec, rng);
      for (let i = 0; i < REPEAT_TRIES && q.item === last; i++) q = generateQuestion(spec, rng);
      last = q.item;
      return q;
    },
  };
}
