import { useEffect, useState } from 'react';
import type { LiveAudio } from '../../audio/live';
import { soundOf } from '../../audio/patches';
import { cadenceEvents, progressionEvents, scaleEvents, type ChordSpec } from '../../audio/schedule';
import { KEYBOARD_MAX_OCTAVES, LOOP_BEATS_PER_CHORD, LOOP_BPM_RANGE, LOOP_DEFAULT_BPM, MOVE_BEATS, SECONDS_PER_MINUTE } from '../../constants';
import { key } from '../../theory/keys';
import { formatNote, midi, note, parseNote, sameNote, type Note } from '../../theory/notes';
import { SCALE_TYPES, getScaleType, scaleName, scaleTypeOf } from '../../theory/scales';
import {
  aliasesText,
  bassFrequencies,
  chordsSource,
  colourNotes,
  comparedScale,
  guideChords,
  movesFrom,
  progressionsFor,
  scaleFeel,
  type GuideChord,
} from '../../tools/guide';
import { Keyboard } from '../components/Keyboard';
import { KeyboardBar } from '../components/KeyboardBar';
import { NotePicker } from '../components/NotePicker';
import { Segmented } from '../components/Segmented';
import { scaleKeyMode, selectionDegrees, selectionPitches, type Selection } from '../explore';
import { useMediaQuery, useSettings } from '../hooks';
import { TWO_OCTAVES, startingOctave, useComputerKeys, useInstrument } from '../instrument';
import { cAtOrBelow, octavesToShow } from '../keyboardLayout';
import { lowestNoteForOctave } from '../keyboardMap';
import type { Navigate } from '../router';

type Size = 'triad' | 'seventh';

const SIZES: readonly { readonly value: Size; readonly label: string }[] = [
  { value: 'triad', label: 'Three notes' },
  { value: 'seventh', label: 'Sevenths' },
];

/** Tempo changes in steps of this many BPM. */
const BPM_STEP = 5;

interface ScaleGuideProps {
  readonly audio: LiveAudio;
  readonly navigate: Navigate;
  /** From the address: a note in ASCII and a scale type id. */
  readonly rootParam?: string;
  readonly scaleParam?: string;
}

/**
 * The Scale Guide (SPEC §14.2): a scale's notes and colour, its chords with how
 * they tend to feel, where each chord likes to go next, progressions to loop,
 * and its bass frequencies.
 */
