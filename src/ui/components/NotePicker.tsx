import { LETTERS, note, type Note } from '../../theory/notes';
import { Segmented } from './Segmented';

interface NotePickerProps {
  readonly label: string;
  readonly value: Note;
  readonly onChange: (value: Note) => void;
}

const ACCIDENTALS: readonly { readonly value: number; readonly label: string; readonly title: string }[] = [
  { value: -1, label: '♭', title: 'Flat' },
  { value: 0, label: '♮', title: 'Natural' },
  { value: 1, label: '♯', title: 'Sharp' },
];

/** Pick a spelled note: a letter, then flat, natural or sharp (SPEC §7). */
export function NotePicker({ label, value, onChange }: NotePickerProps) {
  return (
    <fieldset className="note-picker">
      <legend className="segmented-label">{label}</legend>
      <div className="note-picker-rows">
        <Segmented
          label={`${label}: letter`}
          hideLabel
          options={LETTERS.map((letter) => ({ value: letter, label: letter }))}
          value={value.letter}
          onChange={(letter) => onChange(note(letter, value.accidental))}
        />
        <Segmented
          label={`${label}: sharp or flat`}
          hideLabel
          options={ACCIDENTALS}
          value={Math.max(-1, Math.min(1, value.accidental))}
          onChange={(accidental) => onChange(note(value.letter, accidental))}
        />
      </div>
    </fieldset>
  );
}
