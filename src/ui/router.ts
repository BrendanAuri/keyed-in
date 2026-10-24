/**
 * Hash routes, so the browser's back button and reloads keep you where you
 * were: #/ (Home), #/learn, a level (#/learn/foundations/minor-chords),
 * #/placement, #/drill, #/explore, #/finder and #/guide, with a scale in the
 * guide's address (#/guide/Eb/naturalMinor). More screens join as their
 * milestones land.
 */
import { useCallback, useSyncExternalStore } from 'react';

export type Route =
  | { readonly name: 'home' }
  /** A level by its pack and level ids, or the list of levels when there's neither. */
  | { readonly name: 'learn'; readonly pack?: string; readonly level?: string }
  | { readonly name: 'placement' }
  | { readonly name: 'explore' }
  | { readonly name: 'finder' }
  | { readonly name: 'drill' }
  /** `root` is a note in ASCII ("Eb"), `scale` a scale type id. Both or neither. */
  | { readonly name: 'guide'; readonly root?: string; readonly scale?: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(safeDecode);
  const [first, second, third] = parts;
  if (first === 'learn') return second && third ? { name: 'learn', pack: second, level: third } : { name: 'learn' };
  if (first === 'placement') return { name: 'placement' };
  if (first === 'explore') return { name: 'explore' };
  if (first === 'finder') return { name: 'finder' };
  if (first === 'drill') return { name: 'drill' };
  if (first === 'guide') return second && third ? { name: 'guide', root: second, scale: third } : { name: 'guide' };
  return { name: 'home' };
}

function safeDecode(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

export function routeHash(route: Route): string {
  const e = encodeURIComponent;
  switch (route.name) {
    case 'home':
      return '#/';
    case 'learn':
      return route.pack && route.level ? `#/learn/${e(route.pack)}/${e(route.level)}` : '#/learn';
    case 'placement':
      return '#/placement';
    case 'explore':
      return '#/explore';
    case 'finder':
      return '#/finder';
    case 'drill':
      return '#/drill';
    case 'guide':
      return route.root && route.scale ? `#/guide/${e(route.root)}/${e(route.scale)}` : '#/guide';
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export type Navigate = (route: Route, options?: { readonly replace?: boolean }) => void;

/** The current route, and a function to go to another (adding a history entry unless `replace`). */
export function useRoute(): [Route, Navigate] {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const navigate = useCallback<Navigate>((route, options) => {
    const next = routeHash(route);
    if (options?.replace) window.location.replace(next);
    else window.location.hash = next;
  }, []);
  return [parseRoute(hash), navigate];
}
