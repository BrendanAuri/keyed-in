/**
 * Learn progress (SPEC §9): each level's best round and stars, how Learn was
 * started, which intros have been seen, and the round in progress. Pure
 * functions on immutable data; `progressStore.ts` saves it.
 */
import { PACKS } from '../content';
import type { Pack } from '../content/schema';
import { PASS_MARK, STAR_THRESHOLDS } from '../constants';
import { allLevels, levelKey, refKey, resolveLevel, type LevelRef } from './packs';

const PERCENT = 100;

export interface LevelRecord {
  /** Best round, as a percentage right. */
  readonly best: number;
  readonly stars: number;
  readonly passed: boolean;
  /** Rounds finished. 0 for a level passed in the placement check, or by testing out of a later one. */
  readonly runs: number;
}

/** A round in progress, so it can be picked up after leaving it or a reload. */
export interface RoundRun {
  /** "packId/levelId". */
  readonly level: string;
  /** The pack's version when the round began: the same seed only makes the same questions from the same content. */
  readonly packVersion: number;
  readonly seed: number;
  /** Testing out of a locked level: no intro and no help. */
  readonly testOut: boolean;
  /** Right or wrong, for each question answered so far. */
  readonly results: readonly boolean[];
}

/** How Learn was begun: from level 1, or after the placement check. */
export type LearnStart = 'beginner' | 'placed';

export interface Progress {
  readonly levels: Readonly<Record<string, LevelRecord>>;
  /** Null until the first-time choice between New to music and I know some basics. */
  readonly start: LearnStart | null;
  /** Levels whose intro has been seen, as "packId/levelId". */
  readonly introsSeen: readonly string[];
  readonly lastLevel: string | null;
  readonly run: RoundRun | null;
}

export const EMPTY_PROGRESS: Progress = { levels: {}, start: null, introsSeen: [], lastLevel: null, run: null };

// ── Scoring ──────────────────────────────────────────────────────────────

/** Percentage right, rounded. */
export function scoreOf(results: readonly boolean[]): number {
  return results.length === 0 ? 0 : Math.round((PERCENT * results.filter(Boolean).length) / results.length);
}

/** 0 to 3: one star for each threshold reached (70, 85 and 95% right). */
export function starsFor(score: number): number {
  return STAR_THRESHOLDS.filter((t) => score >= t).length;
}

export interface RoundOutcome {
  readonly right: number;
  readonly total: number;
  readonly score: number;
  readonly stars: number;
  readonly passed: boolean;
}

export function roundOutcome(results: readonly boolean[]): RoundOutcome {
  const score = scoreOf(results);
  return { right: results.filter(Boolean).length, total: results.length, score, stars: starsFor(score), passed: score >= PASS_MARK };
}

// ── Changes ──────────────────────────────────────────────────────────────

export function chooseStart(progress: Progress, start: LearnStart): Progress {
  return { ...progress, start };
}

export function markIntroSeen(progress: Progress, ref: LevelRef): Progress {
  const key = refKey(ref);
  return progress.introsSeen.includes(key) ? progress : { ...progress, introsSeen: [...progress.introsSeen, key] };
}

/** Begin a round, replacing any other round in progress. */
export function startRun(progress: Progress, ref: LevelRef, seed: number, testOut: boolean): Progress {
  const level = refKey(ref);
  return { ...progress, lastLevel: level, run: { level, packVersion: ref.pack.version, seed, testOut, results: [] } };
}

export function recordAnswer(progress: Progress, correct: boolean): Progress {
  if (!progress.run) return progress;
  return { ...progress, run: { ...progress.run, results: [...progress.run.results, correct] } };
}

export function abandonRun(progress: Progress): Progress {
  return progress.run ? { ...progress, run: null } : progress;
}

/** Mark levels passed, with no stars, where they aren't already (placement, and the levels before one tested out of). */
export function passLevels(progress: Progress, refs: readonly LevelRef[]): Progress {
  const levels = { ...progress.levels };
  for (const ref of refs) {
    const key = refKey(ref);
    const record = levels[key];
    if (!record?.passed) levels[key] = { best: record?.best ?? 0, stars: record?.stars ?? 0, passed: true, runs: record?.runs ?? 0 };
  }
  return { ...progress, levels };
}

