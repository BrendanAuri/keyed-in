import { describe, expect, it } from 'vitest';
import { memoryStore } from '../storage/storage';
import { DEFAULT_SETTINGS, SETTINGS_KEY, isValidA4, loadSettings, saveSettings } from './settings';

describe('settings', () => {
  it('saves under the app prefix and reads back', () => {
    const store = memoryStore();
    expect(SETTINGS_KEY).toBe('keyedin.settings');
    expect(saveSettings(store, { noteNames: false, soundId: 'pad', a4Hz: 432 })).toBe(true);
    expect(loadSettings(store)).toEqual({ noteNames: false, soundId: 'pad', a4Hz: 432 });
  });

  it('starts with note names on, the default sound and A4 at 440 Hz', () => {
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.noteNames).toBe(true);
    expect(DEFAULT_SETTINGS.a4Hz).toBe(440);
  });

  it('reads settings saved before the tuning was added', () => {
    const before = JSON.stringify({ v: 1, noteNames: false, soundId: 'organ' });
    expect(loadSettings(memoryStore({ [SETTINGS_KEY]: before }))).toEqual({ noteNames: false, soundId: 'organ', a4Hz: 440 });
  });

  it('falls back to defaults for broken or unknown data', () => {
    expect(loadSettings(memoryStore({ [SETTINGS_KEY]: 'not json' }))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memoryStore({ [SETTINGS_KEY]: '[1,2]' }))).toEqual(DEFAULT_SETTINGS);
    const odd = JSON.stringify({ v: 1, noteNames: 'yes', soundId: 'kazoo', a4Hz: 9000 });
    expect(loadSettings(memoryStore({ [SETTINGS_KEY]: odd }))).toEqual(DEFAULT_SETTINGS);
  });

  it('accepts tunings within reason', () => {
    expect([432, 440, 442.5].every(isValidA4)).toBe(true);
    expect([0, 300, 500, Number.NaN, '440'].some(isValidA4)).toBe(false);
  });
});