export function ScaleGuide({ audio, navigate, rootParam, scaleParam }: ScaleGuideProps) {
  const [settings, updateSettings] = useSettings();
  const sound = soundOf(settings.soundId);
  const wide = useMediaQuery(TWO_OCTAVES);
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const [octave, setOctave] = useState(startingOctave);
  const { pressed, noteOn, noteOff, play, loop, stop } = useInstrument(audio, sound.patch);

  const root: Note = (rootParam ? parseNote(rootParam) : null) ?? note('C');
  const scaleTypeId = scaleParam && getScaleType(scaleParam) ? scaleParam : 'major';
  const goTo = (r: Note, s: string, replace: boolean) => navigate({ name: 'guide', root: formatNote(r, 'ascii'), scale: s }, { replace });

  const [size, setSize] = useState<Size>('triad');
  const [selectedDegree, setSelectedDegree] = useState<number | null>(null);
  const [bpm, setBpm] = useState(LOOP_DEFAULT_BPM);
  const [looping, setLooping] = useState<string | null>(null);

  // A new scale starts fresh: nothing selected, nothing looping.
  useEffect(() => {
    setSelectedDegree(null);
    setLooping(null);
    stop();
  }, [rootParam, scaleParam, stop]);

  const chords = guideChords(root, scaleTypeId, size);
  const selected = selectedDegree ? (chords[selectedDegree - 1] ?? null) : null;
  // What next? moves are between three-note chords, whichever size is showing.
  const triad = selectedDegree ? (guideChords(root, scaleTypeId, 'triad')[selectedDegree - 1] ?? null) : null;
  const moves = selectedDegree ? movesFrom(root, scaleTypeId, selectedDegree) : [];
  const source = chordsSource(scaleTypeId);
  const colours = colourNotes(root, scaleTypeId);
  const compared = comparedScale(scaleTypeId);
  const progressions = progressionsFor(root, scaleTypeId);
  const bass = bassFrequencies(root, scaleTypeId, settings.a4Hz);
  const keyMode = scaleKeyMode(scaleTypeId);
  const scaleSelection: Selection = { kind: 'scale', root, scaleTypeId };
  const degrees = selectionDegrees(scaleSelection);

  // The keyboard shows the chord picked, or else the scale.
  const lit: Selection =
    selected?.chordTypeId ? { kind: 'chord', root: selected.root, chordTypeId: selected.chordTypeId, inversion: 0 } : scaleSelection;
  const pitches = selectionPitches(lit, octave);
  const lowestNote = lowestNoteForOctave(octave);
  const octaves = octavesToShow(cAtOrBelow(lowestNote), Math.max(...pitches.map(midi)), wide ? 2 : 1, KEYBOARD_MAX_OCTAVES);
  const marked = new Map(pitches.map((p) => [midi(p), formatNote(p)] as const));
  const litRoot = lit.root;
  const roots = new Set(pitches.filter((p) => sameNote(p, litRoot)).map(midi));

  const playScale = () => {
    setLooping(null);
    play(scaleEvents(selectionPitches(scaleSelection, octave).map(midi)));
  };
  useComputerKeys({ octave, setOctave, noteOn, noteOff, onSpace: playScale });

  /** Play chords one after another, with the root in the bass, at the loop tempo. */
  const playChords = (specs: readonly ChordSpec[]) => {
    setLooping(null);
    play(progressionEvents(specs, bpm, MOVE_BEATS));
  };

  const pickChord = (chord: GuideChord) => {
    setSelectedDegree(chord.degree);
    if (chord.chordTypeId) playChords([{ root: chord.root, chordTypeId: chord.chordTypeId }]);
  };

  const startLoop = (id: string, specs: readonly ChordSpec[], tempo: number) => {
    loop(progressionEvents(specs, tempo, LOOP_BEATS_PER_CHORD), (specs.length * LOOP_BEATS_PER_CHORD * SECONDS_PER_MINUTE) / tempo);
    setLooping(id);
  };

  const changeBpm = (next: number) => {
    const [low, high] = LOOP_BPM_RANGE;
    const tempo = Math.min(high, Math.max(low, next));
    setBpm(tempo);
    const playing = progressions.find((p) => p.info.numerals === looping);
    if (playing) startLoop(playing.info.numerals, playing.chords, tempo);
  };

  return (
    <main className="screen guide">
      <div className="screen-head">
        <h1 className="screen-title">Scale Guide</h1>
        <p className="screen-note">Pick a scale to see its chords, how each one tends to feel, and where it likes to go next.</p>
      </div>

      <section className="card picker" aria-label="Pick a scale">
        <NotePicker label="Root" value={root} onChange={(value) => goTo(value, scaleTypeId, true)} />
        <label className="field">
          <span className="segmented-label">Scale</span>
          <select className="select" value={scaleTypeId} onChange={(event) => goTo(root, event.target.value, true)}>
            {SCALE_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card scale-card" aria-labelledby="scale-title">
        <h2 id="scale-title" className="scale-title">
          {scaleName(root, scaleTypeId)}
        </h2>
        <p className="scale-feel">Often heard as {scaleFeel(scaleTypeId)}.</p>
        {aliasesText(scaleTypeId) && <p className="card-note">{aliasesText(scaleTypeId)}</p>}
        {colours.length > 0 && compared && (
          <p className="colour-note">
            {colours.length === 1 ? 'Its colour note: ' : 'Its colour notes: '}
            {colours.map((c, i) => (
              <span key={c.note}>
                {i > 0 && ', '}
                <strong>{c.note}</strong>, its {c.degree}
              </span>
            ))}
            , where {scaleTypeOf(compared).name} has {colours.map((c) => c.comparedDegree).join(' and ')}. That's the sound that sets it apart.
          </p>
        )}
        <ul className="degree-list" aria-label="Notes and their degrees">
          {degrees.map((d, i) => (
            <li key={i} className="degree-chip">
              <span className="degree-note">{d.note}</span>
              <span className="degree-number">{d.degree}</span>
            </li>
          ))}
        </ul>
        <div className="play-row">
          <button type="button" className="button primary" onClick={playScale}>
            Play the scale
          </button>
          {keyMode && (
            <button type="button" className="button" onClick={() => play(cadenceEvents(key(root, keyMode)))}>
              Hear the key
            </button>
          )}
        </div>
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

      <section className="card" aria-labelledby="chords-title">
        <h2 id="chords-title" className="card-kicker">
          Its chords
        </h2>
        {source ? (
          <>
            <p className="card-note">
              The {scaleTypeOf(scaleTypeId).name} scale has fewer than seven notes, so it has no chords of its own. Its notes fit over
              the chords of {scaleName(root, source)}.
            </p>
            <button type="button" className="button" onClick={() => goTo(root, source, false)}>
              Open {scaleName(root, source)}
            </button>
          </>
        ) : (
          <>
            <p className="card-note">
              Built from the scale's own notes. Tap one to hear it and see where it likes to go next. The feel words are how a chord is
              often heard; the song around it changes that.
            </p>
            <Segmented label="Chord size" hideLabel options={SIZES} value={size} onChange={setSize} />
            <ul className="chord-list">
              {chords.map((chord) => (
                <li key={chord.degree}>
                  <button
                    type="button"
                    className={chord.degree === selectedDegree ? 'chord-row selected' : 'chord-row'}
                    aria-pressed={chord.degree === selectedDegree}
                    onClick={() => pickChord(chord)}
                  >
                    <span className="chord-numeral">{chord.numeral}</span>
                    <span className="chord-symbol">{chord.symbol}</span>
                    <span className="chord-notes">{chord.notes.map((n) => formatNote(n)).join(' ')}</span>
                    <span className="chord-feel">{chord.feel}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {!source && (
        <section className="card" aria-labelledby="next-title" aria-live="polite">
          <h2 id="next-title" className="card-kicker">
            What next?
          </h2>
          {triad?.chordTypeId ? (
            <>
              <p className="card-note">
                Where {triad.numeral} ({triad.symbol}) likes to go. Press Hear it to play the two chords.
              </p>
              {moves.length === 0 ? (
                <p className="card-note">No named moves start here yet. Try another chord.</p>
              ) : (
                <ul className="move-list">
                  {moves.map((m, i) => (
                    <li key={i} className="move-row">
                      <div className="move-text">
                        <p className="move-name">
                          {m.move.name}: {triad.numeral} → {m.move.to} ({m.symbol}){m.move.borrowed ? ' · borrowed' : ''}
                        </p>
                        <p className="move-feel">{m.move.feel}</p>
                      </div>
                      <button
                        type="button"
                        className="button"
                        onClick={() => playChords([{ root: triad.root, chordTypeId: triad.chordTypeId ?? 'major' }, m.to])}
                      >
                        Hear it
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="card-note">Tap a chord above to see where it likes to go next.</p>
          )}
        </section>
      )}

      {progressions.length > 0 && (
        <section className="card" aria-labelledby="progressions-title">
          <h2 id="progressions-title" className="card-kicker">
            Progressions
          </h2>
          <div className="tempo" role="group" aria-label="Tempo">
            <button type="button" className="button icon" aria-label="Slower" onClick={() => changeBpm(bpm - BPM_STEP)} disabled={bpm <= LOOP_BPM_RANGE[0]}>
              −
            </button>
            <span className="tempo-label">{bpm} BPM</span>
            <button type="button" className="button icon" aria-label="Faster" onClick={() => changeBpm(bpm + BPM_STEP)} disabled={bpm >= LOOP_BPM_RANGE[1]}>
              +
            </button>
          </div>
          <ul className="progression-list">
            {progressions.map((p) => {
              const playing = looping === p.info.numerals;
              return (
                <li key={p.info.numerals} className="progression-row">
                  <div className="progression-text">
                    <p className="progression-numerals">{p.info.numerals}</p>
                    <p className="progression-symbols">{p.symbols}</p>
                    <p className="progression-feel">
                      {capitalise(p.info.feel)}. Heard in {p.info.heardIn}.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={playing ? 'button primary' : 'button'}
                    aria-pressed={playing}
                    onClick={() => {
                      if (playing) {
                        stop();
                        setLooping(null);
                      } else {
                        startLoop(p.info.numerals, p.chords, bpm);
                      }
                    }}
                  >
                    {playing ? 'Stop' : 'Loop'}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card" aria-labelledby="bass-title">
        <h2 id="bass-title" className="card-kicker">
          Bass notes
        </h2>
        <p className="card-note">
          Each note's frequency down low, for tuning a kick, sub or 808 to the key. Tuned to A4 = {+settings.a4Hz.toFixed(2)} Hz; the Scale
          Finder can change that.
        </p>
        <table className="hz-table">
          <thead>
            <tr>
              <th scope="col">Note</th>
              <th scope="col">Octave 1</th>
              <th scope="col">Octave 2</th>
            </tr>
          </thead>
          <tbody>
            {bass.map((row) => (
              <tr key={row.note}>
                <th scope="row">{row.note}</th>
                {row.hz.map((hz, i) => (
                  <td key={i}>{hz.toFixed(1)} Hz</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
