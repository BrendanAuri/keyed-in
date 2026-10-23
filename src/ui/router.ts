/**
 * Hash routes, so the browser's back button and reloads keep you where you
 * were: #/ (Home) and #/explore. More screens join as their milestones land.
 */
import { useCallback, useSyncExternalStore } from 'react';

export type Route = { readonly name: 'home' } | { readonly name: 'explore' };

export function parseRoute(hash: string): Route {
  const [first] = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (first === 'explore') return { name: 'explore' };
  return { name: 'home' };
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'explore':
      return '#/explore';
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
