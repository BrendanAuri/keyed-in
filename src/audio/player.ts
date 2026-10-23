/** Plays scheduled notes (schedule.ts) on the live audio, once or on a loop. */
import { LIVE_START_DELAY, LOOP_LOOKAHEAD_SECONDS } from '../constants';
import type { LiveAudio } from './live';
import type { Patch } from './patches';
import type { NoteEvent } from './schedule';
import { buildVoice, type VoiceHandle } from './voice';

export class Player {
  private readonly audio: LiveAudio;
  private voices = new Set<VoiceHandle>();
  private loopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(audio: LiveAudio) {
    this.audio = audio;
  }

  /** Play the events from now, cutting off whatever this player was already playing. */
  play(events: readonly NoteEvent[], patch: Readonly<Patch>): void {
    this.stop();
    this.schedule(events, patch, this.startTime());
  }

  /**
   * Play the events over and over, `cycleSeconds` apart, until `stop`. Each
   * time round is scheduled a little before it's due, so there's no gap.
   */
  loop(events: readonly NoteEvent[], cycleSeconds: number, patch: Readonly<Patch>): void {
    this.stop();
    const { ctx } = this.audio;
    let next = this.startTime();
    const scheduleNext = (): void => {
      this.schedule(events, patch, next);
      next += cycleSeconds;
      this.loopTimer = setTimeout(scheduleNext, Math.max(0, (next - LOOP_LOOKAHEAD_SECONDS - ctx.currentTime) * 1000));
    };
    scheduleNext();
  }

  /** Silence everything this player started, including notes not yet begun, and end any loop. */
  stop(): void {
    if (this.loopTimer !== null) clearTimeout(this.loopTimer);
    this.loopTimer = null;
    const now = this.audio.ctx.currentTime;
    for (const voice of this.voices) voice.stop(now);
    this.voices = new Set();
  }

  private startTime(): number {
    const { ctx } = this.audio;
    if (ctx.state !== 'running') void ctx.resume();
    return ctx.currentTime + LIVE_START_DELAY;
  }

  private schedule(events: readonly NoteEvent[], patch: Readonly<Patch>, start: number): void {
    const { ctx, output } = this.audio;
    for (const event of events) {
      const voice = buildVoice(ctx, patch, event.midi, start + event.at, output);
      voice.release(start + event.at + event.duration);
      this.voices.add(voice);
      void voice.ended.then(() => this.voices.delete(voice));
    }
  }
}
