import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { LiveAudio } from '../../audio/live';
import { SOUNDS, soundOf } from '../../audio/patches';
import { Player } from '../../audio/player';
import { buildVoice } from '../../audio/voice';
import { VoiceManager } from '../../audio/voiceManager';
import { cadenceEvents, chordEvents, scaleEvents, type ChordStyle } from '../../audio/schedule';
import {
  DEFAULT_KEYBOARD_OCTAVE,
  KEYBOARD_MAX_OCTAVES,
  KEYBOARD_OCTAVE_RANGE,
  KEYBOARD_TWO_OCTAVE_MIN_WIDTH,
  LIVE_START_DELAY,
  MAX_VOICES,
} from '../../constants';
import { CHORD_TYPES, chordName, chordTypeOf, inversionName } from '../../theory/chords';
import { key } from '../../theory/keys';
import { formatNote, midi, note, sameNote, type Note } from '../../theory/notes';
import { SCALE_TYPES, scaleName } from '../../theory/scales';
import { Keyboard } from '../components/Keyboard';
import { NotePicker } from '../components/NotePicker';
import { Segmented } from '../components/Segmented';
import { describePlayed, scaleKeyMode, selectionDegrees, selectionPitches, type Selection } from '../explore';
import { isButtonLike, isTypingTarget, useMediaQuery, useSettings } from '../hooks';
import { cAtOrBelow, octavesToShow } from '../keyboardLayout';
import { OCTAVE_DOWN_KEY, OCTAVE_UP_KEY, lowestNoteForOctave, noteForKey } from '../keyboardMap';

type Kind = Selection['kind'];

const KINDS: readonly { readonly value: Kind; readonly label: string }[] = [
  { value: 'chord', label: 'Chord' },
  { value: 'scale', label: 'Scale' },
];

const CHORD_STYLES: readonly { readonly style: ChordStyle; readonly label: string }[] = [
  { style: 'together', label: 'Play' },
  { style: 'strum', label: 'Strum' },
  { style: 'arpeggio', label: 'One at a time' },
];

const TWO_OCTAVES = `(min-width: ${KEYBOARD_TWO_OCTAVE_MIN_WIDTH}px)`;

function clampOctave(octave: number): number {
  const [low, high] = KEYBOARD_OCTAVE_RANGE;
  return Math.min(high, Math.max(low, octave));
}

/**
 * Explore (SPEC §13): a keyboard that names whatever you play, and a picker
 * that lights up any chord or scale and plays it. No scores.
 */
