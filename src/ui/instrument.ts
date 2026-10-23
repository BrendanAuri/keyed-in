/**
 * Live playing for a screen, shared by Explore, the Scale Finder and the Scale
 * Guide: the keyboard's voices, a player for chords, scales and loops, and the
 * computer keys.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { LiveAudio } from '../audio/live';
import type { Patch } from '../audio/patches';
import { Player } from '../audio/player';
import type { NoteEvent } from '../audio/schedule';
import { buildVoice } from '../audio/voice';
import { VoiceManager } from '../audio/voiceManager';
import { DEFAULT_KEYBOARD_OCTAVE, KEYBOARD_OCTAVE_RANGE, KEYBOARD_TWO_OCTAVE_MIN_WIDTH, LIVE_START_DELAY, MAX_VOICES } from '../constants';
import { isButtonLike, isTypingTarget } from './hooks';
import { OCTAVE_DOWN_KEY, OCTAVE_UP_KEY, noteForKey } from './keyboardMap';

export interface Instrument {
  /** Notes held down right now, sorted. */
  readonly held: readonly number[];
  /** Keys being pressed, for the keyboard to light. */
  readonly pressed: ReadonlySet<number>;
  readonly noteOn: (note: number) => void;
  readonly noteOff: (note: number) => void;
  /** Play scheduled notes, cutting off the last ones. */
  readonly play: (events: readonly NoteEvent[]) => void;
  /** Play scheduled notes over and over until `stop`. */
  readonly loop: (events: readonly NoteEvent[], cycleSeconds: number) => void;
  readonly stop: () => void;
}

export function useInstrument(audio: LiveAudio, patch: Readonly<Patch>): Instrument {
  const [manager] = useState(() => new VoiceManager((p, n, time) => buildVoice(audio.ctx, p, n, time, audio.output), patch, MAX_VOICES));
  const [player] = useState(() => new Player(audio));
  const held = useSyncExternalStore(manager.subscribe, manager.getHeldNotes);
  const [pressed, setPressed] = useState<ReadonlySet<number>>(() => new Set());

  useEffect(() => manager.setPatch(patch), [manager, patch]);
  useEffect(
    () => () => {
      manager.panic(audio.ctx.currentTime);
      player.stop();
    },
    [manager, player, audio],
  );

  const eventTime = useCallback((): number => {
    if (audio.ctx.state !== 'running') void audio.ctx.resume();
    return audio.ctx.currentTime + LIVE_START_DELAY;
  }, [audio]);

  const noteOn = useCallback(
    (n: number) => {
      manager.noteOn(n, eventTime());
      setPressed((keys) => new Set(keys).add(n));
    },
    [manager, eventTime],
  );

  const noteOff = useCallback(
    (n: number) => {
      manager.noteOff(n, eventTime());
      setPressed((keys) => {
        const next = new Set(keys);
        next.delete(n);
        return next;
      });
    },
    [manager, eventTime],
  );

  const play = useCallback((events: readonly NoteEvent[]) => player.play(events, patch), [player, patch]);
  const loop = useCallback((events: readonly NoteEvent[], cycleSeconds: number) => player.loop(events, cycleSeconds, patch), [player, patch]);
  const stop = useCallback(() => player.stop(), [player]);

  return { held, pressed, noteOn, noteOff, play, loop, stop };
}

export const TWO_OCTAVES = `(min-width: ${KEYBOARD_TWO_OCTAVE_MIN_WIDTH}px)`;

/** The keyboard's starting octave: C4 on a phone, one lower where two octaves fit. */
export function startingOctave(): number {
  return DEFAULT_KEYBOARD_OCTAVE - (window.matchMedia(TWO_OCTAVES).matches ? 1 : 0);
}

export function clampOctave(octave: number): number {
  const [low, high] = KEYBOARD_OCTAVE_RANGE;
  return Math.min(high, Math.max(low, octave));
}

interface ComputerKeysOptions {
  /** The keyboard's lowest C is in this octave. */
  readonly octave: number;
  readonly setOctave: (change: (octave: number) => number) => void;
  readonly noteOn: (note: number) => void;
  readonly noteOff: (note: number) => void;
  /** What Space does, if anything. */
  readonly onSpace?: () => void;
}

/** Computer keys: A to K play from the keyboard's lowest C, Z and X change octave, Space does `onSpace`. */
export function useComputerKeys({ octave, setOctave, noteOn, noteOff, onSpace }: ComputerKeysOptions): void {
  const space = useRef(onSpace);
  space.current = onSpace;
  const keyNotes = useRef(new Map<string, number>());

  useEffect(() => {
    const releaseAll = (): void => {
      for (const n of keyNotes.current.values()) noteOff(n);
      keyNotes.current.clear();
    };
    function onKeyDown(event: KeyboardEvent): void {
      if (isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.repeat) {
        if (keyNotes.current.has(event.code)) event.preventDefault();
        return;
      }
      if (event.code === 'Space') {
        if (!space.current || isButtonLike(event.target)) return;
        event.preventDefault();
        space.current();
      } else if (event.code === OCTAVE_DOWN_KEY) {
        setOctave((o) => clampOctave(o - 1));
      } else if (event.code === OCTAVE_UP_KEY) {
        setOctave((o) => clampOctave(o + 1));
      } else {
        const n = noteForKey(event.code, octave);
        if (n === null) return;
        event.preventDefault();
        keyNotes.current.set(event.code, n);
        noteOn(n);
      }
    }
    function onKeyUp(event: KeyboardEvent): void {
      const n = keyNotes.current.get(event.code);
      if (n === undefined) return;
      keyNotes.current.delete(event.code);
      noteOff(n);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAll);
      releaseAll();
    };
  }, [octave, setOctave, noteOn, noteOff]);
}
