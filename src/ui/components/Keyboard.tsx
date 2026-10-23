import { useRef, type PointerEvent } from 'react';
import { SEMITONES_PER_OCTAVE } from '../../constants';
import { formatPitch, pitchFromMidi } from '../../theory/notes';
import { keyboardLayout } from '../keyboardLayout';
import { keyLabelForOffset } from '../keyboardMap';

interface KeyboardProps {
  /** MIDI note of the lowest key; a C. */
  readonly lowestNote: number;
  readonly octaves: number;
  /** Keys being played right now. */
  readonly pressed: ReadonlySet<number>;
  /** Keys lit up to show a chord or scale, with the note's spelled name ("E♭"). */
  readonly marked: ReadonlyMap<number, string>;
  /** Lit keys that are the root, drawn stronger. */
  readonly roots: ReadonlySet<number>;
  /** Letters on the white keys. Lit keys always show their names. */
  readonly showNames: boolean;
  /** The computer-keyboard letter on each key, where there's a computer keyboard. */
  readonly showKeyHints: boolean;
  readonly onNoteOn: (note: number) => void;
  readonly onNoteOff: (note: number) => void;
}

/** On-screen piano (SPEC §7). Multi-touch: each finger plays its own key, so chords work on a phone. */
export function Keyboard({ lowestNote, octaves, pressed, marked, roots, showNames, showKeyHints, onNoteOn, onNoteOff }: KeyboardProps) {
  const pointers = useRef(new Map<number, number>());

  function press(event: PointerEvent<HTMLDivElement>, note: number): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, note);
    onNoteOn(note);
  }

  function lift(event: PointerEvent<HTMLDivElement>): void {
    const note = pointers.current.get(event.pointerId);
    if (note === undefined) return;
    pointers.current.delete(event.pointerId);
    onNoteOff(note);
  }

  return (
    <div
      className={`keyboard octaves-${octaves}`}
      role="group"
      aria-label="Keyboard. On a computer, keys A to K play notes and Z and X change octave."
      onContextMenu={(event) => event.preventDefault()}
    >
      {keyboardLayout(lowestNote, octaves).map((key) => {
        const offset = key.midi - lowestNote;
        const hint = showKeyHints && offset <= SEMITONES_PER_OCTAVE ? keyLabelForOffset(offset) : null;
        const name = pitchFromMidi(key.midi);
        const lit = marked.get(key.midi);
        // Lit keys show their spelled name; otherwise white keys show their letter, with the octave on each C.
        const label = lit ?? (showNames && !key.black ? (name.letter === 'C' ? formatPitch(name) : name.letter) : null);
        const classes = [
          'key',
          key.black ? 'black' : 'white',
          lit !== undefined ? 'marked' : '',
          roots.has(key.midi) ? 'root' : '',
          pressed.has(key.midi) ? 'pressed' : '',
        ];
        return (
          <div
            key={key.midi}
            className={classes.filter(Boolean).join(' ')}
            style={{ left: `${key.left}%`, width: `${key.width}%` }}
            data-note={formatPitch(name, 'ascii')}
            onPointerDown={(event) => press(event, key.midi)}
            onPointerUp={lift}
            onPointerCancel={lift}
            onLostPointerCapture={lift}
          >
            {hint && <span className="key-hint">{hint}</span>}
            {label && <span className="key-name">{label}</span>}
          </div>
        );
      })}
    </div>
  );
}
