/**
 * One synth voice: a single note through the signal chain. A trimmed copy of
 * Dial In's voice, without the noise, sub, drive or live knob changes that
 * this app's fixed sounds don't use.
 *
 *   osc 1 ─┐
 *   osc 2 ─┴─> lowpass ─> amp env ─> tremolo ─> out (declick × voice gain) ─> destination
 *                 ^
 *       filter env + LFO (both on filter.detune, so they move in octaves)
 *
 * The same code runs in a live AudioContext and in an OfflineAudioContext.
 */
import { DECLICK_TIME, MAX_CUTOFF_HZ, OSC_MIX_GAIN, RESONANCE_MAX_DB, SEMITONES_PER_OCTAVE, VOICE_GAIN } from '../constants';
import { frequencyOfMidi } from '../theory/frequency';
import {
  ampEnvelopeValue,
  filterEnvPeakOctaves,
  lfoModulationAmount,
  octavesToCents,
  segmentTimeConstant,
  tremoloBaseGain,
  type AmpEnvelope,
} from './modulation';
import type { LfoTarget, Patch, Waveform } from './patches';

export interface VoiceHandle {
  /** MIDI note. */
  readonly note: number;
  readonly startTime: number;
  /** When the voice will have faded out and stopped; Infinity while held. */
  readonly endTime: number;
  /** Resolves once the voice has stopped and released its nodes. */
  readonly ended: Promise<void>;
  /** Start the release stage at `time`. Returns the end time. Later calls do nothing. */
  release(time: number): number;
  /** Fade out quickly from `time`, skipping the release stage. Returns the end time. */
  stop(time: number): number;
}

const OSC_TYPES: Readonly<Record<Waveform, OscillatorType>> = {
  sine: 'sine',
  triangle: 'triangle',
  saw: 'sawtooth',
  square: 'square',
};

class Voice implements VoiceHandle {
  readonly note: number;
  readonly startTime: number;
  readonly ended: Promise<void>;

  private readonly env: AmpEnvelope;
  private readonly releaseSeconds: number;
  /** Output gain while sounding: the voice gain times the sound's level. */
  private readonly level: number;
  private end = Infinity;

  private readonly osc1: OscillatorNode;
  private readonly osc2: OscillatorNode;
  private readonly lfo: OscillatorNode;
  private readonly amp: GainNode;
  private readonly out: GainNode;

  constructor(ctx: BaseAudioContext, patch: Readonly<Patch>, note: number, startTime: number, destination: AudioNode) {
    this.note = note;
    this.startTime = startTime;
    this.env = { attack: patch['amp.attack'], decay: patch['amp.decay'], sustain: patch['amp.sustain'] };
    this.releaseSeconds = patch['amp.release'];
    this.level = VOICE_GAIN * patch['amp.level'];

    const type = OSC_TYPES[patch['osc.wave']];
    const frequency = frequencyOfMidi(note + patch['osc.octave'] * SEMITONES_PER_OCTAVE);
    // Detune is split either side of the note so the pitch stays centred.
    const halfDetune = patch['osc2.detune'] / 2;
    const lfoTarget = patch['lfo.target'];
    const lfoDepth = patch['lfo.depth'];

    this.osc1 = new OscillatorNode(ctx, { type, frequency, detune: -halfDetune });
    this.osc2 = new OscillatorNode(ctx, { type, frequency, detune: halfDetune });
    const oscMix = new GainNode(ctx, { gain: OSC_MIX_GAIN });
    const filter = new BiquadFilterNode(ctx, {
      type: 'lowpass',
      frequency: patch['filter.cutoff'],
      Q: patch['filter.resonance'] * RESONANCE_MAX_DB,
    });
    this.amp = new GainNode(ctx, { gain: 0 });
    const tremolo = new GainNode(ctx, { gain: tremoloBaseGain(lfoTarget, lfoDepth) });
    this.out = new GainNode(ctx, { gain: 0 });
    this.lfo = new OscillatorNode(ctx, { type: 'sine', frequency: patch['lfo.rate'] });
    const lfoGain = new GainNode(ctx, { gain: lfoModulationAmount(lfoTarget, lfoDepth) });
    const nodes: AudioNode[] = [this.osc1, this.osc2, oscMix, filter, this.amp, tremolo, this.out, this.lfo, lfoGain];

    this.osc1.connect(oscMix);
    this.osc2.connect(oscMix);
    oscMix.connect(filter).connect(this.amp).connect(tremolo).connect(this.out).connect(destination);
    this.lfo.connect(lfoGain);
    connectLfo(lfoGain, lfoTarget, { filter, osc1: this.osc1, osc2: this.osc2, tremolo });

    // Amp envelope: linear attack, exponential decay to sustain.
    const gain = this.amp.gain;
    gain.setValueAtTime(0, startTime);
    gain.linearRampToValueAtTime(1, startTime + this.env.attack);
    gain.setTargetAtTime(this.env.sustain, startTime + this.env.attack, segmentTimeConstant(this.env.decay));

    // Filter envelope: instant jump up, exponential decay back to cutoff.
    const peak = filterEnvPeakOctaves(patch['filter.cutoff'], patch['fenv.amount'], MAX_CUTOFF_HZ);
    filter.detune.setValueAtTime(octavesToCents(peak), startTime);
    if (peak > 0) filter.detune.setTargetAtTime(0, startTime, segmentTimeConstant(patch['fenv.decay']));

    // Declick fade-in.
    this.out.gain.setValueAtTime(0, startTime);
    this.out.gain.linearRampToValueAtTime(this.level, startTime + DECLICK_TIME);

    for (const source of this.sources()) source.start(startTime);

    this.ended = new Promise((resolve) => {
      this.osc1.onended = () => {
        for (const node of nodes) node.disconnect();
        resolve();
      };
    });
  }

