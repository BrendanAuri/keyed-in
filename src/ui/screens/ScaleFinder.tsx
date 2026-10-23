import { useCallback, useRef, useState, type FormEvent } from 'react';
import type { LiveAudio } from '../../audio/live';
import { soundOf } from '../../audio/patches';
import { scaleEvents } from '../../audio/schedule';
import { A4_PRESETS_HZ, CENTS_PER_OCTAVE, FINDER_FEW_NOTES, FINDER_GROUPS_SHOWN, SEMITONES_PER_OCTAVE } from '../../constants';
import { isValidA4 } from '../../game/settings';
import { formatNote, midi, mod, pitchClass, type Note } from '../../theory/notes';
import { matchScales, type ScaleGroup, type ScaleOption } from '../../theory/scaleMatch';
import { buildScale, scaleName } from '../../theory/scales';
import {
  enteredPitchClasses,
  frequencyRows,
  halfStepAt,
  noteForPitchClass,
  parseInput,
  resolveEntries,
  tuningSuggestion,
  type Entry,
} from '../../tools/finder';
import { Keyboard } from '../components/Keyboard';
import { KeyboardBar } from '../components/KeyboardBar';
import { Segmented } from '../components/Segmented';
import { selectionPitches } from '../explore';
import { useMediaQuery, useSettings } from '../hooks';
import { TWO_OCTAVES, startingOctave, useComputerKeys, useInstrument } from '../instrument';
import { lowestNoteForOctave } from '../keyboardMap';
import type { Navigate } from '../router';

interface Item {
  readonly id: number;
  readonly entry: Entry;
}

