/**
 * The player's settings (SPEC §16), saved under `keyedin.settings`: whether
 * keys show note names, and which sound plays. Versioned, so it can grow.
 */
import { DEFAULT_SOUND_ID, SOUNDS } from '../audio/patches';
import { storageKey } from '../storage/keys';
import type { KeyValueStore } from '../storage/storage';

export interface Settings {
  /** Letters on the keyboard's keys. On by default, for beginners. */
  readonly noteNames: boolean;
  readonly soundId: string;
}

export const DEFAULT_SETTINGS: Settings = { noteNames: true, soundId: DEFAULT_SOUND_ID };

export const SETTINGS_KEY = storageKey('settings');
const SETTINGS_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Saved settings, with defaults for anything missing or unreadable. */
export function loadSettings(store: KeyValueStore): Settings {
  const raw = store.read(SETTINGS_KEY);
  if (raw === null) return DEFAULT_SETTINGS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (!isRecord(data) || typeof data.v !== 'number') return DEFAULT_SETTINGS;
  const soundId = typeof data.soundId === 'string' && SOUNDS.some((s) => s.id === data.soundId) ? data.soundId : DEFAULT_SETTINGS.soundId;
  return {
    noteNames: typeof data.noteNames === 'boolean' ? data.noteNames : DEFAULT_SETTINGS.noteNames,
    soundId,
  };
}

/** Returns false if the browser wouldn't save it. */
export function saveSettings(store: KeyValueStore, settings: Settings): boolean {
  return store.write(SETTINGS_KEY, JSON.stringify({ v: SETTINGS_VERSION, ...settings }));
}