  get endTime(): number {
    return this.end;
  }

  release(time: number): number {
    if (this.end !== Infinity) return this.end;
    const t = Math.max(time, this.startTime);
    const elapsed = t - this.startTime;
    const level = ampEnvelopeValue(this.env, elapsed);
    const gain = this.amp.gain;
    // Hold the envelope where it is at t, then let it fall. Inside the attack
    // the ramp is re-created up to t, because cancelling removes it entirely.
    gain.cancelScheduledValues(t);
    if (elapsed <= this.env.attack) gain.linearRampToValueAtTime(level, t);
    else gain.setValueAtTime(level, t);
    gain.setTargetAtTime(0, t, segmentTimeConstant(this.releaseSeconds));
    return this.fadeOut(Math.max(t + this.releaseSeconds, this.startTime + DECLICK_TIME));
  }

  stop(time: number): number {
    return this.fadeOut(Math.max(time, this.startTime));
  }

  private sources(): AudioScheduledSourceNode[] {
    return [this.osc1, this.osc2, this.lfo];
  }

  /** Output gain implied by the fades scheduled so far. */
  private outGainAt(t: number): number {
    const fadeIn = Math.min(1, Math.max(0, (t - this.startTime) / DECLICK_TIME));
    const fadeOut = this.end === Infinity ? 1 : Math.min(1, Math.max(0, (this.end - t) / DECLICK_TIME));
    return this.level * Math.min(fadeIn, fadeOut);
  }

  /** Fade the output to silence over DECLICK_TIME from `fadeStart` and stop. Only ever moves the end earlier. */
  private fadeOut(fadeStart: number): number {
    const end = fadeStart + DECLICK_TIME;
    if (end >= this.end) return this.end;
    const gain = this.out.gain;
    const level = this.outGainAt(fadeStart);
    // The out gain only ever has linear segments, so re-ramping to the
    // current level after cancelling keeps it continuous.
    gain.cancelScheduledValues(fadeStart);
    gain.linearRampToValueAtTime(level, fadeStart);
    gain.linearRampToValueAtTime(0, end);
    for (const source of this.sources()) source.stop(end);
    this.end = end;
    return end;
  }
}

function connectLfo(
  lfoGain: GainNode,
  target: LfoTarget,
  to: { readonly filter: BiquadFilterNode; readonly osc1: OscillatorNode; readonly osc2: OscillatorNode; readonly tremolo: GainNode },
): void {
  switch (target) {
    case 'off':
      break;
    case 'cutoff':
      lfoGain.connect(to.filter.detune);
      break;
    case 'pitch':
      lfoGain.connect(to.osc1.detune);
      lfoGain.connect(to.osc2.detune);
      break;
    case 'amp':
      lfoGain.connect(to.tremolo.gain);
      break;
  }
}

/**
 * Build and start a voice playing MIDI `note` from `startTime`. It holds
 * until `release` or `stop` is called.
 */
export function buildVoice(
  ctx: BaseAudioContext,
  patch: Readonly<Patch>,
  note: number,
  startTime: number,
  destination: AudioNode = ctx.destination,
): VoiceHandle {
  return new Voice(ctx, patch, note, startTime, destination);
}