function ordinal(n: number): string {
  return n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

/**
 * The Scale Finder (SPEC §14.1): enter notes by tapping keys, typing names or
 * typing frequencies off a spectrum analyser, and see which scales they fit,
 * with each note's frequency in every octave.
 */
export function ScaleFinder({ audio, navigate }: { readonly audio: LiveAudio; readonly navigate: Navigate }) {
  const [settings, updateSettings] = useSettings();
  const sound = soundOf(settings.soundId);
  const wide = useMediaQuery(TWO_OCTAVES);
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const [octave, setOctave] = useState(startingOctave);
  const { pressed, noteOn, noteOff, play } = useInstrument(audio, sound.patch);

  const [items, setItems] = useState<readonly Item[]>([]);
  const nextId = useRef(1);
  const [leftOut, setLeftOut] = useState<ReadonlySet<number>>(() => new Set());
  const [text, setText] = useState('');
  const [unread, setUnread] = useState<readonly string[]>([]);
  const [home, setHome] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [otherA4, setOtherA4] = useState('');

  const a4Hz = settings.a4Hz;
  const entries = items.map((item) => item.entry);
  const resolved = resolveEntries(entries, a4Hz);
  const pcs = enteredPitchClasses(resolved, new Set(items.flatMap((item, i) => (leftOut.has(item.id) ? [i] : []))));
  const homePc = home !== null && pcs.includes(home) ? home : null;
  const { exact, near } = matchScales(pcs, homePc);
  const suggestion = tuningSuggestion(entries, a4Hz);
  const tableNotes = pcs.map((pc) => noteForPitchClass(pc, resolved));
  const lowestTableNote = tableNotes[0];

  function add(newEntries: readonly Entry[]): void {
    setItems((current) => [...current, ...newEntries.map((entry) => ({ id: nextId.current++, entry }))]);
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    const parsed = parseInput(text);
    add(parsed.entries);
    setUnread(parsed.unread);
    setText('');
  }

  /** Tapping a key plays it and adds its note, or takes it away if it's already there. */
  function tapKey(n: number): void {
    noteOn(n);
    const pc = mod(n, SEMITONES_PER_OCTAVE);
    const tapped = items.filter((item) => item.entry.kind !== 'frequency' && entryPc(item.entry) === pc);
    if (tapped.length > 0) setItems((current) => current.filter((item) => !tapped.includes(item)));
    else add([{ kind: 'key', pc }]);
  }

  // The computer keys need a handler that stays the same between renders, or held notes would be cut off.
  const latestTap = useRef(tapKey);
  latestTap.current = tapKey;
  const stableTap = useCallback((n: number) => latestTap.current(n), []);
  useComputerKeys({ octave, setOctave, noteOn: stableTap, noteOff });

  function remove(id: number): void {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function toggleLeftOut(id: number): void {
    setLeftOut((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearAll(): void {
    setItems([]);
    setLeftOut(new Set());
    setUnread([]);
    setHome(null);
  }

  const openInGuide = (option: ScaleOption) => navigate({ name: 'guide', root: formatNote(option.root, 'ascii'), scale: option.scaleTypeId });
  const playScale = (option: ScaleOption) =>
    play(scaleEvents(selectionPitches({ kind: 'scale', root: option.root, scaleTypeId: option.scaleTypeId }, octave).map(midi)));

  const lowestNote = lowestNoteForOctave(octave);
  const octaves = wide ? 2 : 1;
  const marked = new Map<number, string>();
  for (let n = lowestNote; n <= lowestNote + octaves * SEMITONES_PER_OCTAVE; n++) {
    const pc = mod(n, SEMITONES_PER_OCTAVE);
    if (pcs.includes(pc)) marked.set(n, formatNote(noteForPitchClass(pc, resolved)));
  }
  const homeKeys = new Set([...marked.keys()].filter((n) => mod(n, SEMITONES_PER_OCTAVE) === homePc));
  const groups = showAll ? exact : exact.slice(0, FINDER_GROUPS_SHOWN);

  return (
    <main className="screen finder">
      <div className="screen-head">
        <h1 className="screen-title">Scale Finder</h1>
        <p className="screen-note">
          Enter the notes from a song, by tapping keys, typing their names, or typing frequencies off a spectrum analyser, and see which
          scales they fit.
        </p>
      </div>

      <KeyboardBar octave={octave} setOctave={setOctave} settings={settings} updateSettings={updateSettings} />
      <Keyboard
        lowestNote={lowestNote}
        octaves={octaves}
        pressed={pressed}
        marked={marked}
        roots={homeKeys}
        showNames={settings.noteNames}
        showKeyHints={canHover}
        onNoteOn={tapKey}
        onNoteOff={noteOff}
      />

      <section className="card" aria-labelledby="notes-title">
        <h2 id="notes-title" className="card-kicker">
          Your notes
        </h2>
        <form className="entry-form" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="finder-input">
            Notes or frequencies
          </label>
          <input
            id="finder-input"
            className="input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="A C E G, or 55 110 165"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button type="submit" className="button primary" disabled={text.trim() === ''}>
            Add
          </button>
        </form>
        {unread.length > 0 && <p className="form-error">Couldn't read {unread.map((u) => `"${u}"`).join(', ')}. Type note names (E♭ or Eb) or frequencies in Hz.</p>}
        <p className="card-note">
          Reading a spectrum analyser? The lowest strong peak is usually the note. Peaks at 2, 3 and 4 times its frequency are its harmonics,
          not new notes, so they're flagged below.
        </p>

        {items.length > 0 && (
          <>
            <ul className="entry-list">
              {items.map((item, i) => {
                const r = resolved[i];
                if (!r) return null;
                const out = leftOut.has(item.id);
                const of = r.harmonicOf ? resolved[r.harmonicOf.index] : undefined;
                return (
                  <li key={item.id} className={out ? 'entry-chip left-out' : 'entry-chip'}>
                    <span className="entry-label">{r.label}</span>
                    {r.nearest && <span className="entry-detail">{r.nearest}</span>}
                    {r.harmonicOf && of && (
                      <span className="entry-detail harmonic">
                        {ordinal(r.harmonicOf.harmonic)} harmonic of {of.label}?
                      </span>
                    )}
                    {r.harmonicOf && (
                      <button type="button" className="button small" onClick={() => toggleLeftOut(item.id)}>
                        {out ? 'Use it' : 'Leave out'}
                      </button>
                    )}
                    <button type="button" className="button small quiet" aria-label={`Remove ${r.label}`} onClick={() => remove(item.id)}>
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="entry-actions">
              <label className="field inline">
                <span className="segmented-label">Home note</span>
                <select className="select" value={homePc ?? ''} onChange={(event) => setHome(event.target.value === '' ? null : Number(event.target.value))}>
                  <option value="">Not sure</option>
                  {pcs.map((pc) => (
                    <option key={pc} value={pc}>
                      {formatNote(noteForPitchClass(pc, resolved))}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="button quiet" onClick={clearAll}>
                Clear all
              </button>
            </div>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="results-title" aria-live="polite">
        <h2 id="results-title" className="card-kicker">
          Scales that fit
        </h2>
        {pcs.length === 0 ? (
          <p className="card-note">Enter some notes to see which scales they fit.</p>
        ) : (
          <>
            {pcs.length < FINDER_FEW_NOTES && exact.length > 0 && (
              <p className="card-note">
                With only {pcs.length} {pcs.length === 1 ? 'note' : 'notes'}, lots of scales fit. Add more to narrow it down.
              </p>
            )}
            {exact.length === 0 && <p className="card-note">No scale here has all of these notes. Try the ones a note off below, or leave a note out.</p>}
            <ul className="result-list">
              {groups.map((group, i) => (
                <ResultCard key={i} group={group} pcs={pcs} onPlay={playScale} onOpen={openInGuide} />
              ))}
            </ul>
            {exact.length > groups.length && (
              <button type="button" className="button" onClick={() => setShowAll(true)}>
                Show all {exact.length}
              </button>
            )}
            {near.length > 0 && (
              <>
                <h3 className="section-title">One note off</h3>
                <ul className="result-list">
                  {near.map((group, i) => {
                    const best = group.options[0];
                    if (!best) return null;
                    return (
                      <li key={i} className="result near">
                        <p className="result-name">{scaleName(best.root, best.scaleTypeId)}</p>
                        <p className="card-note">Has everything except {formatNote(noteForPitchClass(group.missing, resolved))}.</p>
                        <button type="button" className="button" onClick={() => openInGuide(best)}>
                          Open in Scale Guide
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      <section className="card" aria-labelledby="tuning-title">
        <h2 id="tuning-title" className="card-kicker">
          Tuning
        </h2>
        <p className="card-note">Most music is tuned to A4 = 440 Hz. Frequencies are matched to notes at this tuning.</p>
        {suggestion !== null && (
          <p className="notice" role="status">
            Every frequency is about {Math.round(CENTS_PER_OCTAVE * Math.log2(suggestion / a4Hz))} cents off, so this song may be tuned to A4 ={' '}
            {suggestion.toFixed(1)} Hz.{' '}
            <button type="button" className="button small" onClick={() => updateSettings({ a4Hz: +suggestion.toFixed(1) })}>
              Use {suggestion.toFixed(1)} Hz
            </button>
          </p>
        )}
        <div className="tuning-row">
          <Segmented
            label="A4"
            options={A4_PRESETS_HZ.map((hz) => ({ value: hz, label: `${hz} Hz` }))}
            value={A4_PRESETS_HZ.find((hz) => hz === a4Hz) ?? 0}
            onChange={(hz) => updateSettings({ a4Hz: hz })}
          />
          <form
            className="entry-form"
            onSubmit={(event) => {
              event.preventDefault();
              const hz = Number(otherA4);
              if (isValidA4(hz)) updateSettings({ a4Hz: hz });
              setOtherA4('');
            }}
          >
            <label className="visually-hidden" htmlFor="finder-a4">
              Other tuning in Hz
            </label>
            <input
              id="finder-a4"
              className="input"
              inputMode="decimal"
              value={otherA4}
              onChange={(event) => setOtherA4(event.target.value)}
              placeholder={`Other, now ${+a4Hz.toFixed(2)}`}
            />
            <button type="submit" className="button" disabled={!isValidA4(Number(otherA4))}>
              Set
            </button>
          </form>
        </div>
      </section>

      {tableNotes.length > 0 && (
        <section className="card" aria-labelledby="hz-title">
          <h2 id="hz-title" className="card-kicker">
            Frequencies
          </h2>
          {lowestTableNote && (
            <p className="card-note">
              Down low, notes are close together: {formatNote(lowestTableNote)}1 and the note above it are only{' '}
              {halfStepAt(lowestTableNote, 1, a4Hz).toFixed(1)} Hz apart. If a low peak is hard to read, check its harmonic an octave or two
              up. Sub and bass frequencies are highlighted.
            </p>
          )}
          <div className="table-scroll">
            <table className="hz-table">
              <thead>
                <tr>
                  <th scope="col">Octave</th>
                  {tableNotes.map((n) => (
                    <th key={pitchClass(n)} scope="col">
                      {formatNote(n)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {frequencyRows(tableNotes, a4Hz).map((row) => (
                  <tr key={row.octave}>
                    <th scope="row">{row.octave}</th>
                    {row.cells.map((cell, i) => (
                      <td key={i} className={cell.bass ? 'bass' : undefined}>
                        {cell.hz < 100 ? cell.hz.toFixed(1) : Math.round(cell.hz)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function entryPc(entry: Entry): number | null {
  if (entry.kind === 'note') return pitchClass(entry.note);
  if (entry.kind === 'key') return entry.pc;
  return null;
}

interface ResultCardProps {
  readonly group: ScaleGroup;
  readonly pcs: readonly number[];
  readonly onPlay: (option: ScaleOption) => void;
  readonly onOpen: (option: ScaleOption) => void;
}

/** One set of notes: the best scale for it, the notes it adds, and the same notes with other homes. */
function ResultCard({ group, pcs, onPlay, onOpen }: ResultCardProps) {
  const [best, ...others] = group.options;
  if (!best) return null;
  const extra: Note[] = buildScale(best.root, best.scaleTypeId).filter((n) => !pcs.includes(pitchClass(n)));
  return (
    <li className="result">
      <p className="result-name">{scaleName(best.root, best.scaleTypeId)}</p>
      {extra.length > 0 && <p className="card-note">Also has {extra.map((n) => formatNote(n)).join(', ')}.</p>}
      <div className="play-row">
        <button type="button" className="button" onClick={() => onPlay(best)}>
          Play
        </button>
        <button type="button" className="button" onClick={() => onOpen(best)}>
          Open in Scale Guide
        </button>
      </div>
      {others.length > 0 && (
        <p className="other-homes">
          Same notes, other homes:{' '}
          {others.map((option, i) => (
            // The comma goes with the name before it, so a line never starts with one.
            <span key={i} className="nowrap">
              <button type="button" className="link-button" onClick={() => onOpen(option)}>
                {scaleName(option.root, option.scaleTypeId)}
              </button>
              {i < others.length - 1 && ','}{' '}
            </span>
          ))}
        </p>
      )}
    </li>
  );
}
