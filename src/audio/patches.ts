/**
 * The app's fixed sounds (SPEC §6), made on a trimmed copy of Dial In's synth.
 * There are no knobs in this app; these are the only settings it plays. They
 * keep Dial In's parameter names, so a Dial In sound could be brought over later.
 */

export type Waveform = 'sine' | 'triangle' | 'saw' | 'square';
export type LfoTarget = 'off' | 'cutoff' | 'pitch' | 'amp';

/** A complete set of synth settings. */
export interface Patch {
  readonly 'osc.wave': Waveform;
  /** Octaves above or below the note played. */
  readonly 'osc.octave': -1 | 0 | 1;
  /** Cents between the two oscillators; 0 makes them one. */
  readonly 'osc2.detune': number;
  /** Lowpass cutoff in Hz. */
  readonly 'filter.cutoff': number;
  /** 0 to 1. */
  readonly 'filter.resonance': number;
  /** How far the filter envelope opens the cutoff, in octaves. */
  readonly 'fenv.amount': number;
  /** Seconds. */
  readonly 'fenv.decay': number;
  /** Seconds. */
  readonly 'amp.attack': number;
  /** Seconds. */
  readonly 'amp.decay': number;
  /** 0 to 1. */
  readonly 'amp.sustain': number;
  /** Seconds. */
  readonly 'amp.release': number;
  readonly 'lfo.target': LfoTarget;
  /** Hz. */
  readonly 'lfo.rate': number;
  /** 0 to 1. */
  readonly 'lfo.depth': number;
  /**
   * 0 to 1: the voice's output level, so the sounds play at about the same
   * loudness. Not in Dial In, whose sounds share one level.
   */
  readonly 'amp.level': number;
}

export interface Sound {
  readonly id: string;
  readonly name: string;
  readonly patch: Patch;
}

export const SOUNDS: readonly Sound[] = [
  {
    // Soft attack, a decay that fades like a struck key, and a gentle tremolo.
    id: 'keys',
    name: 'Electric piano',
    patch: {
      'osc.wave': 'triangle',
      'osc.octave': 0,
      'osc2.detune': 6,
      'filter.cutoff': 2800,
      'filter.resonance': 0.05,
      'fenv.amount': 1.2,
      'fenv.decay': 0.5,
      'amp.attack': 0.004,
      'amp.decay': 1.8,
      'amp.sustain': 0.25,
      'amp.release': 0.4,
      'lfo.target': 'amp',
      'lfo.rate': 4.5,
      'lfo.depth': 0.15,
      'amp.level': 1,
    },
  },
  {
    // Steady while held, with a touch of vibrato.
    id: 'organ',
    name: 'Organ',
    patch: {
      'osc.wave': 'square',
      'osc.octave': 0,
      'osc2.detune': 4,
      'filter.cutoff': 2200,
      'filter.resonance': 0,
      'fenv.amount': 0,
      'fenv.decay': 0.3,
      'amp.attack': 0.01,
      'amp.decay': 0.2,
      'amp.sustain': 0.85,
      'amp.release': 0.08,
      'lfo.target': 'pitch',
      'lfo.rate': 6,
      'lfo.depth': 0.05,
      // Square waves are loud and the organ doesn't fade while held.
      'amp.level': 0.5,
    },
  },
  {
    // Bright at the start, then gone: every note is clear on its own.
    id: 'pluck',
    name: 'Pluck',
    patch: {
      'osc.wave': 'saw',
      'osc.octave': 0,
      'osc2.detune': 0,
      'filter.cutoff': 500,
      'filter.resonance': 0.2,
      'fenv.amount': 3.5,
      'fenv.decay': 0.25,
      'amp.attack': 0.002,
      'amp.decay': 0.7,
      'amp.sustain': 0,
      'amp.release': 0.3,
      'lfo.target': 'off',
      'lfo.rate': 1,
      'lfo.depth': 0,
      'amp.level': 1,
    },
  },
  {
    // Slow swell and a long tail: good for hearing a chord's colour.
    id: 'pad',
    name: 'Pad',
    patch: {
      'osc.wave': 'saw',
      'osc.octave': 0,
      'osc2.detune': 16,
      'filter.cutoff': 1300,
      'filter.resonance': 0.1,
      'fenv.amount': 0.8,
      'fenv.decay': 1.2,
      'amp.attack': 0.35,
      'amp.decay': 1.5,
      'amp.sustain': 0.8,
      'amp.release': 1.2,
      'lfo.target': 'cutoff',
      'lfo.rate': 0.3,
      'lfo.depth': 0.12,
      'amp.level': 0.75,
    },
  },
];

export const DEFAULT_SOUND_ID = 'keys';

/** The sound with this id, or the default sound. */
export function soundOf(id: string): Sound {
  const sound = SOUNDS.find((s) => s.id === id) ?? SOUNDS.find((s) => s.id === DEFAULT_SOUND_ID);
  if (!sound) throw new Error('The default sound is missing');
  return sound;
}
