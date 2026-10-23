import { describe, expect, it } from 'vitest';
import { MAX_CUTOFF_HZ } from '../constants';
import { ampEnvelopeValue, filterEnvPeakOctaves, lfoModulationAmount, tremoloBaseGain } from './modulation';
import { DEFAULT_SOUND_ID, SOUNDS, soundOf } from './patches';

describe('the fixed sounds', () => {
  it('have unique ids, including the default', () => {
    expect(new Set(SOUNDS.map((s) => s.id)).size).toBe(SOUNDS.length);
    expect(soundOf(DEFAULT_SOUND_ID).id).toBe(DEFAULT_SOUND_ID);
    expect(soundOf('no such sound').id).toBe(DEFAULT_SOUND_ID);
  });

  it('stay within ranges the voice can play', () => {
    for (const { id, patch } of SOUNDS) {
      expect(patch['filter.cutoff'], id).toBeGreaterThan(20);
      expect(patch['filter.cutoff'], id).toBeLessThanOrEqual(MAX_CUTOFF_HZ);
      for (const level of [patch['filter.resonance'], patch['amp.sustain'], patch['lfo.depth'], patch['amp.level']]) {
        expect(level, id).toBeGreaterThanOrEqual(0);
        expect(level, id).toBeLessThanOrEqual(1);
      }
      for (const seconds of [patch['amp.attack'], patch['amp.decay'], patch['amp.release'], patch['fenv.decay']]) {
        expect(seconds, id).toBeGreaterThan(0);
      }
    }
  });
});

describe('envelope and LFO maths', () => {
  const env = { attack: 0.1, decay: 1, sustain: 0.5 };

  it('ramps up through the attack and decays towards sustain', () => {
    expect(ampEnvelopeValue(env, 0)).toBe(0);
    expect(ampEnvelopeValue(env, 0.05)).toBeCloseTo(0.5, 10);
    expect(ampEnvelopeValue(env, 0.1)).toBeCloseTo(1, 10);
    expect(ampEnvelopeValue(env, 1.1)).toBeCloseTo(0.505, 2);
  });

  it('never opens the filter past the top', () => {
    expect(filterEnvPeakOctaves(1000, 2, MAX_CUTOFF_HZ)).toBe(2);
    expect(filterEnvPeakOctaves(9000, 2, MAX_CUTOFF_HZ)).toBeCloseTo(1, 10);
  });

  it('scales the LFO for each target', () => {
    expect(lfoModulationAmount('off', 1)).toBe(0);
    expect(lfoModulationAmount('pitch', 0.5)).toBe(50);
    expect(lfoModulationAmount('cutoff', 1)).toBe(3600);
    expect(tremoloBaseGain('amp', 0.2) + lfoModulationAmount('amp', 0.2)).toBeCloseTo(1, 10);
    expect(tremoloBaseGain('cutoff', 1)).toBe(1);
  });
});
