/**
 * Drill (SPEC §11): endless questions from a spec, one seed for the whole run
 * so a drill can be replayed, and never the same item twice in a row. Once
 * levels are passed, the picker offers what they taught.
 */
import { EXERCISES, defaultSet, setOptions, type ExerciseInfo, type SetOption } from '../exercises/catalogue';
import { generateQuestion } from '../exercises/questions';
import type { About, ExerciseType, Question, QuestionSpec } from '../exercises/types';
import type { LevelRef } from './packs';
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

/** What levels taught about one subject of one question type. */
export interface LearnedSubject {
  readonly set: ReadonlySet<string>;
  /** The roots asked, or null when every root was (a level on the white keys keeps Drill to the white keys). */
  readonly roots: ReadonlySet<string> | null;
}

/** What a set of levels taught: for each question type, what it was about, which set items and which roots. */
export type Learned = ReadonlyMap<ExerciseType, ReadonlyMap<About, LearnedSubject>>;

/** The question types the picker offers: all of them, or (with `learned`) those levels have taught. */
export function offeredTypes(learned: Learned | null): ExerciseInfo[] {
  return EXERCISES.filter((e) => !learned || learned.has(e.type));
}

export function offeredAbouts(type: ExerciseType, learned: Learned | null): About[] {
  const abouts = EXERCISES.find((e) => e.type === type)?.abouts ?? [];
  return abouts.filter((a) => !learned || learned.get(type)?.has(a));
}

export function offeredSet(type: ExerciseType, about: About, learned: Learned | null): SetOption[] {
  const ids = learned?.get(type)?.get(about)?.set;
  return setOptions(type, about).filter((o) => !learned || ids?.has(o.id));
}

/** The roots a drill asks about: those its levels asked, or every root (undefined). */
export function offeredRoots(type: ExerciseType, about: About, learned: Learned | null): string[] | undefined {
  const roots = learned?.get(type)?.get(about)?.roots;
  return roots ? [...roots] : undefined;
}

/** The chips chosen to begin with: the beginner's usual pair where it's offered, otherwise the first two offered. */
export function startingSet(about: About, offered: readonly SetOption[]): string[] {
  const usual = defaultSet(about).filter((id) => offered.some((o) => o.id === id));
  return usual.length > 0 ? usual : offered.slice(0, 2).map((o) => o.id);
}

export function learnedFrom(levels: readonly LevelRef[]): Learned {
  const learned = new Map<ExerciseType, Map<About, LearnedSubject>>();
  for (const { level } of levels) {
    for (const { spec } of level.questions) {
      const abouts = learned.get(spec.type) ?? new Map<About, LearnedSubject>();
      const known = abouts.get(spec.about);
      const roots = known ? known.roots : new Set<string>();
      abouts.set(spec.about, {
        set: new Set([...(known?.set ?? []), ...spec.set]),
        // Any spec on every root opens every root.
        roots: roots && spec.roots ? new Set([...roots, ...spec.roots]) : null,
      });
      learned.set(spec.type, abouts);
    }
  }
  return learned;
}
