import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash, type Route } from './router';

describe('routes', () => {
  it('reads hashes, falling back to Home', () => {
    expect(parseRoute('#/explore')).toEqual({ name: 'explore' });
    expect(parseRoute('#explore')).toEqual({ name: 'explore' });
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/nowhere')).toEqual({ name: 'home' });
  });

  it('round-trips every route', () => {
    const routes: Route[] = [{ name: 'home' }, { name: 'explore' }];
    for (const route of routes) expect(parseRoute(routeHash(route))).toEqual(route);
  });
});
