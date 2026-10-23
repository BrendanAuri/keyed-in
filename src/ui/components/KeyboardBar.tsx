import { SOUNDS } from '../../audio/patches';
import { KEYBOARD_OCTAVE_RANGE } from '../../constants';
import type { Settings } from '../../game/settings';
import { clampOctave } from '../instrument';

interface KeyboardBarProps {
  readonly octave: number;
  readonly setOctave: (change: (octave: number) => number) => void;
  readonly settings: Settings;
  readonly updateSettings: (change: Partial<Settings>) => void;
}

/** The controls above the keyboard: octave, note names and sound. */
export function KeyboardBar({ octave, setOctave, settings, updateSettings }: KeyboardBarProps) {
  return (
    <div className="keyboard-bar">
      <div className="octave" role="group" aria-label="Octave">
        <button
          type="button"
          className="button icon"
          aria-label="Octave down"
          onClick={() => setOctave((o) => clampOctave(o - 1))}
          disabled={octave <= KEYBOARD_OCTAVE_RANGE[0]}
        >
          −
        </button>
        <span className="octave-label">C{octave}</span>
        <button
          type="button"
          className="button icon"
          aria-label="Octave up"
          onClick={() => setOctave((o) => clampOctave(o + 1))}
          disabled={octave >= KEYBOARD_OCTAVE_RANGE[1]}
        >
          +
        </button>
      </div>
      <button type="button" className="button toggle" aria-pressed={settings.noteNames} onClick={() => updateSettings({ noteNames: !settings.noteNames })}>
        Note names
      </button>
      <label className="sound-picker">
        <span className="visually-hidden">Sound</span>
        <select className="select" value={settings.soundId} onChange={(event) => updateSettings({ soundId: event.target.value })}>
          {SOUNDS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
