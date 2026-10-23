import { describe, expect, it } from 'vitest';
import { KEY_PREFIX, storageKey } from './keys';
import { memoryStore } from './storage';

describe('storageKey', () => {
  it("puts the app's own prefix on every key", () => {
    expect(storageKey('progress')).toBe('keyedin.progress');
    expect(storageKey('settings').startsWith(KEY_PREFIX)).toBe(true);
  });

  it("can't collide with Dial In's keys on the shared origin", () => {
    expect(storageKey('progress').startsWith('dialin.')).toBe(false);
  });
});

describe('memoryStore', () => {
  it('reads back what was written and forgets what was removed', () => {
    const store = memoryStore({ [storageKey('a')]: '1' });
    expect(store.read(storageKey('a'))).toBe('1');
    expect(store.write(storageKey('b'), '2')).toBe(true);
    expect(store.read(storageKey('b'))).toBe('2');
    store.remove(storageKey('a'));
    expect(store.read(storageKey('a'))).toBeNull();
  });
});
