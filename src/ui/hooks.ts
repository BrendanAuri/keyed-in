import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { loadSettings, saveSettings, type Settings } from '../game/settings';
import { browserStore, type KeyValueStore } from '../storage/storage';

/** Whether a CSS media query currently matches, updating when it changes. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

/** True when keystrokes should go to the focused element rather than to shortcuts. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'range', 'file', 'submit', 'reset'].includes(target.type);
  }
  return false;
}

/** True for elements that Space activates on their own. */
export function isButtonLike(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, [role="button"], [role="radio"], a[href]') !== null;
}

let store: KeyValueStore | null = null;

/** The app's storage, created on first use. */
export function appStore(): KeyValueStore {
  store ??= browserStore();
  return store;
}

/** The player's settings, saved whenever they change. */
export function useSettings(): [Settings, (change: Partial<Settings>) => void] {
  const [settings, setSettings] = useState(() => loadSettings(appStore()));
  useEffect(() => {
    saveSettings(appStore(), settings);
  }, [settings]);
  const update = useCallback((change: Partial<Settings>) => setSettings((current) => ({ ...current, ...change })), []);
  return [settings, update];
}