export function Explore({ audio }: { readonly audio: LiveAudio }) {
  const [settings, updateSettings] = useSettings();
  const sound = soundOf(settings.soundId);
  const wide = useMediaQuery(TWO_OCTAVES);
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const [octave, setOctave] = useState(() => DEFAULT_KEYBOARD_OCTAVE - (window.matchMedia(TWO_OCTAVES).matches ? 1 : 0));
  const [pressed, setPressed] = useState<ReadonlySet<number>>(() => new Set());

  const [kind, setKind] = useState<Kind>('chord');
  const [root, setRoot] = useState<Note>(() => note('C'));
  const [chordTypeId, setChordTypeId] = useState('major');
  const [scaleTypeId, setScaleTypeId] = useState('major');
  const [inversion, setInversion] = useState(0);
  const [lit, setLit] = useState(true);

  const [manager] = useState(() => new VoiceManager((patch, n, time) => buildVoice(audio.ctx, patch, n, time, audio.output), sound.patch, MAX_VOICES));
  const [player] = useState(() => new Player(audio));
  const held = useSyncExternalStore(manager.subscribe, manager.getHeldNotes);

  useEffect(() => manager.setPatch(sound.patch), [manager, sound]);
  useEffect(
    () => () => {
      manager.panic(audio.ctx.currentTime);
      player.stop();
    },
    [manager, player, audio],
  );

  // After the keys are let go, keep naming the most notes held at once, so a
  // chord's name stays up to read. Moving one finger keeps the newer chord.
  const [lastPlayed, setLastPlayed] = useState<readonly number[]>([]);
  const peak = useRef<readonly number[] | null>(null);
  useEffect(() => {
    if (held.length === 0) {
      peak.current = null;
      return;
    }
    if (!peak.current || held.length >= peak.current.length) peak.current = held;
    setLastPlayed(peak.current);
  }, [held]);
  const named = describePlayed(held.length > 0 ? held : lastPlayed);

  const selection: Selection =
    kind === 'chord' ? { kind, root, chordTypeId, inversion: Math.min(inversion, chordInversions(chordTypeId) - 1) } : { kind, root, scaleTypeId };
  const pitches = selectionPitches(selection, octave);
  const lowestNote = lowestNoteForOctave(octave);
  const highestLit = lit ? Math.max(...pitches.map(midi)) : lowestNote;
  const octaves = octavesToShow(cAtOrBelow(lowestNote), highestLit, wide ? 2 : 1, KEYBOARD_MAX_OCTAVES);
  const marked = new Map(lit ? pitches.map((p) => [midi(p), formatNote(p)] as const) : []);
  const roots = new Set(lit ? pitches.filter((p) => sameNote(p, root)).map(midi) : []);

  /** Any change to the picker lights the keyboard up again. */
  function pick(change: () => void): void {
    change();
    setLit(true);
  }

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

  const midis = pitches.map(midi);
  const playChord = (style: ChordStyle) => {
    setLit(true);
    player.play(chordEvents(midis, style), sound.patch);
  };
  const playScale = (direction: 'up' | 'upAndDown') => {
    setLit(true);
    player.play(scaleEvents(midis, direction), sound.patch);
  };
  const keyMode = kind === 'scale' ? scaleKeyMode(scaleTypeId) : null;
  const playDefault = useRef<() => void>(() => undefined);
  playDefault.current = kind === 'chord' ? () => playChord('together') : () => playScale('up');

  // Computer keyboard: notes, Z and X for octaves, Space to play the chord or scale.
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
        if (isButtonLike(event.target)) return;
        event.preventDefault();
        playDefault.current();
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
  }, [octave, noteOn, noteOff]);

  const degrees = selectionDegrees(selection);
  const selectionName = kind === 'chord' ? chordName(root, chordTypeId) : scaleName(root, scaleTypeId);

  return (
    <main className="screen explore">
      <div className="screen-head">
        <h1 className="screen-title">Explore</h1>
        <p className="screen-note">Play anything and see what it's called, or light up a chord or scale below.</p>
      </div>

      <section className="card name-panel" aria-live="polite" aria-label="What you're playing">
        {named ? (
          <>
            <p className={held.length > 0 ? 'name-title' : 'name-title faded'}>{named.title}</p>
            <p className="name-detail">{named.detail}</p>
          </>
        ) : (
          <p className="name-detail">Tap some keys, or press A to K on a computer keyboard.</p>
        )}
      </section>

      <div className="keyboard-bar">
        <div className="octave" role="group" aria-label="Octave">
          <button type="button" className="button icon" aria-label="Octave down" onClick={() => setOctave((o) => clampOctave(o - 1))} disabled={octave <= KEYBOARD_OCTAVE_RANGE[0]}>
            −
          </button>
          <span className="octave-label">C{octave}</span>
          <button type="button" className="button icon" aria-label="Octave up" onClick={() => setOctave((o) => clampOctave(o + 1))} disabled={octave >= KEYBOARD_OCTAVE_RANGE[1]}>
            +
          </button>
        </div>
        <button type="button" className="button toggle" aria-pressed={settings.noteNames} onClick={() => updateSettings({ noteNames: !settings.noteNames })}>
          Note names
        </button>
        <label className="sound-picker">
          <span className="visually-hidden">Sound</span>
          <select className="select" value={sound.id} onChange={(event) => updateSettings({ soundId: event.target.value })}>
            {SOUNDS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Keyboard
        lowestNote={lowestNote}
        octaves={octaves}
        pressed={pressed}
        marked={marked}
        roots={roots}
        showNames={settings.noteNames}
        showKeyHints={canHover}
        onNoteOn={noteOn}
        onNoteOff={noteOff}
      />

      <section className="card picker" aria-labelledby="picker-title">
        <h2 id="picker-title" className="card-kicker">
          Light up a chord or scale
        </h2>
        <Segmented label="Show" hideLabel options={KINDS} value={kind} onChange={(value) => pick(() => setKind(value))} />
        <NotePicker label="Root" value={root} onChange={(value) => pick(() => setRoot(value))} />
        <label className="field">
          <span className="segmented-label">{kind === 'chord' ? 'Chord' : 'Scale'}</span>
          {kind === 'chord' ? (
            <select className="select" value={chordTypeId} onChange={(event) => pick(() => setChordTypeId(event.target.value))}>
              {CHORD_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({formatNote(root)}
                  {type.symbol})
                </option>
              ))}
            </select>
          ) : (
            <select className="select" value={scaleTypeId} onChange={(event) => pick(() => setScaleTypeId(event.target.value))}>
              {SCALE_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          )}
        </label>
        {selection.kind === 'chord' && (
          <Segmented
            label="Inversion"
            options={Array.from({ length: chordInversions(chordTypeId) }, (_, i) => ({ value: i, label: i === 0 ? 'Root' : ordinalShort(i), title: inversionName(i) }))}
            value={selection.inversion}
            onChange={(value) => pick(() => setInversion(value))}
          />
        )}

        <div className="selection">
          <p className="selection-name">{selectionName}</p>
          <ul className="degree-list" aria-label="Notes and their degrees">
            {degrees.map((d, i) => (
              <li key={i} className="degree-chip">
                <span className="degree-note">{d.note}</span>
                <span className="degree-number">{d.degree}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="play-row">
          {kind === 'chord' ? (
            CHORD_STYLES.map(({ style, label }) => (
              <button key={style} type="button" className={style === 'together' ? 'button primary' : 'button'} onClick={() => playChord(style)}>
                {label}
              </button>
            ))
          ) : (
            <>
              <button type="button" className="button primary" onClick={() => playScale('up')}>
                Play up
              </button>
              <button type="button" className="button" onClick={() => playScale('upAndDown')}>
                Up and down
              </button>
              {keyMode && (
                <button type="button" className="button" onClick={() => player.play(cadenceEvents(key(root, keyMode)), sound.patch)}>
                  Hear the key
                </button>
              )}
            </>
          )}
          {lit && (
            <button type="button" className="button quiet" onClick={() => setLit(false)}>
              Hide
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

/** A chord in root position plus one inversion per other note: three for a triad, four for a 7th. */
function chordInversions(chordTypeId: string): number {
  return chordTypeOf(chordTypeId).intervals.length;
}

function ordinalShort(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}