/**
 * Close the round in progress and keep the level's best. Passing a test out
 * passes the level and every level before it; failing one leaves it locked.
 */
export function finishRun(progress: Progress, ref: LevelRef): Progress {
  const run = progress.run;
  if (!run) return progress;
  const outcome = roundOutcome(run.results);
  const key = refKey(ref);
  const closed: Progress = { ...progress, lastLevel: key, run: null };
  if (run.testOut && !outcome.passed) return closed;
  const previous = progress.levels[key];
  const best = Math.max(previous?.best ?? 0, outcome.score);
  const record: LevelRecord = { best, stars: starsFor(best), passed: (previous?.passed ?? false) || outcome.passed, runs: (previous?.runs ?? 0) + 1 };
  const recorded: Progress = { ...closed, levels: { ...closed.levels, [key]: record } };
  if (!run.testOut) return recorded;
  const before = ref.pack.levels.slice(0, ref.index).map((level, index) => ({ pack: ref.pack, level, index }));
  return passLevels(recorded, before);
}

// ── Questions ────────────────────────────────────────────────────────────

export function levelRecord(progress: Progress, ref: LevelRef): LevelRecord | undefined {
  return progress.levels[refKey(ref)];
}

export function isPassed(progress: Progress, ref: LevelRef): boolean {
  return levelRecord(progress, ref)?.passed ?? false;
}

/** Playable: the pack's first level, a level already passed, or one whose previous level is passed. */
export function isUnlocked(progress: Progress, ref: LevelRef): boolean {
  if (ref.index === 0 || isPassed(progress, ref)) return true;
  const previous = ref.pack.levels[ref.index - 1];
  return previous !== undefined && (progress.levels[levelKey(ref.pack.id, previous.id)]?.passed ?? false);
}

export function introSeen(progress: Progress, ref: LevelRef): boolean {
  return progress.introsSeen.includes(refKey(ref));
}

/** The round in progress for this level, if its content hasn't changed since. */
export function runFor(progress: Progress, ref: LevelRef): RoundRun | null {
  const run = progress.run;
  return run && run.level === refKey(ref) && run.packVersion === ref.pack.version ? run : null;
}

/** The first unlocked level not yet passed, across packs in order; null when everything is passed. */
export function suggestedLevel(progress: Progress, packs: readonly Pack[] = PACKS): LevelRef | null {
  return allLevels(packs).find((ref) => isUnlocked(progress, ref) && !isPassed(progress, ref)) ?? null;
}

export interface PackSummary {
  readonly passed: number;
  readonly total: number;
  readonly stars: number;
  readonly maxStars: number;
}

export function packSummary(progress: Progress, pack: Pack): PackSummary {
  const records = pack.levels.map((level) => progress.levels[levelKey(pack.id, level.id)]);
  return {
    passed: records.filter((r) => r?.passed).length,
    total: pack.levels.length,
    stars: records.reduce((sum, r) => sum + (r?.stars ?? 0), 0),
    maxStars: pack.levels.length * STAR_THRESHOLDS.length,
  };
}

/** Where Home's Continue card goes: the round in progress, else the next level once Learn has begun. */
export function continueLevel(progress: Progress, packs: readonly Pack[] = PACKS): { readonly ref: LevelRef; readonly run: RoundRun | null } | null {
  const runRef = progress.run ? resolveLevel(progress.run.level, packs) : null;
  const run = runRef ? runFor(progress, runRef) : null;
  if (runRef && run) return { ref: runRef, run };
  if (progress.start === null) return null;
  const next = suggestedLevel(progress, packs);
  return next ? { ref: next, run: null } : null;
}

/** Levels passed, in order: what Drill offers. */
export function passedLevels(progress: Progress, packs: readonly Pack[] = PACKS): LevelRef[] {
  return allLevels(packs).filter((ref) => isPassed(progress, ref));
}
