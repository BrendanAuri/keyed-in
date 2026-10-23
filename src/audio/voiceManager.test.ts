import { describe, expect, it } from 'vitest';
import { soundOf, type Patch } from './patches';
import type { VoiceHandle } from './voice';
import { VoiceManager } from './voiceManager';

class FakeVoice implements VoiceHandle {
  readonly note: number;
  readonly startTime: number;
  readonly ended: Promise<void>;
  readonly patch: Readonly<Patch>;
  endTime = Infinity;
  releasedAt: number | null = null;
  stoppedAt: number | null = null;
  private resolve: () => void = () => undefined;

  constructor(patch: Readonly<Patch>, note: number, startTime: number) {
    this.patch = patch;
    this.note = note;
    this.startTime = startTime;
    this.ended = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  release(time: number): number {
    if (this.endTime === Infinity) {
      this.releasedAt = time;
      this.endTime = time + 1;
    }
    return this.endTime;
  }

  stop(time: number): number {
    this.stoppedAt = time;
    this.endTime = Math.min(this.endTime, time + 0.005);
    return this.endTime;
  }

  finish(): void {
    this.resolve();
  }
}

function setup(maxVoices = 8) {
  const voices: FakeVoice[] = [];
  const manager = new VoiceManager(
    (patch, note, time) => {
      const voice = new FakeVoice(patch, note, time);
      voices.push(voice);
      return voice;
    },
    soundOf('keys').patch,
    maxVoices,
  );
  const at = (i: number): FakeVoice => {
    const voice = voices[i];
    if (!voice) throw new Error(`no voice ${i}`);
    return voice;
  };
  return { manager, voices, at };
}

describe('playing from the keyboard', () => {
  it('plays and releases notes independently', () => {
    const { manager, at } = setup();
    manager.noteOn(60, 0);
    manager.noteOn(64, 0.1);
    expect(manager.getHeldNotes()).toEqual([60, 64]);
    manager.noteOff(60, 0.5);
    expect(at(0).releasedAt).toBe(0.5);
    expect(at(1).releasedAt).toBeNull();
    expect(manager.getHeldNotes()).toEqual([64]);
  });

  it('retriggers a note that is already held', () => {
    const { manager, voices, at } = setup();
    manager.noteOn(60, 0);
    manager.noteOn(60, 0.2);
    expect(voices).toHaveLength(2);
    expect(at(0).stoppedAt).toBe(0.2);
    expect(manager.getHeldNotes()).toEqual([60]);
  });

  it('steals the oldest releasing voice first, then the oldest held one', () => {
    const { manager, at } = setup(2);
    manager.noteOn(60, 0);
    manager.noteOn(62, 0.1);
    manager.noteOff(62, 0.2);
    manager.noteOn(64, 0.3);
    expect(at(1).stoppedAt).toBe(0.3);
    expect(at(0).stoppedAt).toBeNull();
    manager.noteOn(65, 0.4);
    expect(at(0).stoppedAt).toBe(0.4);
    expect(manager.activeVoiceCount).toBe(2);
  });

  it('forgets voices once they have ended', async () => {
    const { manager, at } = setup();
    manager.noteOn(60, 0);
    manager.noteOff(60, 0.1);
    expect(manager.activeVoiceCount).toBe(1);
    at(0).finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(manager.activeVoiceCount).toBe(0);
  });

  it('uses a new sound for new notes only', () => {
    const { manager, at } = setup();
    manager.noteOn(60, 0);
    manager.setPatch(soundOf('pad').patch);
    manager.noteOn(64, 0.1);
    expect(at(0).patch).toEqual(soundOf('keys').patch);
    expect(at(1).patch).toEqual(soundOf('pad').patch);
  });
});

describe('short notes and control', () => {
  it('triggers a note that releases itself and is never held', () => {
    const { manager, at } = setup();
    manager.trigger(48, 0, 1.5);
    expect(at(0).releasedAt).toBe(1.5);
    expect(manager.getHeldNotes()).toEqual([]);
  });

  it('releases everything held, or silences everything at once', () => {
    const { manager, voices, at } = setup();
    manager.noteOn(60, 0);
    manager.noteOn(64, 0);
    manager.allNotesOff(0.2);
    expect(at(0).releasedAt).toBe(0.2);
    expect(manager.getHeldNotes()).toEqual([]);
    manager.trigger(67, 0.3, 1);
    manager.panic(0.4);
    expect(voices.every((voice) => voice.stoppedAt === 0.4)).toBe(true);
  });

  it('notifies subscribers only when held notes change, with a stable snapshot', () => {
    const { manager } = setup();
    let calls = 0;
    const unsubscribe = manager.subscribe(() => calls++);
    manager.noteOn(60, 0);
    const snapshot = manager.getHeldNotes();
    manager.trigger(72, 0.1, 1);
    expect(manager.getHeldNotes()).toBe(snapshot);
    manager.noteOff(60, 0.2);
    expect(calls).toBe(2);
    unsubscribe();
    manager.noteOn(62, 0.3);
    expect(calls).toBe(2);
  });
});
