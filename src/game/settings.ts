/**
 * The player's settings (SPEC §16), saved under `keyedin.settings`: whether
 * keys show note names, which sound plays, and the tuning (A4) the Scale
 * Finder and Scale Guide use for frequencies. Versioned, so it can grow.
 */
import { DEFAULT_SOUND_ID, SOUNDS } from '../audio/patches';
import { A4_RANGE_HZ, DEFAULT_A4_HZ } from '../constants';
import { storageKey } from '../storage/keys';
import type { KeyValueStore } from '../storage/storage';

export interface Settings {
  /** Letters on the keyboard's keys. On by default, for beginners. */
  readonly noteNames: boolean;
  readonly soundId: string;
  /** Tuning in Hz: 440 unless a song is tuned differently. */
  readonly a4Hz: number;
}

export const DEFAULT_SETTINGS: Settings = { noteNames: true, soundId: DEFAULT_SOUND_ID, a4Hz: DEFAULT_A4_HZ };

export const SETTINGS_KEY = storageKey('settings');
const SETTINGS_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A tuning the app accepts. */
export function isValidA4(hz: unknown): hz is number {
  const [low, high] = A4_RANGE_HZ;
  return typeof hz === 'number' && Number.isFinite(hz) && hz >= low && hz <= high;
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
    a4Hz: isValidA4(data.a4Hz) ? data.a4Hz : DEFAULT_SETTINGS.a4Hz,
  };
}

/** Returns false if the browser wouldn't save it. */
export function saveSettings(store: KeyValueStore, settings: Settings): boolean {
  return store.write(SETTINGS_KEY, JSON.stringify({ v: SETTINGS_VERSION, ...settings }));
}
