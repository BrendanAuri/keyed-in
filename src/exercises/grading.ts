/**
 * How well a question went, for the review queue (SPEC §8): wrong is Again,
 * right but slow (or with a hint) is Hard, right is Good, right and fast is
 * Easy. The times are never shown; they only set this rating.
 */
import { TIME_LIMITS } from '../constants';
import type { ExerciseType, Result } from './types';

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export function rate(type: ExerciseType, result: Result, seconds: number, usedHint: boolean): Rating {
  if (!result.correct) return 'again';
  const limits = TIME_LIMITS[type] ?? { fast: 0, slow: Infinity };
  if (usedHint || seconds > limits.slow) return 'hard';
  return seconds <= limits.fast ? 'easy' : 'good';
}
