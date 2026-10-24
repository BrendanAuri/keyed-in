/**
 * Saving progress under `keyedin.progress` (SPEC §16): one versioned record,
 * and a small observable store so every screen sees the same progress.
 * Anything unreadable is dropped field by field; a record that can't be read
 * at all is copied aside before anything can overwrite it.
 */
import { storageKey } from '../storage/keys';
import type { KeyValueStore } from '../storage/storage';
import { EMPTY_PROGRESS, type LearnStart, type LevelRecord, type Progress, type RoundRun } from './progress';

export const PROGRESS_KEY = storageKey('progress');
/** Unreadable progress is copied to this prefix plus the time, so it isn't lost. */
export const PROGRESS_RESCUE_PREFIX = storageKey('progress.unreadable.');
const PROGRESS_VERSION = 1;

const MAX_SCORE = 100;
const MAX_STARS = 3;
const MAX_SEED = 0xffffffff;
const STARTS: readonly LearnStart[] = ['beginner', 'placed'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isScore = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= MAX_SCORE;

function readLevel(value: unknown): LevelRecord | null {
  if (!isRecord(value) || !isScore(value.best) || typeof value.passed !== 'boolean') return null;
  const stars = isCount(value.stars) ? Math.min(MAX_STARS, value.stars) : 0;
  return { best: value.best, stars, passed: value.passed, runs: isCount(value.runs) ? value.runs : 0 };
}

function readRun(value: unknown): RoundRun | null {
  if (!isRecord(value) || typeof value.level !== 'string' || !isCount(value.packVersion)) return null;
  if (!isCount(value.seed) || value.seed > MAX_SEED || typeof value.testOut !== 'boolean') return null;
  if (!Array.isArray(value.results) || !value.results.every((r) => typeof r === 'boolean')) return null;
  return { level: value.level, packVersion: value.packVersion, seed: value.seed, testOut: value.testOut, results: value.results };
}

/**
 * Read stored progress, dropping anything malformed. Only version 1 exists so
 * far; later versions add their migration steps here. Null if unrecognisable.
 */
function migrate(data: unknown): Progress | null {
  if (!isRecord(data) || typeof data.v !== 'number') return null;
  const levels: Record<string, LevelRecord> = {};
  if (isRecord(data.levels)) {
    for (const [key, value] of Object.entries(data.levels)) {
      const record = readLevel(value);
      if (record) levels[key] = record;
    }
  }
  const start = STARTS.find((s) => s === data.start) ?? null;
  const introsSeen = Array.isArray(data.introsSeen) ? data.introsSeen.filter((k): k is string => typeof k === 'string') : [];
  return {
    levels,
    start,
    introsSeen,
    lastLevel: typeof data.lastLevel === 'string' ? data.lastLevel : null,
    run: readRun(data.run),
  };
}

export interface LoadedProgress {
  readonly progress: Progress;
  /** Where unreadable progress was copied, if it was. */
  readonly rescueKey?: string;
}

export function loadProgress(store: KeyValueStore, now: number): LoadedProgress {
  const raw = store.read(PROGRESS_KEY);
  if (raw === null) return { progress: EMPTY_PROGRESS };
  let progress: Progress | null = null;
  try {
    progress = migrate(JSON.parse(raw));
  } catch {
    progress = null;
  }
  if (progress) return { progress };
  const rescueKey = `${PROGRESS_RESCUE_PREFIX}${now}`;
  store.write(rescueKey, raw);
  return { progress: EMPTY_PROGRESS, rescueKey };
}

/** Returns false if the browser wouldn't save it. */
export function saveProgress(store: KeyValueStore, progress: Progress): boolean {
  return store.write(PROGRESS_KEY, JSON.stringify({ v: PROGRESS_VERSION, ...progress }));
}

export interface ProgressStore {
  readonly getSnapshot: () => Progress;
  readonly subscribe: (listener: () => void) => () => void;
  /** Apply a change, save it and tell every screen. Returns false if saving failed. */
  readonly update: (change: (progress: Progress) => Progress) => boolean;
}

export function createProgressStore(store: KeyValueStore, now: number = Date.now()): ProgressStore {
  let progress = loadProgress(store, now).progress;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => progress,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update: (change) => {
      const next = change(progress);
      if (next === progress) return true;
      progress = next;
      const saved = saveProgress(store, progress);
      for (const listener of listeners) listener();
      return saved;
    },
  };
}
