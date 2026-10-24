import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash, type Route } from './router';

describe('routes', () => {
  it('reads hashes, falling back to Home', () => {
    expect(parseRoute('#/explore')).toEqual({ name: 'explore' });
    expect(parseRoute('#explore')).toEqual({ name: 'explore' });
    expect(parseRoute('#/finder')).toEqual({ name: 'finder' });
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/nowhere')).toEqual({ name: 'home' });
  });

  it('puts a scale in the guide address, encoding sharps', () => {
    expect(routeHash({ name: 'guide', root: 'C#', scale: 'dorian' })).toBe('#/guide/C%23/dorian');
    expect(parseRoute('#/guide/C%23/dorian')).toEqual({ name: 'guide', root: 'C#', scale: 'dorian' });
    expect(parseRoute('#/guide/C')).toEqual({ name: 'guide' });
    expect(parseRoute('#/guide/%E0%A4%A/major')).toEqual({ name: 'guide', root: '%E0%A4%A', scale: 'major' });
  });

  it('opens a level by its pack and level, or the level list', () => {
    expect(parseRoute('#/learn/foundations/keyboard')).toEqual({ name: 'learn', pack: 'foundations', level: 'keyboard' });
    expect(parseRoute('#/learn/foundations')).toEqual({ name: 'learn' });
  });

  it('round-trips every route', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'learn' },
      { name: 'learn', pack: 'foundations', level: 'minor-chords' },
      { name: 'placement' },
      { name: 'explore' },
      { name: 'finder' },
      { name: 'drill' },
      { name: 'guide' },
      { name: 'guide', root: 'Eb', scale: 'naturalMinor' },
    ];
    for (const route of routes) expect(parseRoute(routeHash(route))).toEqual(route);
  });
});
