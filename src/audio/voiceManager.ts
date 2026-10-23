/**
 * Live note handling for the on-screen and computer keyboards, from Dial In:
 * note on and off, polyphony with voice stealing, and short triggered notes.
 * Dial In's mono mode and Hold aren't needed here.
 *
 * Voices come from an injected factory, so the allocation logic can be
 * tested without Web Audio.
 */
import type { Patch } from './patches';
import type { VoiceHandle } from './voice';

export type VoiceFactory = (patch: Readonly<Patch>, note: number, startTime: number) => VoiceHandle;

/** held: sounding because a key is down. releasing: in its release stage. stopping: fading out fast. */
type SlotState = 'held' | 'releasing' | 'stopping';

interface Slot {
  readonly note: number;
  readonly voice: VoiceHandle;
  readonly order: number;
  state: SlotState;
}

export class VoiceManager {
  private readonly factory: VoiceFactory;
  private readonly maxVoices: number;
  private patch: Patch;
  private slots: Slot[] = [];
  private nextOrder = 0;
  private heldSnapshot: readonly number[] = [];
  private readonly listeners = new Set<() => void>();

  constructor(factory: VoiceFactory, patch: Readonly<Patch>, maxVoices: number) {
    this.factory = factory;
    this.patch = { ...patch };
    this.maxVoices = maxVoices;
  }

  /** Number of voices still making sound (held or releasing). */
  get activeVoiceCount(): number {
    return this.slots.filter((slot) => slot.state !== 'stopping').length;
  }

  /** Notes currently held down, sorted. Same array until it changes. */
  readonly getHeldNotes = (): readonly number[] => this.heldSnapshot;

  /** Subscribe to changes in held notes. Returns an unsubscribe function. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** New notes use this patch; notes already sounding keep theirs. */
  setPatch(patch: Readonly<Patch>): void {
    this.patch = { ...patch };
  }

  noteOn(note: number, time: number): void {
    for (const slot of this.slots) {
      if (slot.note === note && slot.state === 'held') this.stopSlot(slot, time);
    }
    this.makeRoom(time);
    this.startSlot(note, time, 'held');
    this.notify();
  }

  noteOff(note: number, time: number): void {
    for (const slot of this.slots) {
      if (slot.note === note && slot.state === 'held') this.releaseSlot(slot, time);
    }
    this.notify();
  }

  /** A short note that releases by itself after `duration` seconds. Never counts as held. */
  trigger(note: number, time: number, duration: number): void {
    this.makeRoom(time);
    const voice = this.startSlot(note, time, 'releasing');
    voice.release(time + duration);
    this.notify();
  }

  /** Release every held note. */
  allNotesOff(time: number): void {
    for (const slot of this.slots) this.releaseSlot(slot, time);
    this.notify();
  }

  /** Silence everything immediately. */
  panic(time: number): void {
    for (const slot of this.slots) this.stopSlot(slot, time);
    this.notify();
  }

  /** Steal voices until a new one fits: oldest releasing voice first, then oldest held. */
  private makeRoom(time: number): void {
    while (this.activeVoiceCount >= this.maxVoices) {
      const active = this.slots.filter((slot) => slot.state !== 'stopping');
      const victim =
        active.filter((slot) => slot.state === 'releasing').sort((a, b) => a.order - b.order)[0] ??
        active.sort((a, b) => a.order - b.order)[0];
      if (!victim) return;
      this.stopSlot(victim, time);
    }
  }

  private startSlot(note: number, time: number, state: SlotState): VoiceHandle {
    const voice = this.factory(this.patch, note, time);
    const slot: Slot = { note, voice, order: this.nextOrder++, state };
    this.slots.push(slot);
    void voice.ended.then(() => {
      this.slots = this.slots.filter((s) => s !== slot);
      this.notify();
    });
    return voice;
  }

  private releaseSlot(slot: Slot, time: number): void {
    if (slot.state !== 'held') return;
    slot.state = 'releasing';
    slot.voice.release(time);
  }

  private stopSlot(slot: Slot, time: number): void {
    if (slot.state === 'stopping') return;
    slot.state = 'stopping';
    slot.voice.stop(time);
  }

  private notify(): void {
    const held = [...new Set(this.slots.filter((slot) => slot.state === 'held').map((slot) => slot.note))].sort((a, b) => a - b);
    const changed = held.length !== this.heldSnapshot.length || held.some((note, i) => note !== this.heldSnapshot[i]);
    if (!changed) return;
    this.heldSnapshot = held;
    for (const listener of this.listeners) listener();
  }
}
