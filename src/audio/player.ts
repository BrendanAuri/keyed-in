/** Plays scheduled notes (schedule.ts) on the live audio. */
import { LIVE_START_DELAY } from '../constants';
import type { LiveAudio } from './live';
import type { Patch } from './patches';
import type { NoteEvent } from './schedule';
import { buildVoice, type VoiceHandle } from './voice';

export class Player {
  private readonly audio: LiveAudio;
  private voices = new Set<VoiceHandle>();

  constructor(audio: LiveAudio) {
    this.audio = audio;
  }

  /** Play the events from now, cutting off whatever this player was already playing. */
  play(events: readonly NoteEvent[], patch: Readonly<Patch>): void {
    const { ctx, output } = this.audio;
    if (ctx.state !== 'running') void ctx.resume();
    this.stop();
    const start = ctx.currentTime + LIVE_START_DELAY;
    for (const event of events) {
      const voice = buildVoice(ctx, patch, event.midi, start + event.at, output);
      voice.release(start + event.at + event.duration);
      this.voices.add(voice);
      void voice.ended.then(() => this.voices.delete(voice));
    }
  }

  /** Silence everything this player started, including notes not yet begun. */
  stop(): void {
    const now = this.audio.ctx.currentTime;
    for (const voice of this.voices) voice.stop(now);
    this.voices = new Set();
  }
}
