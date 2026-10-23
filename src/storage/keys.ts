/**
 * Every key this app saves under starts with this prefix. Keyed In and Dial In
 * are both served from brendanauri.github.io, so they share one localStorage,
 * and Dial In's keys start with `dialin.`.
 */
export const KEY_PREFIX = 'keyedin.';

/** The full storage key for one of this app's records, e.g. `keyedin.progress`. */
export function storageKey(name: string): string {
  return `${KEY_PREFIX}${name}`;
}
