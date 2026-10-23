import { useEffect, useRef, useState } from 'react';
import type { LiveAudio } from '../../audio/live';
import { soundOf } from '../../audio/patches';
import { cadenceEvents, chordEvents, scaleEvents, type ChordStyle } from '../../audio/schedule';
import { KEYBOARD_MAX_OCTAVES } from '../../constants';
import { CHORD_TYPES, chordName, chordTypeOf, inversionName } from '../../theory/chords';
import { key } from '../../theory/keys';
import { formatNote, midi, note, sameNote, type Note } from '../../theory/notes';
import { SCALE_TYPES, scaleName } from '../../theory/scales';
import { CircleOfFifths } from '../components/CircleOfFifths';
import { Keyboard } from '../components/Keyboard';
import { KeyboardBar } from '../components/KeyboardBar';
import { NotePicker } from '../components/NotePicker';
import { Segmented } from '../components/Segmented';
import { describePlayed, scaleKeyMode, selectionDegrees, selectionPitches, type Selection } from '../explore';
import { useMediaQuery, useSettings } from '../hooks';
import { TWO_OCTAVES, startingOctave, useComputerKeys, useInstrument } from '../instrument';
import { cAtOrBelow, octavesToShow } from '../keyboardLayout';
import { lowestNoteForOctave } from '../keyboardMap';
import type { Navigate } from '../router';

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

/**
 * Explore (SPEC §13): a keyboard that names whatever you play, a picker that
 * lights up any chord or scale and plays it, and the circle of fifths. No scores.
 */
export function Explore({ audio, navigate }: { readonly audio: LiveAudio; readonly navigate: Navigate }) {
  const [settings, updateSettings] = useSettings();
  const sound = soundOf(settings.soundId);
  const wide = useMediaQuery(TWO_OCTAVES);
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const [octave, setOctave] = useState(startingOctave);
  const instrument = useInstrument(audio, sound.patch);
  const { held, pressed, noteOn, noteOff, play } = instrument;

  const [kind, setKind] = useState<Kind>('chord');
  const [root, setRoot] = useState<Note>(() => note('C'));
  const [chordTypeId, setChordTypeId] = useState('major');
  const [scaleTypeId, setScaleTypeId] = useState('major');
  const [inversion, setInversion] = useState(0);
  const [lit, setLit] = useState(true);

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
  const midis = pitches.map(midi);
  const lowestNote = lowestNoteForOctave(octave);
  const highestLit = lit ? Math.max(...midis) : lowestNote;
  const octaves = octavesToShow(cAtOrBelow(lowestNote), highestLit, wide ? 2 : 1, KEYBOARD_MAX_OCTAVES);
  const marked = new Map(lit ? pitches.map((p) => [midi(p), formatNote(p)] as const) : []);
  const roots = new Set(lit ? pitches.filter((p) => sameNote(p, root)).map(midi) : []);

  /** Any change to the picker lights the keyboard up again. */
  function pick(change: () => void): void {
    change();
    setLit(true);
  }

  const playChord = (style: ChordStyle) => {
    setLit(true);
    play(chordEvents(midis, style));
  };
  const playScale = (direction: 'up' | 'upAndDown') => {
    setLit(true);
    play(scaleEvents(midis, direction));
  };
  const keyMode = kind === 'scale' ? scaleKeyMode(scaleTypeId) : null;

  useComputerKeys({ octave, setOctave, noteOn, noteOff, onSpace: kind === 'chord' ? () => playChord('together') : () => playScale('up') });

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

      <KeyboardBar octave={octave} setOctave={setOctave} settings={settings} updateSettings={updateSettings} />
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
                <button type="button" className="button" onClick={() => play(cadenceEvents(key(root, keyMode)))}>
                  Hear the key
                </button>
              )}
              <button
                type="button"
                className="button"
                onClick={() => navigate({ name: 'guide', root: formatNote(root, 'ascii'), scale: scaleTypeId })}
              >
                Open in Scale Guide
              </button>
            </>
          )}
          {lit && (
            <button type="button" className="button quiet" onClick={() => setLit(false)}>
              Hide
            </button>
          )}
        </div>
      </section>

      <section className="card circle-card" aria-labelledby="circle-title">
        <h2 id="circle-title" className="card-kicker">
          Circle of fifths
        </h2>
        <p className="card-note">
          Each step clockwise adds a sharp (or takes away a flat), and keys side by side share all but one note. Inside each major key is
          its relative minor, with the same notes. Tap a key to open it in the Scale Guide.
        </p>
        <CircleOfFifths
          onPick={(k) => navigate({ name: 'guide', root: formatNote(k.tonic, 'ascii'), scale: k.mode === 'major' ? 'major' : 'naturalMinor' })}
        />
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
