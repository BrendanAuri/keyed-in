import { describe, expect, it } from 'vitest';
import { memoryStore } from '../storage/storage';
import { DEFAULT_SETTINGS, SETTINGS_KEY, loadSettings, saveSettings } from './settings';

describe('settings', () => {
  it('saves under the app prefix and reads back', () => {
    const store = memoryStore();
    expect(SETTINGS_KEY).toBe('keyedin.settings');
    expect(saveSettings(store, { noteNames: false, soundId: 'pad' })).toBe(true);
    expect(loadSettings(store)).toEqual({ noteNames: false, soundId: 'pad' });
  });

  it('starts with note names on and the default sound', () => {
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.noteNames).toBe(true);
  });

  it('falls back to defaults for broken or unknown data', () => {
    expect(loadSettings(memoryStore({ [SETTINGS_KEY]: 'not json' }))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memoryStore({ [SETTINGS_KEY]: '[1,2]' }))).toEqual(DEFAULT_SETTINGS);
    const odd = JSON.stringify({ v: 1, noteNames: 'yes', soundId: 'kazoo' });
    expect(loadSettings(memoryStore({ [SETTINGS_KEY]: odd }))).toEqual(DEFAULT_SETTINGS);
  });
});
